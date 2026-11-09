"""Offline routing baseline. No tool invocation, evidence verification or persistence."""
import json
import re
import sys
from pathlib import Path

REGISTRY_PATH = Path(__file__).resolve().parents[1] / 'chatgpt_project/skill_registry.json'

def _matches(text, phrase):
    if phrase.isascii():
        return bool(re.search(r'(?<![a-z0-9])' + re.escape(phrase) + r'(?![a-z0-9])', text))
    return phrase in text

def route(request):
    if not isinstance(request, dict):
        raise ValueError('request must be an object')
    if request.get('deidentified') is not True:
        raise ValueError('manual privacy review and deidentified=true required')
    # Scan all submitted fields, including prior state; NOT a complete privacy filter.
    visible = json.dumps(request, ensure_ascii=False)
    if re.search(r'\bHN\s*[:#-]?\s*\d{4,}|(?<!\d)\d{13}(?!\d)', visible, re.I):
        raise ValueError('possible identifier; manually redact before processing')
    text = request.get('text')
    if not isinstance(text, str) or not text.strip():
        raise ValueError('nonempty text required')
    skills = json.loads(REGISTRY_PATH.read_text(encoding='utf-8'))['skills']
    by_id = {s['id']: s for s in skills}
    previous = request.get('previous', {})
    if not isinstance(previous, dict):
        raise ValueError('previous must be an object')
    prev_primary = previous.get('primary')
    prev_support = previous.get('support', [])
    if not isinstance(prev_support, list) or any(not isinstance(x, str) or x not in by_id for x in prev_support):
        raise ValueError('invalid previous support')
    if prev_primary is not None and (not isinstance(prev_primary, str) or prev_primary not in by_id):
        raise ValueError('invalid previous primary')
    lower = text.casefold()
    candidates = [s['id'] for s in skills if any(_matches(lower, p.casefold()) for p in s['triggers'])]
    # Explicit EC-review wording outranks design mentions. Otherwise ambiguity stays visible.
    ec_review = bool(re.search(r'ฐานะ\s*(ec|irb)|(?:ec|irb)\s*(review|ตรวจ)|วิจารณ์.*(?:ec|irb)', lower))
    priority = ['ethics'] if ec_review else []
    priority += ['rd', 'action', 'rct', 'rca', 'qi', 'workload', 'workforce', 'survey']
    primary = next((p for p in priority if p in candidates), candidates[0] if candidates else prev_primary)
    selected = list(candidates)
    inherited = not candidates and primary is not None
    if inherited:
        selected = [primary] + prev_support
    if primary:
        selected = [primary] + [s for s in selected if s != primary]
    for sid in selected:
        for dep in by_id[sid]['support']:
            if dep not in selected:
                selected.append(dep)
    high_risk = bool(selected)
    for sid in (['citation', 'reviewer'] if high_risk else []):
        if sid not in selected:
            selected.append(sid)
    gaps = [{'id': sid, 'status': by_id[sid]['status']} for sid in selected
            if by_id[sid]['status'] in {'proposed', 'missing_original', 'partial_prompt'}]
    return dict(mode='OFFLINE_POLICY_SIMULATION', primary=primary,
                support=[s for s in selected if s != primary], candidates=candidates,
                needs_context_review=len(candidates) > 1 or primary is None,
                context_inherited=inherited, capability_gaps=gaps,
                source_check_required=True, evidence_verified=False,
                review_required=high_risk, review_kind='same_model_checklist_then_authorized_human',
                independent_review_performed=False, chatgpt_connected=False,
                executed_skills=[], persisted=False,
                limitations=['phrase matching only; negation and intent need semantic review',
                             'source availability does not establish Project installation'])

if __name__ == '__main__':
    try:
        print(json.dumps(route(json.load(sys.stdin)), ensure_ascii=False, indent=2))
    except (ValueError, TypeError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(2)
