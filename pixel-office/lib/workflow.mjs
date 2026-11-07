export const routeSchema = {
  type:'object', additionalProperties:false,
  properties:{
    team:{type:'string',enum:['jeff','ha','risk','research','ethics','ward']},
    desk:{type:'string'}, message:{type:'string'}
  }, required:['team','desk','message']
};
const identity = 'คุณคือเจฟ เลขากลางของคุณหน่อง ตอบภาษาไทย รับโจทย์ จัดเส้นทาง ประสาน ติดตาม และรายงานผล งานวิเคราะห์เชิงลึกและคุณภาพเป็นหน้าที่ทีมเฉพาะทางและหัวหน้าทีมนั้น ห้ามสร้างข้อมูล แหล่งอ้างอิง หรืออ้างว่าได้เปิดเอกสารที่ยังไม่ได้อ่าน';
const reviewerSchema = {
  type:'object', additionalProperties:false,
  properties:{status:{type:'string',enum:['ready','needs_info']}, result:{type:'string'}},
  required:['status','result']
};

export async function executeTask({messages, teams, run, emit, signal}) {
  const context = JSON.stringify(messages);
  emit({type:'stage',team:'jeff',desk:'secretary',state:'routing',text:'เจฟกำลังอ่านโจทย์และจัดงาน'});
  const route = await run({
    prompt:context, system:identity + '\nเลือกทีมและ desk ตามทะเบียนต่อไปนี้ ถ้าคุยทั่วไปหรือถามเพิ่มให้ใช้ jeff/secretary และตอบใน message ถ้างานทำได้ให้เลือกโต๊ะผู้รับผิดชอบ ห้ามมอบการตรวจคุณภาพให้เจฟ\n' + JSON.stringify(teams),
    schema:routeSchema, signal
  });
  const team = teams.find(item => item.id === route.team);
  const desk = team?.desks.find(item => item.id === route.desk);
  if (!team || !desk || typeof route.message !== 'string') throw new Error('AI เลือกโต๊ะที่ไม่มีในทะเบียน');
  if (team.id === 'jeff') {
    emit({type:'result',team:'jeff',desk:'secretary',state:'awaiting_user',text:route.message});
    return;
  }
  emit({type:'stage',team:team.id,desk:desk.id,state:'working',text:route.message});
  const draft = await run({
    prompt:context,
    system:'คุณทำงานในบทบาท ' + desk.name + ' ของทีม ' + team.name + '\n' +
      desk.brief + '\nวิเคราะห์โจทย์และส่งผลงานที่ใช้ได้ ระบุหลักฐานที่ผู้ใช้ให้ ข้อมูลขาด และข้อจำกัด ห้ามสร้างข้อมูลหรืออ้างอิง อ่านแฟ้มต้นทางที่เข้าถึงได้จริงเท่านั้น งานที่ต้องใช้เอกสารแต่ยังไม่มี ให้ถามข้อมูลเฉพาะที่ขาด ไม่รับรองผลทางคลินิกหรือมาตรฐานแทนมนุษย์ งานวิจัยใช้ทรัพย์สินเดิมใน repo เมื่อเกี่ยวข้องและเข้าถึงได้ การเปลี่ยนบทบาทเป็นการเรียกโมเดลตามขั้นงาน ไม่ใช่บุคลากรจริง',
    signal, tools:true,
    onActivity:tool => emit({type:'activity',team:team.id,desk:desk.id,text:'กำลังใช้ ' + tool})
  });
  const leader = team.desks[0];
  emit({type:'stage',team:team.id,desk:leader.id,state:'reviewing',text:'หัวหน้าทีม ' + team.name + ' กำลังตรวจทานผลงาน'});
  const review = await run({
    prompt:JSON.stringify({conversation:messages,draft}),
    system:'คุณเป็นหัวหน้าทีม ' + team.name + ' รับผิดชอบกำกับคุณภาพ ตรวจร่างเทียบโจทย์ หลักฐานและข้อจำกัด แก้คำตอบแล้วส่งฉบับตรวจทานใน result หากข้อมูลไม่พอให้ status needs_info พร้อมถามเฉพาะข้อมูลจำเป็น หากมีผลงานพร้อมให้มนุษย์ตรวจให้ status ready ห้ามอ้างว่าทวนสอบหลักฐานภายนอกหรือประเมินอิสระหากไม่ได้ทำจริง ห้ามแต่งข้อมูลหรือเอกสารอ้างอิง ห้ามมอบการตรวจคุณภาพให้เจฟ',
    schema:reviewerSchema, signal, tools:true,
    onActivity:tool => emit({type:'activity',team:team.id,desk:leader.id,text:'หัวหน้าทีมใช้ ' + tool})
  });
  if (!['ready','needs_info'].includes(review.status) || typeof review.result !== 'string' || !review.result.trim()) {
    throw new Error('ผลตรวจทานของหัวหน้าทีมไม่ครบ');
  }
  emit({type:'result',team:team.id,desk:leader.id,
    state:review.status === 'ready' ? 'ready' : 'awaiting_user',text:review.result});
}

