# HA Quality & Surveyor Intelligence Team — V2 starter scaffold

**Updated 2026-11-03.** ระบบต้นแบบสนับสนุนการพัฒนาคุณภาพ รพ. และการเยี่ยมสำรวจภายใน ตามมาตรฐานโรงพยาบาลและบริการสุขภาพ **ฉบับที่ 6 (ใช้ตั้งแต่ 1 ต.ค. 2569)**

## อะไรใหม่ใน V2
- เพิ่มทีม Surveyor **6 บทบาท** ในโครงสร้างรวม **16 agents** (เพิ่ม 5 roles จาก V1 และปรับ Internal Survey Lead เดิม)
- แยก **Facilitation (โค้ช)** ออกจาก **Internal Survey (ประเมินภายใน)** เพื่อไม่ให้ประเมินผลงานตัวเอง
- มี Playbook, SOP, HA I-IV Coverage Matrix, Interview/Tracer question bank, Evidence/OFI Follow-up CSV templates
- เพิ่มโปรแกรมวางแผน survey แบบออฟไลน์ที่ตรวจ input, role separation, missing evidence, และชี้ความเสี่ยงคงค้าง
- ทดสอบ unit tests ของ quality workflow และ survey workflow

## ขอบเขตและข้อจำกัด
**สิ่งที่ทำได้ตอนนี้:** อ่าน JSON ของ *ข้อมูลจำลองหรือไม่ระบุตัวตน* แล้วจัดแผนบทบาท/เฟส/คำถาม/หลักฐานที่ต้องการ และสร้างแผนงานที่มนุษย์จะตรวจต่อ

**สิ่งที่ยังทำไม่ได้:** ไม่มีการต่อ AI API, ระบบเวชระเบียน, Google Drive, HRMS, อินเทอร์เน็ต หรือ RAG; ไม่สามารถไปสังเกต/สัมภาษณ์ในสถานที่จริงได้ และไม่ตรวจความจริงของเอกสารอัตโนมัติ

**การรับรอง:** AI นี้ **ไม่ใช่ผู้เยี่ยมสำรวจของ สรพ.** ไม่สามารถให้การรับรองหรือให้คะแนน HA อย่างเป็นทางการ ผลประเมินภายในต้องผ่านผู้ประเมิน/ผู้รับผิดชอบจริงของโรงพยาบาล

**ข้อมูลอ่อนไหว:** ห้ามใส่ข้อมูลระบุตัวผู้ป่วยใน JSON, โฟลเดอร์เผยแพร่, repository หรือ AI ที่ไม่ได้รับอนุญาต การตรวจรูปแบบ HN/เลขบัตรแบบหยาบไม่ใช่การรับประกันว่าปลอดข้อมูลส่วนบุคคล

## ใช้งาน (Python 3.12+ ไม่พึ่งแพ็กเกจภายนอก)

```bash
python -m ha_quality.cli examples/ortho_vte.json
python -m ha_quality.cli --survey examples/facilitation_ortho_vte.json
python -m ha_quality.cli --survey examples/internal_survey_ortho_vte.json
python -m unittest discover -s tests -v
```

## โฟลเดอร์ที่ควรเริ่มอ่าน
- `docs/surveyor_facilitator.md` — วิธีทำหน้าที่ Facilitator และตัวอย่างคำถามใน PCT Ortho
- `docs/internal_survey_sop.md` — ขั้นตอนก่อน/ระหว่าง/หลังเยี่ยม และข้อพึงระวัง
- `docs/ha6_coverage_matrix.md` — ตารางขอบเขตการเยี่ยมครอบคลุม HA ตอน I-IV
- `prompts/surveyor_facilitator.md` และ `prompts/internal_survey_panel.md` — คำสั่งสำหรับ Agent
- `templates/` — แบบบันทึกห้าชุด เพิ่มจาก V1
- `config/sources.json` — แหล่งความรู้มาตรฐาน (URL) และเอกสารที่ต้องตรวจสอบ revision

## เส้นทางการพัฒนาต่อ
1. ใช้เอกสารมาตรฐาน HA6 และ SAR 2026 จากแหล่งที่ได้รับอนุญาต กำกับ revision, clause, page และสิทธิ์
2. ทดสอบภาคสนามร่วมกับทีมคุณภาพ: เลือก pilot ออร์โธ 1 ระบบ และระบบสนับสนุน 1 ระบบ ให้คนเก็บ evidence จริง
3. ตรวจสอบความตรงกันของรายงาน AI กับ internal surveyor มนุษย์ และความคงเส้นคงวาของข้อเสนอ
4. เพิ่ม controlled RAG/search ตามสิทธิ์ และเชื่อม GitHub/Drive ภายหลังได้รับอนุมัติและตรวจโครงสร้าง repo ที่ใช้งานจริง

## แหล่งอ้างอิง (ไม่รวมเนื้อหาลิขสิทธิ์ของ สรพ. ในแพ็กเกจ)
- HA6 official: `config/sources.json`
- HAI surveyor creation & development; ethics; HA401 Internal Survey & Coaching
