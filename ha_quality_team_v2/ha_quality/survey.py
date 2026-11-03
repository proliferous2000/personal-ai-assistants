"""Offline survey/coaching plans. No live LLM, patient lookup, compliance score or accreditation decision."""
from __future__ import annotations

from collections import Counter
from datetime import date
from typing import Any

from .registry import AGENTS, STANDARD_VERSION
from .workflow import PrivacyReviewRequired, SENSITIVE_PATTERNS

SURVEY_MODES = {"facilitation", "internal_survey"}
VALID_PARTS = ("I", "II", "III", "IV")
VALID_EVIDENCE_TYPES = {"document", "interview", "observation", "indicator"}

QUESTIONS = {
    "I": [
        "ทิศทางและความเสี่ยงสำคัญขององค์กรคืออะไร ใครมีส่วนร่วมกำหนดและทบทวน?",
        "เป้าหมายองค์กรเชื่อมถึงงานประจำหน่วยงานอย่างไร มีหลักฐานของการนำไปใช้จริงหรือไม่?",
    ],
    "II": [
        "ระบบงานสำคัญระบุความเสี่ยงและจุดเชื่อมต่อระหว่างหน่วยงานอย่างไร?",
        "เมื่อเกิดปัญหา ระบบแจ้งเตือน แก้ไข เรียนรู้ และป้องกันการเกิดซ้ำอย่างไร?",
    ],
    "III": [
        "ลองตามรอยผู้ป่วยหนึ่งกรณีตั้งแต่รับบริการ ประเมิน วางแผน ดูแล จนจำหน่าย: มีจุดเสี่ยงใด?",
        "แนวปฏิบัติที่กำหนดไว้ตรงกับสิ่งที่ผู้ปฏิบัติทำจริงและประสบการณ์ผู้ป่วยหรือไม่?",
    ],
    "IV": [
        "ตัวชี้วัดนี้มีนิยาม ตัวเศษ ตัวส่วน ระยะเวลา และคุณภาพข้อมูลที่ตรวจสอบได้หรือไม่?",
        "ผลลัพธ์แสดงแนวโน้มอะไร และทีมใช้ผลนั้นตัดสินใจปรับปรุงอย่างไร?",
    ],
}

PHASES = {
    "facilitation": [
        ("context", "ทำความเข้าใจบริบทและโจทย์คุณภาพร่วมกับเจ้าของระบบ"),
        ("probe", "ชวนทีมเล่ากระบวนการจริงด้วยคำถามเปิด ไม่กล่าวโทษ"),
        ("reflect", "สรุปสิ่งที่ทีมทำได้ดี ความเสี่ยง และประเด็นที่ทีมต้องการพัฒนา"),
        ("co_design", "ให้ทีมออกแบบการทดลองปรับปรุงและแนวทางวัดผล"),
        ("handoff", "ส่งประเด็นให้ทีมเจ้าของงาน พร้อมระบุว่ายังไม่ใช่ผลการตรวจประเมิน"),
    ],
    "internal_survey": [
        ("desk_review", "ตรวจ SAR/Profile/KPI/risk และหลักฐานพร้อมช่วงเวลาที่เกี่ยวข้อง"),
        ("risk_based_plan", "กำหนดขอบเขต กลุ่มตัวอย่าง การตามรอย และประเด็นปลอดภัยสูง"),
        ("opening", "ชี้แจงวัตถุประสงค์ ความลับ การเรียนรู้ ไม่กล่าวโทษ และความเป็นอิสระ"),
        ("onsite_tracer", "สัมภาษณ์ สังเกตงานจริง และตรวจหลักฐานในขอบเขตสิทธิ์ที่อนุญาต"),
        ("triangulation", "เทียบเอกสาร-สัมภาษณ์-การสังเกต-ผลลัพธ์ แยกความขัดแย้งของข้อมูล"),
        ("team_consensus", "คณะผู้ประเมินภายในทวนหลักฐานและจัดชั้นข้อค้นพบเบื้องต้น"),
        ("closing", "แจ้งจุดแข็ง ประเด็นเสี่ยง และ OFI โดยให้หน่วยงานชี้แจงข้อเท็จจริง"),
        ("followup", "กำหนดเจ้าของงาน ระยะเวลา และวิธียืนยันผลการปรับปรุง"),
    ],
}


def _required_str(data: dict[str, Any], key: str) -> str:
    val = data.get(key)
    if not isinstance(val, str) or not val.strip():
        raise ValueError(f"{key} must be a nonempty string")
    return val.strip()


def _clean_text(value: Any) -> bool:
    if isinstance(value, str):
        return not any(pattern.search(value) for pattern in SENSITIVE_PATTERNS)
    if isinstance(value, dict):
        return all(_clean_text(v) for v in value.values())
    if isinstance(value, list):
        return all(_clean_text(v) for v in value)
    return True


def create_survey_plan(request: dict[str, Any]) -> dict[str, Any]:
    """Draft a role-separated facilitator or internal survey plan from deidentified inputs."""
    if not isinstance(request, dict):
        raise TypeError("request must be a dictionary")
    if request.get("deidentified") is not True or not _clean_text(request):
        raise PrivacyReviewRequired("privacy review, authorized access, and deidentified=true are required")
    survey_id = _required_str(request, "survey_id")
    facility_alias = _required_str(request, "facility_alias")
    mode = _required_str(request, "mode")
    if mode not in SURVEY_MODES:
        raise ValueError("mode must be facilitation or internal_survey")
    parts = request.get("target_parts")
    if not isinstance(parts, list) or not parts or any(p not in VALID_PARTS for p in parts):
        raise ValueError("target_parts must be a nonempty list of I/II/III/IV")
    if len(set(parts)) != len(parts):
        raise ValueError("duplicate target_parts")
    coached_by = request.get("previous_coach_ids", [])
    surveyors = request.get("surveyors", [])
    if not isinstance(coached_by, list) or not isinstance(surveyors, list):
        raise ValueError("previous_coach_ids and surveyors must be lists")
    if mode == "internal_survey" and set(coached_by) & set(surveyors):
        raise ValueError("independence conflict: a reviewer previously coached this same scope")
    evidence = request.get("evidence", [])
    if not isinstance(evidence, list):
        raise TypeError("evidence must be a list")
    for x in evidence:
        if not isinstance(x, dict) or not all(x.get(k) for k in ("evidence_id", "title", "locator", "type")):
            raise ValueError("each evidence item requires evidence_id/title/locator/type")
        if x["type"] not in VALID_EVIDENCE_TYPES:
            raise ValueError("unknown evidence type")
    ids = [e["evidence_id"] for e in evidence]
    if len(set(ids)) != len(ids):
        raise ValueError("duplicate evidence_id")
    types = Counter(e["type"] for e in evidence if e.get("verified") is True)
    if mode == "facilitation":
        agent_ids = ["director", "standards", "facilitator", "improvement", "auditor"]
    else:
        agent_ids = ["director", "standards", "surveyor", "system_surveyor", "clinical_surveyor", "tracer_specialist", "metrics", "followup", "auditor"]
    missing=[]
    if not request.get("verified_standard_clause"):
        missing.append("ต้องตรวจรหัสข้อกำหนด HA 6 จากต้นฉบับก่อนอ้างอิงผล")
    if not types["document"]:
        missing.append("ไม่มีเอกสารที่ยืนยันแล้ว")
    if mode == "internal_survey":
        for kind, name in (("interview","ข้อมูลสัมภาษณ์"),("observation","ข้อมูลสังเกตการณ์"),("indicator","ข้อมูลผลลัพธ์/ตัวชี้วัด")):
            if not types[kind]:
                missing.append(f"ยังไม่มี{name}ที่ยืนยันแล้ว (อาจเก็บภาคสนาม)")
    safety_signals=request.get("unresolved_safety_signals", [])
    if not isinstance(safety_signals, list):
        raise ValueError("unresolved_safety_signals must be a list")
    return {
        "survey_id":survey_id,
        "facility_alias":facility_alias,
        "mode":mode,
        "standard":STANDARD_VERSION["standard"],
        "standard_effective_date":STANDARD_VERSION["effective_date"],
        "status":"DRAFT_HUMAN_APPROVAL_REQUIRED",
        "not_official_hai_survey":True,
        "official_accreditation_decision":None,
        "ha_score":None,
        "target_parts":parts,
        "topics":request.get("topics", []),
        "roles":[{"id":a,"name":AGENTS[a][0]} for a in agent_ids],
        "visit_phases":[{"step":a,"activity":b} for a,b in PHASES[mode]],
        "sample_questions":[{"part":p,"question":q} for p in parts for q in QUESTIONS[p]],
        "evidence_verified_by_type":dict(types),
        "evidence_pending_ids":[e["evidence_id"] for e in evidence if e.get("verified") is not True],
        "evidence_gaps":missing,
        "risk_escalation":("แจ้งเจ้าของระบบ/ผู้รับผิดชอบความปลอดภัยโดยเร็วตามช่องทางภายในที่กำหนด; AI ไม่วินิจฉัยเอง" if safety_signals else None),
        "safety_signals_count":len(safety_signals),
        "finding_categories":["good_practice","potential_ofi","safety_signal","evidence_gap","not_assessed"],
        "required_approvals":["หัวหน้าทีมเยี่ยมสำรวจภายใน", "เจ้าของกระบวนการ", "ทีมคุณภาพโรงพยาบาล"],
        "note":"คำถามและเฟสเป็นแบบออกแบบใหม่สำหรับช่วยงาน ไม่ใช่เครื่องมือทางการของ สรพ.; ตรวจทานหลักฐานจริงก่อนใช้ผล",
        "planned_on":date.today().isoformat(),
    }
