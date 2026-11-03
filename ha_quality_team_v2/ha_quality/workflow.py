"""Safe offline task planning; not a scoring engine or an LLM runtime."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import re
from typing import Any

from .registry import AGENTS, ROUTES, STANDARD_VERSION

class PrivacyReviewRequired(ValueError):
    """Potential patient identifiable data: manual redaction and access review required."""

# This lightweight pattern check is only a warning layer, NOT a de-identification tool.
SENSITIVE_PATTERNS = (
    re.compile(r"\bHN\s*[:#-]?\s*\d{4,}\b", re.IGNORECASE),
    re.compile(r"(?<!\d)\d{13}(?!\d)"),
)

@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    title: str
    source: str
    locator: str
    date: str | None
    verified: bool

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "Evidence":
        return cls(
            evidence_id=str(value.get("evidence_id", "")).strip(),
            title=str(value.get("title", "")).strip(),
            source=str(value.get("source", "")).strip(),
            locator=str(value.get("locator", "")).strip(),
            date=value.get("date"),
            verified=value.get("verified") is True,
        )


def create_quality_plan(case: dict[str, Any]) -> dict[str, Any]:
    """Create a traceable review plan; never infer compliance or score automatically.

    Input must contain case_id, title, scope, deidentified=true, evidence list.
    The caller remains responsible for data-access authorization and de-identification.
    """
    if not isinstance(case, dict):
        raise TypeError("case must be a dictionary")
    if case.get("deidentified") is not True:
        raise PrivacyReviewRequired("deidentified=true required; perform local privacy review first")
    visible = " ".join(str(case.get(k, "")) for k in ("case_id", "title", "department", "goal"))
    if any(pattern.search(visible) for pattern in SENSITIVE_PATTERNS):
        raise PrivacyReviewRequired("possible patient identifier detected; manual redaction required")
    case_id = str(case.get("case_id", "")).strip()
    title = str(case.get("title", "")).strip()
    if not case_id or not title:
        raise ValueError("case_id and title are required")
    scope = str(case.get("scope", "general")).lower().strip()
    if scope not in ROUTES:
        raise ValueError(f"unsupported scope: {scope}; options: {', '.join(ROUTES)}")
    evidence_values = case.get("evidence", [])
    if not isinstance(evidence_values, list):
        raise TypeError("evidence must be a list")
    evidence = [Evidence.from_dict(x) for x in evidence_values]
    if any(not e.evidence_id or not e.title or not e.source or not e.locator for e in evidence):
        raise ValueError("each evidence item needs evidence_id, title, source, locator")
    if len(set(e.evidence_id for e in evidence)) != len(evidence):
        raise ValueError("duplicate evidence_id")
    matched = ("director",) + ROUTES[scope] + ("auditor",)
    tasks = [{"agent_id": key, "agent_name": AGENTS[key][0], "assignment": AGENTS[key][1]} for key in matched]
    verified = [e.evidence_id for e in evidence if e.verified]
    pending = [e.evidence_id for e in evidence if not e.verified]
    needs = []
    if not verified:
        needs.append("ยังไม่มีหลักฐานภายในที่ตรวจสอบแหล่งและวันที่ได้")
    if not case.get("verified_standard_clause"):
        needs.append("ต้องยืนยันข้อกำหนดและรหัสมาตรฐาน HA ฉบับที่ 6 จากต้นฉบับ")
    if scope == "kpi" and not case.get("indicator_definition_verified"):
        needs.append("ตรวจนิยาม KPI: ตัวเศษ ตัวส่วน ช่วงเวลา แหล่งข้อมูล และข้อมูลที่ขาดหาย")
    if scope in {"clinical", "risk", "digital", "internal_survey"}:
        needs.append("ผู้รับผิดชอบทางคลินิก/ระบบงานต้องตรวจทานความปลอดภัยก่อนใช้จริง")
    steps = [
        "1 ตรวจฉบับมาตรฐานและเอกสาร SAR 2026 ที่ใช้อยู่",
        "2 สรุป Context + Criteria + Concepts โดยมีหลักฐานระบุที่มา",
        "3 วิเคราะห์ Design / Action / Learning / Improvement",
        "4 จัดทำ evidence matrix และแยก fact / inference / missing",
        "5 สรุป Purpose / Process / Performance และ OFI ที่จัดลำดับความสำคัญ",
        "6 ส่ง Independent Evidence Audit ก่อนส่ง Human Review",
    ]
    return {
        "case_id": case_id,
        "title": title,
        "scope": scope,
        "standard": STANDARD_VERSION["standard"],
        "standard_effective_date": STANDARD_VERSION["effective_date"],
        "status": "DRAFT_REQUIRES_HUMAN_REVIEW",
        "not_an_accreditation_decision": True,
        "ha_score": None,
        "tasks": tasks,
        "workflow": steps,
        "evidence_verified_ids": verified,
        "evidence_pending_ids": pending,
        "missing_items": needs,
        "human_approvals": ["เจ้าของระบบงาน", "ทีมคุณภาพ/ผู้รับผิดชอบ HA"] + (["ผู้รับผิดชอบด้านข้อมูลส่วนบุคคล"] if scope == "digital" else []),
        "notice": "เครื่องมือนี้จัดแผนทบทวนแบบออฟไลน์ ไม่เชื่อมต่อโมเดล AI ไม่ตรวจหลักฐานต้นฉบับ และไม่ให้คะแนน HA แทนคณะทำงาน",
        "planned_on": date.today().isoformat(),
    }
