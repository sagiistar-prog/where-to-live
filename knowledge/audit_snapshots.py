"""Compare complete local public-source snapshots without promoting either to production."""
import argparse
from collections import Counter
from datetime import date, datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re

from pipeline import clean, REQUIRED
from source_policy import METADATA_FIELDS, source_eligible, validate_metadata

REVIEW_FIELDS = ('source_title', 'source_url', 'jurisdiction', 'source_kind',
                 'review_status', 'resolved_url', 'required_markers') + METADATA_FIELDS
STATES = ('added', 'removed', 'content_changed', 'metadata_changed', 'response_only', 'unchanged')


def load_snapshot(path):
    raw = path.read_bytes()
    records = {}
    for number, line in enumerate(raw.decode('utf-8-sig').splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not isinstance(row, dict) or any(not isinstance(row.get(k), str) or not row[k].strip() for k in REQUIRED):
            raise ValueError(f'Invalid source record on line {number}')
        source_id = row['source_id']
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', source_id) or source_id in records:
            raise ValueError(f'Duplicate or invalid source ID on line {number}')
        if not re.fullmatch(r'[a-f0-9]{64}', row.get('source_sha256', '')):
            raise ValueError(f'Missing raw-response SHA-256 for {source_id}')
        timestamp = datetime.fromisoformat(row['retrieved_at'])
        if timestamp.tzinfo is None:
            raise ValueError(f'Retrieval timestamp needs a timezone: {source_id}')
        validate_metadata(row)
        if not clean(row['text']):
            raise ValueError(f'Empty extracted text: {source_id}')
        records[source_id] = row
    if not records:
        raise ValueError('Snapshot must contain sources')
    # A collector report distinguishes a removed catalog entry from a fetch failure.
    report_path = path.with_name('collection-report.json')
    if report_path.exists():
        report = json.loads(report_path.read_text(encoding='utf-8'))
        if (not isinstance(report, list) or
                any(not isinstance(r, dict) or r.get('status') != 'fetched' for r in report) or
                len(report) != len(records) or {r.get('source_id') for r in report} != set(records)):
            raise ValueError('Snapshot collection is incomplete or its report does not match')
    if path.name.endswith('.partial.jsonl'):
        raise ValueError('Partial collections cannot be audited as complete snapshots')
    return records, sha256(raw).hexdigest()


def describe(row):
    if row is None:
        return None
    text = clean(row['text'])
    return {'text_sha256': sha256(text.encode('utf-8')).hexdigest(),
            'response_sha256': row['source_sha256'], 'characters': len(text),
            'retrieved_at': row['retrieved_at']}


def compare(before, after, as_of):
    """Hashes detect differences, not legal validity or semantic equivalence."""
    rows = []
    for source_id in sorted(before.keys() | after.keys()):
        old, new = before.get(source_id), after.get(source_id)
        old_info, new_info = describe(old), describe(new)
        changed_fields = []
        if old is None:
            state = 'added'
        elif new is None:
            state = 'removed'
        else:
            if datetime.fromisoformat(new['retrieved_at']) < datetime.fromisoformat(old['retrieved_at']):
                raise ValueError(f'New snapshot is older for {source_id}')
            changed_fields = [k for k in REVIEW_FIELDS if old.get(k) != new.get(k)]
            if old_info['text_sha256'] != new_info['text_sha256']:
                state = 'content_changed'
            elif changed_fields:
                state = 'metadata_changed'
            elif old_info['response_sha256'] != new_info['response_sha256']:
                state = 'response_only'
            else:
                state = 'unchanged'
        date_excluded = bool(new and not source_eligible(new, as_of))
        review = state not in ('unchanged', 'response_only') or date_excluded
        rows.append({'source_id': source_id, 'source_url': (new or old)['source_url'],
                     'state': state, 'before': old_info, 'after': new_info,
                     'changed_fields': changed_fields,
                     'metadata_changes': {k: {'before': old.get(k), 'after': new.get(k)} for k in changed_fields},
                     'excluded_by_known_dates': date_excluded,
                     'review_required': review, 'summary_review_required': review})
    counts = Counter(row['state'] for row in rows)
    return {'schema_version': 1, 'as_of': as_of.isoformat(),
            'summary': {**{state: counts[state] for state in STATES},
                        'review_required': sum(r['review_required'] for r in rows),
                        'excluded_by_known_dates': sum(r['excluded_by_known_dates'] for r in rows)},
            'sources': rows,
            'scope': 'Extracted text and recorded metadata only. Unchanged content does not prove current law; attachments and image text may be absent.',
            'activation': 'Report only. Review changed sources and summaries, rebuild a separate index, evaluate, then choose whether to switch services.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before', type=Path, required=True)
    parser.add_argument('--after', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--as-of', type=date.fromisoformat, default=datetime.now(timezone.utc).date())
    parser.add_argument('--fail-on-review', action='store_true')
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Choose a new report filename; existing records are preserved')
    before, before_hash = load_snapshot(args.before)
    after, after_hash = load_snapshot(args.after)
    report = compare(before, after, args.as_of)
    report['snapshots'] = {'before_sha256': before_hash, 'after_sha256': after_hash}
    report['generated_at'] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(report, output, ensure_ascii=False, indent=2, allow_nan=False)
        output.write('\n')
    print(json.dumps(report['summary']))
    if args.fail_on_review and report['summary']['review_required']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
