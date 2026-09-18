"""Source lifecycle rules shared by ingestion, local retrieval and pgvector."""
from datetime import date, datetime, timezone

DATE_FIELDS = ('published_at', 'effective_from', 'valid_until')
METADATA_FIELDS = DATE_FIELDS + ('topics', 'applicability', 'validity_basis')


def validate_metadata(record):
    for key in DATE_FIELDS:
        value = record.get(key)
        if value is not None:
            if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
                raise ValueError(f'{key} must be an ISO calendar date or null')
    if record.get('effective_from') and record.get('valid_until'):
        if record['effective_from'] > record['valid_until']:
            raise ValueError('Source validity interval is reversed')
    if 'topics' in record and (not isinstance(record['topics'], list) or
                            any(not isinstance(t, str) or not t.strip() for t in record['topics'])):
        raise ValueError('Source topics must be nonempty strings')


def source_eligible(record, as_of=None):
    """Unknown dates are not proof of currency; explicit dates bound retrieval."""
    today = as_of or datetime.now(timezone.utc).date()
    if isinstance(today, str):
        today = date.fromisoformat(today)
    start, end = record.get('effective_from'), record.get('valid_until')
    return (not start or date.fromisoformat(start) <= today) and (not end or today <= date.fromisoformat(end))
