# Integration Test Report v0.1 — 2026-11-05
Environment: Python 3.12+ standard library, local feature/jeff-chatgpt-integration, synthetic inputs only. ไม่มี LLM/API/MCP call ในการทดสอบ ไม่มีการทดสอบความถูกต้องเนื้อหาทางวิจัย/คลินิกจากโมเดล

| สถานการณ์ | offline routing | การตรวจหลักฐาน/ต่อเนื่อง | ChatGPT จริง |
|---|---|---|---|
| R&D | PASS: rd + methodology | PASS: บังคับ source check, เปิดเผย gap; follow-up เก็บ primary | NOT RUN |
| EC review | PASS: ethics หลัก แม้กล่าว R&D | PASS: protocol/consent/risk-benefit + reviewer; follow-up เก็บ primary | NOT RUN |
| RCA | PASS: rca + risk/safety/ha | PASS: ไม่ตั้ง verified, ต้อง reviewer/human; follow-up เก็บ primary | NOT RUN |
| QI/HA | PASS: qi + ha/kpi | PASS: gap ชัด; HA offline plan ไม่ให้คะแนนและแจ้งหลักฐานขาด | NOT RUN |
| Workload/Productivity | PASS: workload + kpi | PASS: proposed skill แสดง gap; ไม่อ้างคำนวณ/เชื่อม HR จริง | NOT RUN |

PASS ในคอลัมน์ offline หมายถึงการเลือก IDs และตั้งสถานะหลักฐาน/ทบทวนถูกตาม policy เท่านั้น ไม่ได้หมายถึงมีหลักฐานเหมาะสมครบหรือผลตอบที่ผ่าน domain validation ทุกกรณีตั้ง evidence_verified=false และ executed_skills=[] ผล JSON ตรวจซ้ำได้ใน offline_scenario_results.json

## Automated checks
- `PYTHONPATH=ha_quality_team_v2 python -m unittest discover -s tests -v`: PASS 7 tests รวม 5 scenario subcases, follow-up, เปลี่ยน intent, ambiguity, false-positive boundary, malformed state/privacy, registry sources/dependencies, reuse HA quality และ survey independence
- `PYTHONPATH=ha_quality_team_v2 python -m unittest discover -s ha_quality_team_v2/tests -v`: PASS 21 legacy tests
- รวม PASS 28 test methods; ไม่ได้ทำ live model evaluation
- ระหว่างพัฒนาพบ FAIL 1 จุดใน fixture survey เพราะขาด target_parts; เติม fixture ให้ตรงสัญญาเดิมแล้ว rerun ผ่าน ไม่เปลี่ยน HA implementation เพื่อให้ test ผ่าน

## ข้อจำกัด/เกณฑ์ที่ยังไม่ผ่าน
- Semantic/negation handling: FAIL สำหรับ production readiness; baseline ยังแสดงทั้ง rct และ action เมื่อป้อน “ไม่ใช่ RCT แต่เป็น Action Research” จึงส่ง needs_context_review และต้องตีความโดย ChatGPT/มนุษย์ ไม่ใช้ Python นี้ตัดสินงานจริงลำพัง
- ต่อเนื่องทดสอบเฉพาะ route state ในหน่วยความจำ ไม่ใช่ความจำ ChatGPT หรือการแก้เนื้อหาคำตอบจริง
- Citation/source validity ยังไม่ตรวจออนไลน์ครั้งนี้; missing original ของ Citation/Reviewer/V4 และ workload ยังอยู่
- ไม่มีการทดสอบสิทธิ์ Apps จริง, prompt injection ผ่าน retrieval จริง, independent reviewer, persistent approvals/revocation/stale knowledge retrieval เพราะไม่มีระบบเหล่านี้ใน scope ที่เชื่อมแล้ว
- Pattern privacy test ผ่านเฉพาะตัวอย่าง HN/เลขระบุ ไม่รับรองการลดการระบุตัวบุคคลทั้งหมด
- Live ChatGPT acceptance ทั้ง 5 กรณี: NOT RUN จึง **ยังไม่ผ่านเกณฑ์ประกาศบูรณาการระบบสำเร็จ** ใช้ LIVE_ACCEPTANCE_TH.md ให้ผู้ใช้ทดสอบหลังนำเข้า แล้วให้เจ้าของงานตรวจผล
