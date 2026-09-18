"""Capability boundaries shared with the web route through a data contract."""
import json
from pathlib import Path
import re

POLICY = Path(__file__).with_name('query-policy.json')
CONFIG = json.loads(POLICY.read_text(encoding='utf-8')) if POLICY.exists() else {}
RULES = CONFIG.get('rules', [])


def query_boundary(query):
    for rule in RULES:
        if re.search(rule['pattern'], query) and not (rule.get('except_pattern') and re.search(rule['except_pattern'], query)):
            return {'code': rule['id'], 'message': rule['message']}
    required = CONFIG.get("required_topic_pattern")
    if required and not re.search(required, query):
        return {"code": "outside_scope", "message": CONFIG["outside_scope_message"]}
    return None
