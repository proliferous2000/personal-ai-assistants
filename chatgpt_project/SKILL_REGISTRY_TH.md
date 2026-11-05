# Skill Registry — JEFF v0.1.0
ตรวจ 5 พฤศจิกายน 2569; ไม่มีรายการใดยืนยันว่าติดตั้งใน ChatGPT Project แล้ว

สถานะ: offline_asset = มีโค้ด/แบบฟอร์มออฟไลน์; partial_prompt = รองรับบางส่วนใน prompt ไม่ใช่ทักษะเฉพาะที่สมบูรณ์; cloud_source_inspected = อ่าน SKILL.md ในเซสชันนี้ แต่ dependencies ยังไม่ถูกบรรจุ; missing_original = ไม่พบต้นฉบับเฉพาะ; proposed = ต้องพัฒนาเพิ่ม

| ID / ความสามารถ | กลุ่ม | สถานะ | เงื่อนไขตัวอย่าง | ต้นฉบับ |
|---|---|---|---|---|
| methodology — Research Methodology | A | cloud_source_inspected | ระเบียบวิธี, วิธีวิจัย, methodology, ออกแบบวิจัย | skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| rd — Research & Development | A | cloud_source_inspected | r&d, r1d1, วิจัยและพัฒนา, วิจัย r&d | skill://user/6acf98e4aa0c81919bd11beb80e1af73/design-rd-action-research/SKILL.md; skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| action — Action Research | A | cloud_source_inspected | action research, วิจัยเชิงปฏิบัติการ, paor, participatory action | skill://user/6acf98e4aa0c81919bd11beb80e1af73/design-rd-action-research/SKILL.md; skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| rct — RCT / GCP | A | cloud_source_inspected | rct, gcp, สุ่มมีกลุ่มควบคุม, randomized, allocation concealment | skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md |
| statistics — Statistical Analysis | A | partial_prompt | สถิติ, statistical, sample size, ขนาดตัวอย่าง | skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| writing — Academic Writing | A | partial_prompt | บทคัดย่อ, manuscript, academic writing, เขียนบทความ | skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| literature — Literature Review | A | partial_prompt | ทบทวนวรรณกรรม, literature review, ค้นบทความ | skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| citation — Citation Verification | A | missing_original | citation, doi, อ้างอิง, บรรณานุกรม | ยังไม่มี |
| reviewer — Research Critical Reviewer | A | missing_original | critical review, วิจารณ์งานวิจัย | ยังไม่มี |
| ethics — Research Ethics Review | B | proposed | ec, irb, จริยธรรมวิจัย, จริยธรรมการวิจัย, ฐานะ ec | ยังไม่มี |
| protocol — Protocol Assessment | B | partial_prompt | protocol, โครงร่างวิจัย, โครงการวิจัย | skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md; skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md |
| risk_benefit — Risk–Benefit Analysis | B | partial_prompt | risk-benefit, risk–benefit, ความเสี่ยงและประโยชน์ | skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md |
| consent — Informed Consent Review | B | partial_prompt | informed consent, ใบยินยอม, เอกสารยินยอม | skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md |
| research_governance — Research Governance | B | partial_prompt | research governance, กำกับดูแลงานวิจัย | skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md |
| ha — HA Quality Management | C | offline_asset | ha, คุณภาพโรงพยาบาล, มาตรฐาน ha | ha_quality_team_v2/prompts/master.md; ha_quality_team_v2/ha_quality/workflow.py |
| survey — Internal Survey / Clinical Tracer | C | offline_asset | internal survey, tracer, เยี่ยมสำรวจ | ha_quality_team_v2/ha_quality/survey.py; ha_quality_team_v2/prompts/internal_survey_panel.md; ha_quality_team_v2/prompts/surveyor_facilitator.md |
| rca — Root Cause Analysis | C | partial_prompt | rca, root cause, รากสาเหตุ, อุบัติการณ์ | ha_quality_team_v2/prompts/agent_briefs.md |
| risk — Clinical Risk Management | C | partial_prompt | clinical risk, ความเสี่ยงทางคลินิก | ha_quality_team_v2/prompts/agent_briefs.md |
| qi — QI / PDSA | C | offline_asset | qi, pdsa, qi plan, แผนพัฒนาคุณภาพ | ha_quality_team_v2/templates/qi_plan.csv; ha_quality_team_v2/ha_quality/workflow.py |
| safety — Patient Safety | C | partial_prompt | patient safety, ความปลอดภัยผู้ป่วย | ha_quality_team_v2/prompts/agent_briefs.md |
| ebp — Evidence-Based Practice | C | proposed | ebp, evidence-based practice, ปฏิบัติการพยาบาลตามหลักฐาน | ยังไม่มี |
| workforce — Nursing Workforce Management | D | proposed | อัตรากำลัง, workforce, จัดเวร | ยังไม่มี |
| workload — Workload & Productivity | D | proposed | workload, productivity, ภาระงาน, ผลิตภาพ | ยังไม่มี |
| kpi — KPI Analysis | D | partial_prompt | kpi, ตัวชี้วัด | ha_quality_team_v2/prompts/agent_briefs.md; ha_quality_team_v2/templates/evidence_matrix.csv |
| competency — Functional Competency | D | proposed | competency, สมรรถนะ | ยังไม่มี |
| ortho — PCT Orthopedics Management | D | partial_prompt | pct, orthopedics, ออร์โธ, กระดูก | ha_quality_team_v2/docs/surveyor_facilitator.md; ha_quality_team_v2/examples/ortho_vte.json |
| dashboard — Clinical Dashboard Analysis | D | proposed | dashboard, แดชบอร์ด | ยังไม่มี |
| service — Nursing Service Development | D | proposed | พัฒนาบริการพยาบาล, nursing service | ยังไม่มี |
| executive — Executive Decision Support | D | proposed | ผู้บริหาร, executive, ตัดสินใจเชิงบริหาร | ยังไม่มี |

กลุ่ม A วิจัย; B EC/IRB; C HA/คลินิก; D บริหารการพยาบาล คำ trigger เป็นตัวช่วยทดสอบ ไม่ใช่ตัวแทนความเข้าใจภาษา
ทะเบียน JSON เป็นแหล่งกฎเดียวสำหรับ offline router; Project ใช้ไฟล์ Markdown นี้และ ROUTING_RULES_TH.md ตีความเชิงบริบท ไม่รัน Python อัตโนมัติ
