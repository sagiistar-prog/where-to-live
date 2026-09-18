"""Fetch an explicit public-government allowlist, extract article text and record failures."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlparse
import trafilatura
from pipeline import clean

def collect(row):
    url=row['source_url'];host=urlparse(url).hostname or ''
    if not host.endswith(('.gov.cn','.court.gov.cn')):raise ValueError('Only allowlisted public government hosts')
    try:
        with urlopen(Request(url,headers={'User-Agent':'HousingEvidence/1.0 (public source verification)'}),timeout=35) as response:
            if not (urlparse(response.url).hostname or '').endswith(('.gov.cn','.court.gov.cn')):raise ValueError('Unexpected redirect')
            raw=response.read(5_000_001)
        if len(raw)>5_000_000:raise ValueError('Source exceeds size budget')
        text=trafilatura.extract(raw,include_tables=True,include_comments=False,favor_recall=True)
        if not text or len(text)<100:raise ValueError('No usable article text')
        if row['source_id']=='cn-civil':
            start=text.find('第七百零三条');end=text.find('第七百三十四条',start)
            if start<0 or end<0:raise ValueError('Rental chapter not found')
            end=text.find('第七百三十五条',end)
            text=text[start:end]
        text=clean(text)
        doc={**row,'retrieved_at':datetime.now(timezone.utc).isoformat(),'text':text,
            'source_sha256':sha256(raw).hexdigest(),'language':'zh','review_status':'reviewed',
            'source_kind':'official_publication'}
        return doc,{**row,'status':'fetched','characters':len(text),'sha256':doc['source_sha256'],
            'review_scope':'source provenance checked; applicability must be checked for each case'}
    except Exception as error:return None,{**row,'status':'failed','error':type(error).__name__+': '+str(error)}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,default=Path(__file__).with_name('sources.json'))
    p.add_argument('--output',type=Path,required=True);args=p.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    rows=json.loads(args.sources.read_text(encoding='utf-8'));results=list(ThreadPoolExecutor(max_workers=3).map(collect,rows))
    docs=[doc for doc,_ in results if doc];report=[status for _,status in results]
    with (args.output/'documents.jsonl').open('w',encoding='utf-8') as f:
        for doc in docs:f.write(json.dumps(doc,ensure_ascii=False)+'\n')
    (args.output/'collection-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'requested':len(rows),'fetched':len(docs),'failed':len(rows)-len(docs)}))
    if not docs:raise SystemExit(1)
