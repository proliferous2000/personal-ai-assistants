"""Role and standard registries; no copyrighted standards text bundled."""
STANDARD_VERSION = {
    "authority": "Healthcare Accreditation Institute (HAI), Thailand",
    "standard": "Hospital and Healthcare Standards, 6th edition",
    "edition": 6,
    "effective_date": "2026-10-01",
    "parts": {
        "I": "Organizational management",
        "II": "Key hospital systems",
        "III": "Patient-care processes",
        "IV": "Performance results",
    },
    "frameworks": ["3C-DALI", "3P", "HA Scoring Guideline (SAR 2026)"],
    "official_url": "https://www.ha.or.th/th/Contents/%E0%B8%A1%E0%B8%B2%E0%B8%95%E0%B8%A3%E0%B8%90%E0%B8%B2%E0%B8%99%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B8%AA%E0%B8%B8%E0%B8%82%E0%B8%A0%E0%B8%B2%E0%B8%9E%20%28HA%29",
}

AGENTS = {
    "director": ("HA Quality Director", "มอบหมายงาน กำหนดขอบเขต และตัดสินใจส่ง Human Review"),
    "standards": ("HA Standards & Updates", "ตรวจฉบับ รหัสข้อกำหนด และความตรงกันของแหล่งอ้างอิง"),
    "governance": ("Organization & Governance", "วิเคราะห์บริบท นโยบาย กลยุทธ์ บุคลากร และระบบบริหารองค์กร"),
    "clinical": ("Clinical PCT & Tracer", "ตรวจเส้นทางผู้ป่วย CLT/PCT และระบบการดูแลผู้ป่วย"),
    "safety": ("Patient Safety & Risk", "ทบทวนความเสี่ยง เหตุการณ์ไม่พึงประสงค์ RCA และมาตรการป้องกัน"),
    "improvement": ("QI / 3C-DALI / PDSA", "ออกแบบ ทดลอง วัดผล เรียนรู้ และปรับปรุงระบบ"),
    "metrics": ("KPI & Outcomes", "ตรวจนิยามตัวชี้วัด ตัวเศษ ตัวส่วน แหล่งข้อมูล และแนวโน้ม"),
    "sar": ("SAR & Profile Writer", "จัดโครงร่าง Hospital Profile, SAR, PCT Profile และหลักฐานประกอบ"),
    "surveyor": ("Internal Survey Lead", "วางแผนเยี่ยมสำรวจและดูแลความเป็นอิสระของทีมประเมิน"),
    "facilitator": ("Surveyor–Facilitator", "ตั้งคำถามเชิงระบบ โค้ช และกระตุ้นการเรียนรู้โดยไม่ตัดสินผลการเยี่ยม"),
    "system_surveyor": ("System Surveyor", "ประเมินตอน I-II และเชื่อมระบบสำคัญข้ามหน่วยงาน"),
    "clinical_surveyor": ("Clinical Surveyor", "ประเมินตอน III เส้นทางผู้ป่วยและระบบความปลอดภัยทางคลินิก"),
    "tracer_specialist": ("Tracer & Interview Specialist", "วางแผน Patient/System Tracer สัมภาษณ์และสังเกตการณ์"),
    "followup": ("Improvement Follow-up", "จัดทำทะเบียน OFI ติดตามการแก้ไขและผลลัพธ์"),
    "infosec": ("Digital Safety & PDPA", "ตรวจสิทธิ์เข้าถึง การคุ้มครองข้อมูล และการใช้ AI/ดิจิทัล"),
    "auditor": ("Independent Evidence Auditor", "ทบทวนอิสระ ไม่ให้คะแนนหรือสรุปแทนหลักฐาน และส่งกลับแก้ไข"),
}

ROUTES = {
    "clinical": ("standards", "clinical", "safety", "improvement", "metrics", "sar", "surveyor", "infosec"),
    "risk": ("standards", "safety", "improvement", "metrics", "surveyor", "infosec"),
    "qi": ("standards", "governance", "improvement", "metrics", "sar", "surveyor"),
    "sar": ("standards", "governance", "clinical", "metrics", "sar", "surveyor"),
    "kpi": ("standards", "metrics", "improvement", "sar"),
    "governance": ("standards", "governance", "metrics", "sar", "surveyor", "infosec"),
    "digital": ("standards", "infosec", "clinical", "safety", "metrics", "surveyor"),
    "general": ("standards", "governance", "surveyor", "sar"),
    "facilitation": ("standards", "facilitator", "clinical", "improvement", "metrics"),
    "internal_survey": ("standards", "surveyor", "system_surveyor", "clinical_surveyor", "tracer_specialist", "metrics", "followup"),
}
