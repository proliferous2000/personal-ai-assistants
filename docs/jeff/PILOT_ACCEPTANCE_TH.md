# JEFF V1.0 · ผลทดสอบและเกณฑ์รับงาน

ทดสอบ 6 พฤศจิกายน 2569 ด้วยข้อมูลสมมติ อ้างอิง branch ต่อจาก PR #6 @ a8a89d3 และชุดเพิ่มใน Draft PR นี้

| กรณี | ออฟไลน์ / loopback | ChatGPT และบัญชีจริง | หลักฐานหรือเกณฑ์ผ่าน |
|---|---|---|---|
| 1. ขอคำแนะนำวิจัย | PASS เฉพาะ routing | NOT TESTED | test_five_scenarios_and_followup และ test_task_lifecycle_and_isolation ได้ R&D + methodology. Live ขอออกแบบ R&D สมมติ ให้เจฟเชื่อมปัญหา ผลลัพธ์ และข้อมูลขาด ไม่สร้างผลหรืออ้างอิง |
| 2. RCA / 5-Tier | PASS เฉพาะ routing | NOT TESTED | test_missing_capability_and_unapproved_data ทดสอบคำว่า 5-Tier เดี่ยวและ RCA. Live ใช้เหตุการณ์สมมติ ให้แยกข้อเท็จจริง สมมติฐาน และข้อจำกัดของเกณฑ์ต้นฉบับ |
| 3. ส่งงานและได้เลข | PASS | NOT TESTED | SQLite และ loopback HTTP คืน J- จริง ทดสอบส่งพร้อมกันสองครั้งด้วยคีย์เดิมได้เลขเดิม. Live ให้ A ส่งเฉพาะร่างที่อนุญาตและเก็บเลขจากระบบ |
| 4. ติดตามและรับผล | PASS | NOT TESTED | loopback รับ → มอบหมาย admin → เสร็จ → ผู้ส่งเห็นผล. Live ผู้ดูแลใช้เลข J- ประสาน JEFF กลาง บันทึกผล แล้วให้ A เปิดผล |
| 5. กันบัญชีอื่น | PASS เฉพาะต้นแบบ | NOT TESTED | staff-b ใช้รหัสของตนเองแล้วไม่เห็นงาน A และถูกปฏิเสธ dashboard. Live ใช้บัญชี B เปิด Project A และแฟ้มผลของ A ต้องถูกปฏิเสธทั้งคู่ |
| 6. บทเรียนรออนุมัติ | PASS | NOT TESTED | test_approval_version_and_rollback และ test_rejection_and_self_approval กันร่าง/รายการปฏิเสธและการอนุมัติงานของตนเอง. Live ตรวจว่าร่างไม่อยู่ใน Project เจ้าหน้าที่จนผู้ดูแลยืนยันเผยแพร่ |
| 7. เวอร์ชันและย้อนกลับ | PASS เฉพาะ Knowledge snapshot | NOT TESTED | ทับเลขรุ่นเดิมไม่ได้ ย้อน 1.1.0 → 1.0.0 แล้วรุ่นใหม่ยังอยู่ในประวัติ. Live ทดสอบอัปโหลดและเปลี่ยนกลับทั้ง Knowledge Pack และ registry จาก Git revision เดียวกัน โดยเก็บงานเดิม |
| 8. สิทธิ์หรือเครื่องมือขาด | PASS เฉพาะ policy และ HTTP | NOT TESTED | รหัสผิดและ origin อื่นถูกปฏิเสธ Router ระบุ chatgpt_connected=false และ executed_skills=[] เมื่อจำลอง. Live เปิด Project ที่ขาด source หรือ App ให้เจฟแจ้งข้อจำกัดและเสนอร่างที่ตรวจต่อได้ |

## ผลรันที่ทำซ้ำได้

```sh
PYTHONPATH=ha_quality_team_v2:. python -m unittest discover -s tests -v
PYTHONPATH=ha_quality_team_v2:. python -m unittest discover -s ha_quality_team_v2/tests -q
```

- JEFF tests 12/12 PASS (เดิม 7 และเพิ่ม 5) และ HA V2 21/21 PASS
- Loopback HTTP smoke PASS โดยรัน `python -m jeff.pilot` กับ SQLite ชั่วคราว แล้วส่ง HTTP GET/POST ตามลำดับ submit → assign → finish → tasks ของ A และ B → dashboard ผ่าน 127.0.0.1
- เอกสาร PR #4–#5 ตรวจต้นฉบับและ path ที่ registry อ้างถึง ชุดกรณีสำหรับคำตอบโมเดลยังไม่ได้รันใน ChatGPT
- เอกสารและการทดสอบยืนยันขั้นตอนของต้นแบบ ข้อมูลอ้างอิงคลินิก/HA/EC ยังต้องตรวจฉบับจริงต่อกรณี การทบทวนรอบสองใน Chat เป็นการทบทวนโดยโมเดลเดียว เวิร์กโฟลว์บทเรียนมีบทบาทผู้ตรวจและผู้อนุมัติแยกกัน

## ก่อนรับรอง Pilot

ใช้คู่มือ PILOT_V1_TH.md และบันทึกแต่ละข้อด้วย PASS / FAIL / NOT TESTED, วันเวลา, บทบาทจำลอง, โหมด Chat, รุ่น pack, หลักฐานที่ลดการระบุตัวตน และปัญหาที่พบ การทดสอบที่ต้องเปลี่ยนสิทธิ์ ChatGPT หรือเชื่อม Google รอคุณหน่องอนุมัติ ควรปิดผล NOT TESTED ทั้ง 8 ข้อก่อนขยายเป็น 10 คน
