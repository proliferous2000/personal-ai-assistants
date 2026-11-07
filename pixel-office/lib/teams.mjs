import {readFile} from 'node:fs/promises';

const desk = (id, name, brief) => ({id, name, brief});
export async function loadTeams(registryPath) {
  const ha = JSON.parse(await readFile(registryPath, 'utf8'));
  if (!Array.isArray(ha.agents) || !ha.agents.some(agent => agent.id === 'director')) {
    throw new Error('ทะเบียน HA ต้องมี agents และ director');
  }
  const teams = [
    {id:'jeff', floor:1, name:'เจฟ เลขากลาง', short:'JEFF', color:'#98efcf',
      desks:[desk('secretary','เจฟ เลขากลาง','รับโจทย์ จัดเส้นทาง ติดตาม และรายงานผลจากหัวหน้าทีม')]},
    {id:'ha', floor:2, name:'HA และ PCT', short:'HA / PCT', color:'#b9adff',
      desks:ha.agents.map(agent => desk(agent.id, agent.role, agent.id === 'director' ? 'หัวหน้าทีม HA กำกับและตรวจทานผลงานของทีมตามทะเบียนเดิม' : agent.responsibilities))},
    {id:'risk', floor:3, name:'ความเสี่ยงและ RCA', short:'RISK / RCA', color:'#ffb09d',
      desks:[desk('lead','หัวหน้าทีมความเสี่ยง','กำกับและตรวจทานการวิเคราะห์ของทีม'),
        desk('hrms','อุบัติการณ์ / HRMS','เรียบเรียงเหตุการณ์และข้อมูลที่ยังขาด'),
        desk('records','เวชระเบียน','ทบทวนลำดับการดูแลและหลักฐานทางคลินิก'),
        desk('rca','RCA','วิเคราะห์ปัจจัยระบบ แยกข้อเท็จจริงกับสมมติฐาน'),
        desk('followup','ติดตามมาตรการ','ออกแบบมาตรการ ผู้รับผิดชอบ และวิธีวัดผล')]},
    {id:'research', floor:4, name:'วิจัย', short:'RESEARCH', color:'#96d6f6',
      desks:[desk('lead','หัวหน้าทีมวิจัย','ตรวจความสอดคล้องระเบียบวิธีและข้อสรุป'),
        desk('protocol','โครงร่าง / หลักฐาน','พัฒนาปัญหา วัตถุประสงค์ และทบทวนวรรณกรรม'),
        desk('rd','R&D / Action Research','ออกแบบระยะพัฒนาและวงรอบวิจัย'),
        desk('rct','RCT / GCP','ตรวจการสุ่ม การปกปิด และการทดลอง'),
        desk('statistics','สถิติ / บทความ','ตรวจตัวแปร ขนาดตัวอย่าง สถิติ และการรายงาน')]},
    {id:'ethics', floor:5, name:'จริยธรรมวิจัย', short:'ETHICS', color:'#f5d089',
      desks:[desk('lead','หัวหน้าทีม EC','กำกับและตรวจทานข้อคิดเห็นจริยธรรม'),
        desk('protocol','ทบทวนโครงการ','พิจารณาความเหมาะสมและความเสี่ยง'),
        desk('consent','ความยินยอม','ทบทวนข้อมูลและการคุ้มครองผู้เข้าร่วม'),
        desk('gcp','GCP / ติดตาม','ทบทวนกระบวนการทดลองและการติดตาม')]},
    {id:'ward', floor:6, name:'หอผู้ป่วยออร์โธฯ', short:'ORTHO WARD', color:'#b4dc9d',
      desks:[desk('lead','หัวหน้าทีมหอผู้ป่วย','ตรวจความเหมาะสมและผลลัพธ์ของงานในหอผู้ป่วย'),
        desk('management','บริหาร','อัตรากำลัง ภาระงาน ต้นทุน และทรัพยากร'),
        desk('service','บริการ','กระบวนการดูแลและความต่อเนื่อง'),
        desk('academic','วิชาการ','สมรรถนะ หลักฐาน และการพัฒนาบุคลากร'),
        desk('operations','ปฏิบัติการ / ข้อมูล','เวชภัณฑ์ ระบบข้อมูล และ KPI')]}
  ];
  return teams;
}
