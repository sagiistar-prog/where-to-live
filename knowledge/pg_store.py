"""Optional pgvector adapter. Isolated schema; no existing app tables modified."""
import json
import math
from datetime import datetime, timezone
from pipeline import tokens, fuse, diverse_results
from query_policy import query_boundary
from source_policy import validate_metadata

def install(conn):
    conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
    conn.execute('CREATE SCHEMA IF NOT EXISTS evidence_kb')
    conn.execute('''CREATE TABLE IF NOT EXISTS evidence_kb.chunks (
        corpus_id text NOT NULL, model_id text NOT NULL, chunk_id text NOT NULL,
        metadata jsonb NOT NULL, terms tsvector NOT NULL, embedding vector NOT NULL,
        PRIMARY KEY(corpus_id, model_id, chunk_id))''')
    conn.execute('CREATE INDEX IF NOT EXISTS kb_terms ON evidence_kb.chunks USING gin(terms)')

def ingest(conn,index):
    from psycopg.types.json import Jsonb
    m=index['manifest'];corpus=m['corpus_sha256']
    if len(index['chunks'])!=len(index['vectors']):raise ValueError('Incomplete index')
    with conn.transaction():
        for c,v in zip(index['chunks'],index['vectors']):
            validate_metadata(c)
            if len(v)!=m['dimension']:raise ValueError('Dimension mismatch')
            if not all(math.isfinite(x) for x in v) or not any(v):raise ValueError('Invalid vector')
            conn.execute('''INSERT INTO evidence_kb.chunks VALUES (%s,%s,%s,%s,to_tsvector('simple',%s),%s::vector)
                ON CONFLICT(corpus_id,model_id,chunk_id) DO UPDATE SET metadata=excluded.metadata,terms=excluded.terms,embedding=excluded.embedding''',
                (corpus,m['model_id'],c['chunk_id'],Jsonb(c),' '.join(tokens(c['text'])),json.dumps(v)))
    return corpus

def retrieve(conn,corpus_id,query,encoder,top_k=5,jurisdiction=None):
    if not isinstance(query,str) or not query.strip() or len(query)>1000:
        raise ValueError('Query must contain 1 to 1000 characters')
    if query_boundary(query):return []
    vector=json.dumps(encoder.encode([query],query=True)[0]);model=encoder.model_id
    today=datetime.now(timezone.utc).date().isoformat()
    dense=conn.execute('''SELECT chunk_id,metadata,1-(embedding <=> %s::vector) AS score
        FROM evidence_kb.chunks WHERE corpus_id=%s AND model_id=%s AND (%s::text IS NULL OR metadata->>'jurisdiction' IN ('全国',%s))
        AND (metadata->>'effective_from' IS NULL OR metadata->>'effective_from' <= %s)
        AND (metadata->>'valid_until' IS NULL OR metadata->>'valid_until' >= %s)
        ORDER BY embedding <=> %s::vector LIMIT 20''',(vector,corpus_id,model,jurisdiction,jurisdiction,today,today,vector)).fetchall()
    lexical_query=' | '.join(sorted(set(tokens(query))))
    keyword=conn.execute('''SELECT chunk_id,metadata,ts_rank_cd(terms,q) AS score
        FROM evidence_kb.chunks, to_tsquery('simple',%s) q
        WHERE corpus_id=%s AND model_id=%s AND (%s::text IS NULL OR metadata->>'jurisdiction' IN ('全国',%s))
        AND (metadata->>'effective_from' IS NULL OR metadata->>'effective_from' <= %s)
        AND (metadata->>'valid_until' IS NULL OR metadata->>'valid_until' >= %s)
        AND terms @@ q ORDER BY score DESC LIMIT 20''',
        (lexical_query,corpus_id,model,jurisdiction,jurisdiction,today,today)).fetchall() if lexical_query else []
    records={r[0]:r[1] for r in dense+keyword}
    ranks=fuse([(r[0],r[2]) for r in dense],[(r[0],r[2]) for r in keyword],weights=(1,2))
    lexical={r[0]:float(r[2]) for r in keyword};semantic={r[0]:float(r[2]) for r in dense}
    return [{**records[i],'rrf_score':score,'keyword_score':lexical.get(i,0),
        'cosine_similarity':semantic.get(i),'retrieval_method':'pgvector-fulltext-rrf',
        'requires_review':True} for i,score in diverse_results(ranks,records,top_k)]
