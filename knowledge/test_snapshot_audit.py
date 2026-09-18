from datetime import date
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from audit_snapshots import compare, load_snapshot


def source(**changes):
    return {'source_id': 'fictional', 'source_title': 'Fictional policy',
            'source_url': 'https://example.org/policy', 'retrieved_at': '2026-09-18T00:00:00+00:00',
            'text': 'A fictional landlord must not keep the deposit.',
            'source_sha256': 'a' * 64, **changes}


class SnapshotTests(unittest.TestCase):
    def test_changed_extraction_scope_requires_review_even_for_same_text(self):
        report = self.result(new=source(extract_section={'label':'Housing','start':'A','end':'B'}, section='Housing'))
        self.assertEqual(report['summary']['metadata_changed'], 1)
        self.assertTrue(report['sources'][0]['review_required'])

    def result(self, old=None, new=None, as_of='2026-09-18'):
        return compare({'fictional': old or source()}, {'fictional': new or source()}, date.fromisoformat(as_of))

    def test_response_decoration_is_distinct_from_losing_negation(self):
        decorative = self.result(new=source(source_sha256='b' * 64))
        self.assertEqual(decorative['summary']['response_only'], 1)
        self.assertEqual(decorative['summary']['review_required'], 0)
        changed = self.result(new=source(text='A fictional landlord must keep the deposit.'))
        self.assertEqual(changed['summary']['content_changed'], 1)
        self.assertTrue(changed['sources'][0]['summary_review_required'])

    def test_missing_metadata_and_expiry_trigger_review_without_body_change(self):
        report = self.result(new=source(valid_until='2027-06-11'))
        self.assertEqual(report['summary']['metadata_changed'], 1)
        self.assertEqual(report['sources'][0]['metadata_changes']['valid_until']['before'], None)
        for day, excluded in [('2027-06-11', False), ('2027-06-12', True)]:
            row = source(valid_until='2027-06-11')
            result = self.result(row, row, day)
            self.assertEqual(result['sources'][0]['excluded_by_known_dates'], excluded)
            self.assertEqual(result['sources'][0]['review_required'], excluded)

    def test_additions_removals_and_combined_changes_stay_visible(self):
        result = compare({'old': source(source_id='old')}, {'new': source(source_id='new')}, date(2026, 9, 18))
        self.assertEqual(result['summary']['review_required'], 2)
        result = self.result(new=source(text='Different text.', jurisdiction='上海'))
        self.assertEqual(result['sources'][0]['state'], 'content_changed')
        self.assertEqual(result['sources'][0]['changed_fields'], ['jurisdiction'])

    def test_older_capture_is_rejected_and_capture_time_alone_is_not_change(self):
        with self.assertRaises(ValueError):
            self.result(new=source(retrieved_at='2026-09-17T00:00:00+00:00'))
        report = self.result(new=source(retrieved_at='2026-09-19T00:00:00+00:00'))
        self.assertEqual(report['summary']['unchanged'], 1)

    def test_invalid_snapshots_and_partial_capture_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            p = Path(directory) / 'documents.jsonl'
            for rows in [[], [source(), source()], [source(source_sha256='invalid')],
                         [source(retrieved_at='2026-09-18')], [source(valid_until='2027-02-30')]]:
                p.write_text('\n'.join(json.dumps(r) for r in rows), encoding='utf-8')
                with self.assertRaises(ValueError):
                    load_snapshot(p)
            p.write_text(json.dumps(source()), encoding='utf-8')
            p.with_name('collection-report.json').write_text(json.dumps([
                {'source_id': 'fictional', 'status': 'fetched'}, {'source_id': 'missing', 'status': 'failed'}
            ]), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'incomplete'):
                load_snapshot(p)

    def test_cli_preserves_inputs_report_and_returns_review_status(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before, after, output = root/'before.jsonl', root/'after.jsonl', root/'audit.json'
            before.write_text(json.dumps(source()), encoding='utf-8')
            after.write_text(json.dumps(source(valid_until='2027-06-11')), encoding='utf-8')
            before_bytes, after_bytes = before.read_bytes(), after.read_bytes()
            command = [sys.executable, str(Path(__file__).with_name('audit_snapshots.py')),
                       '--before', str(before), '--after', str(after), '--output', str(output), '--fail-on-review']
            run = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(run.returncode, 2, run.stderr)
            report_bytes = output.read_bytes()
            self.assertIn('snapshots', json.loads(report_bytes))
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)
            self.assertEqual(output.read_bytes(), report_bytes)
            self.assertEqual(before.read_bytes(), before_bytes)
            self.assertEqual(after.read_bytes(), after_bytes)


if __name__ == '__main__':
    unittest.main()
