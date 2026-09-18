"""Check a running loopback knowledge service against a frozen source-level set."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def accept(base, cases, manifest, minimum_hit_rate=0.9):
    parsed = urlparse(base)
    if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password:
        raise ValueError('Use a loopback HTTP service')
    def request(path, data=None):
        req = Request(base.rstrip('/') + path, data=json.dumps(data, ensure_ascii=False).encode() if data else None,
                      headers={'Content-Type': 'application/json'})
        with urlopen(req, timeout=40) as response:
            return json.load(response)
    health = request('/health')
    if health.get('model') != manifest['model_id']:
        raise ValueError('Running model differs from the evaluated index')
    rows = []
    for case in cases:
        result = request('/search', {'query': case['query'], 'jurisdiction': case['jurisdiction']})
        evidence = result['evidence']
        sources = [hit['source_id'] for hit in evidence]
        rows.append({'id': case['id'], 'sources': sources,
            'source_hit': bool(set(sources) & set(case['relevant_sources'])) if case['expect_evidence'] else None,
            'expected_evidence': case['expect_evidence'], 'emitted': bool(sources),
            'jurisdiction_leaks': [h['source_id'] for h in evidence if h['jurisdiction'] not in ('全国', case['jurisdiction'])],
            'corpus_matches': result.get('corpus_sha256') == manifest['corpus_sha256'],
            'storage': result['storage']})
    positives = sum(r['expected_evidence'] for r in rows)
    hits = sum(r['source_hit'] is True for r in rows)
    negatives = len(rows) - positives
    false_evidence = sum(not r['expected_evidence'] and r['emitted'] for r in rows)
    leaks = sum(bool(r['jurisdiction_leaks']) for r in rows)
    return {'created_at': datetime.now(timezone.utc).isoformat(),
        'scope': 'Real standalone HTTP service; not website integration, expert relevance, or customer results',
        'corpus_sha256': manifest['corpus_sha256'], 'health': health,
        'summary': {'cases': len(rows), 'positive_cases': positives, 'positive_source_hits': hits,
                    'negative_cases': negatives, 'false_evidence': false_evidence, 'jurisdiction_leaks': leaks},
        'passed': bool(positives and negatives and hits / positives >= minimum_hit_rate
                       and false_evidence == leaks == 0 and all(r['corpus_matches'] for r in rows)), 'cases': rows}


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--base-url', default='http://127.0.0.1:8782')
    p.add_argument('--index', type=Path, required=True)
    p.add_argument('--cases', type=Path, default=Path(__file__).parent/'evaluation/decision-cases.json')
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    if args.output.exists(): raise ValueError('Choose a fresh report filename')
    index = json.loads(args.index.read_text(encoding='utf-8'))
    cases = json.loads(args.cases.read_text(encoding='utf-8'))
    from evaluate import validate_cases
    validate_cases(cases, {c['source_id'] for c in index['chunks']})
    report = accept(args.base_url, cases, index['manifest'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
    print(json.dumps({'passed': report['passed'], **report['summary']}))
    if not report['passed']: raise SystemExit(2)
