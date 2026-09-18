import json
from pathlib import Path
import unittest
from pipeline import prepare, search
from source_policy import source_eligible, validate_metadata


class LifecycleTests(unittest.TestCase):
    def test_explicit_boundaries_include_last_day_and_reject_future(self):
        record={'effective_from':'2025-11-01','valid_until':'2027-10-31'}
        self.assertFalse(source_eligible(record,'2025-10-31'))
        self.assertTrue(source_eligible(record,'2025-11-01'))
        self.assertTrue(source_eligible(record,'2027-10-31'))
        self.assertFalse(source_eligible(record,'2027-11-01'))
        self.assertTrue(source_eligible({}))

    def test_malformed_dates_fail_before_indexing(self):
        for record in ({'valid_until':'not-a-date'},{'valid_until':'2027-02-30'},
                       {'effective_from':'2028-01-01','valid_until':'2027-01-01'}):
            with self.assertRaises(ValueError):validate_metadata(record)

    def test_source_lifecycle_survives_chunking_and_filters_before_ranking(self):
        base={'source_title':'Fixture','source_url':'https://example.org',
              'retrieved_at':'2026-09-18','text':'押金退还测试。','review_status':'fictional',
              'topics':['押金'],'applicability':'Fictional fixture only'}
        chunks=prepare([{**base,'source_id':'expired','valid_until':'2000-01-01'},
                        {**base,'source_id':'future','effective_from':'2999-01-01'},
                        {**base,'source_id':'current','valid_until':None}])
        self.assertEqual(chunks[0]['topics'],['押金'])
        self.assertEqual(chunks[0]['applicability'],'Fictional fixture only')
        class NoInference:
            model_id='test';dimension=2;prefix=''
            def encode(self,*args,**kwargs):raise AssertionError('Keyword must not use embedding')
        index={'manifest':{'model_id':'test','dimension':2,'query_prefix':''},
               'chunks':chunks,'vectors':[[1,0] for _ in chunks]}
        self.assertEqual([h['source_id'] for h in search(index,'押金退还',NoInference(),mode='keyword')],['current'])

    def test_shipped_summaries_match_catalog_provenance_and_validity(self):
        root=Path(__file__).parent
        catalog=json.loads((root/'sources.json').read_text(encoding='utf-8'))
        from jsonschema import Draft202012Validator, FormatChecker
        Draft202012Validator(json.loads((root/'source.schema.json').read_text(encoding='utf-8')),
                             format_checker=FormatChecker()).validate(catalog)
        notes=json.loads((root/'reference-notes.json').read_text(encoding='utf-8'))
        self.assertEqual(len(catalog),len({s['source_id'] for s in catalog}))
        self.assertEqual({s['source_id'] for s in catalog},{n['source_id'] for n in notes})
        by_id={s['source_id']:s for s in catalog}
        for note in notes:
            validate_metadata(note)
            source=by_id[note['source_id']];validate_metadata(source)
            for key in ('source_url','jurisdiction','effective_from','valid_until'):
                self.assertEqual(note.get(key),source.get(key))
            self.assertNotIn('·',note['text'])


if __name__=='__main__':unittest.main()
