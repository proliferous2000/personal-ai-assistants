# Inventory — ตรวจจริง 2026-11-05
ฐานตรวจ local checkout commit af5aa7e (branch work ก่อนสร้าง feature/jeff-chatgpt-integration) สำรวจ tracked/hidden files ใน working tree ไม่ใช่การตรวจทุก branch บน GitHub หรือทุก Project ของผู้ใช้

| สิ่งที่ตรวจ | หลักฐาน | สถานะที่พิสูจน์ได้ |
|---|---|---|
| PROJECT_CONTEXT.md | อ่านทั้งไฟล์และบริบทการเปลี่ยน ChatGPT-first | ข้อกำหนด/บันทึก ไม่ใช่ runtime |
| HA V2 config และ registry | config/agents.json, ha_quality/registry.py มี 16 roles | role definitions ไม่ใช่ 16 autonomous agents |
| HA workflow/CLI | workflow.py, survey.py, cli.py, tests/ | executable offline planning; ไม่มี model API/search/DB |
| HA prompts/docs | อ่าน master, agent_briefs, facilitator, survey panel และ SOP/coverage/playbook | คำสั่งและกระบวนการช่วยงาน ไม่ใช่มาตรฐานทางการเต็มฉบับ |
| HA templates/examples | ตรวจ headers ทั้ง 8 templates, examples และ tests | แบบฟอร์มและ synthetic fixtures/output ไม่ใช่ผลภาคสนาม |
| HA knowledge sources | config/sources.json | URL pointers; ไม่ได้เปิดยืนยันเนื้อหา/ฉบับออนไลน์ครั้งนี้ |
| portal/ | README และ HTML; rg ตรวจข้ออ้าง runtime | static prototype ไม่มี backend; คงเดิม |
| docs/dialogue_learning_loop.md | อ่านข้อกำหนด/เกณฑ์รับงาน | design ยังไม่มี trusted memory/approval store |
| HA (ไฟล์ราก) | file และ cat | ไฟล์ว่าง ไม่มีความสามารถ |
| Research Team Master V4 | ไม่มีไฟล์ตรงต้นฉบับใน working tree | missing_original; รายงานอดีตใน context ไม่ใช้แทนต้นฉบับ |
| research starter PR #1 | กล่าวถึงใน context เท่านั้น ไม่ได้ดึง/ตรวจ PR | ไม่ใช้เป็น V4 ไม่อ้างติดตั้ง |
| nursing-research-partner | อ่าน cloud SKILL.md จาก skill://user/6ab4ae0dab3c8191985d31da946efdcf/nursing-research-partner/SKILL.md | มีต้นฉบับนอก repo; เอกสารประกอบยังไม่ได้บรรจุ/ตรวจครบ |
| design-rd-action-research | อ่าน cloud SKILL.md จาก skill://user/6acf98e4aa0c81919bd11beb80e1af73/design-rd-action-research/SKILL.md | มีต้นฉบับนอก repo; evidence register และ references ต้องตรวจ/นำเข้าเพิ่ม |
| design-rct-gcp | อ่าน cloud SKILL.md จาก skill://user/6ad09633b6208191b741a4d1c954f395/design-rct-gcp/SKILL.md | มีต้นฉบับนอก repo; official guideline dependencies ต้องตรวจเพิ่ม |
| Citation Verification / Research Critical Reviewer | ไม่มี dedicated source ใน working tree/skill catalog ที่ตรวจ | มีหลักการบางส่วนใน nursing skill/HA auditor; ไม่ใช่ต้นฉบับเฉพาะ สร้าง fallback checklist ติดป้ายชัด |
| EC และบริหารพยาบาล | RCT skill/HA governance/metrics ช่วยได้บางส่วน | ไม่มี dedicated full workflow สำหรับ EC/workload/competency/dashboard |

## ของเพิ่มใน branch นี้
AGENTS.md, Project instructions, registry 29 capabilities, routing policy, curated fallback pack, offline planner และ integration tests พร้อมเอกสาร/แพ็กเกจนำเข้า ไม่แก้ legacy code/portal ไม่สร้าง model instances ใหม่

## ข้อที่ยังไม่ยืนยัน
ไม่มีการตรวจติดตั้งจริงในบัญชี ChatGPT, ไม่มีการทดสอบผลตอบทางคลินิก/EC จาก ChatGPT, ไม่ตรวจความถูกต้องปัจจุบันของ HA6/ICH/SPIRIT/CONSORT จากเว็บครั้งนี้ ไม่รับรองความครบถ้วนทุก Skill ของผู้ใช้ แยก source inspection จาก domain validation
