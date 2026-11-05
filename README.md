# JEFF AI Support — เจฟ

ช่องทางหลักคือ ChatGPT Project ใช้ผู้ช่วยเดียวเลือกความสามารถตามโจทย์ ชุดนี้เป็น **ไฟล์นำเข้า + offline routing baseline** ยังไม่ได้เปิดใช้งานหรือทดสอบ end-to-end ใน ChatGPT จริง

เริ่มที่ [คู่มือภาษาไทย](chatgpt_project/USER_GUIDE_TH.md) แล้วคัดลอก [Project Instructions](chatgpt_project/PROJECT_INSTRUCTIONS_TH.md) และนำเข้าไฟล์ Knowledge ที่ระบุ

- [Inventory และช่องว่าง](docs/jeff/INVENTORY_TH.md)
- [Architecture](docs/jeff/ARCHITECTURE_TH.md)
- [Skill Registry](chatgpt_project/SKILL_REGISTRY_TH.md) / [Routing Rules](chatgpt_project/ROUTING_RULES_TH.md)
- [Knowledge Source Map](chatgpt_project/KNOWLEDGE_SOURCE_MAP_TH.md)
- [ผลทดสอบ](docs/jeff/INTEGRATION_TEST_REPORT_TH.md) / [ทดสอบใน ChatGPT จริง](chatgpt_project/LIVE_ACCEPTANCE_TH.md)

HA V2 เดิมยังเป็นโปรแกรมวางแผนออฟไลน์ที่มี 16 บทบาท ไม่ใช่ autonomous agents; portal เป็น static prototype และไม่ใช่ทางเข้าหลัก ดู [HA README](ha_quality_team_v2/README.md) และ [Portal README](portal/README.md)

ทดสอบจากราก repository (Python 3.12+, ไม่ติดตั้ง dependencies):

```bash
PYTHONPATH=ha_quality_team_v2 python -m unittest discover -s tests -v
PYTHONPATH=ha_quality_team_v2 python -m unittest discover -s ha_quality_team_v2/tests -v
```

Offline router รับ JSON ผ่าน stdin: `{"text":"วิเคราะห์ QI Plan ตาม HA","deidentified":true}` แล้ว `python -m jeff.router` ไม่มี model/tool execution, network หรือ persistence; ใช้ข้อมูลจำลองเท่านั้น
