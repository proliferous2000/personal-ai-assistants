import {randomUUID, createHash} from 'node:crypto';

const assignmentSchema = {type:'object',additionalProperties:false,properties:{
  team:{type:'string'},desk:{type:'string'},reason:{type:'string'},
  messageIndexes:{type:'array',items:{type:'integer'}}
},required:['team','desk','reason','messageIndexes']};
export const routeSchema = {type:'object',additionalProperties:false,properties:{
  level:{type:'integer',enum:[1,2,3]},team:{type:'string'},desk:{type:'string'},message:{type:'string'},
  supports:{type:'array',items:assignmentSchema,maxItems:3}
},required:['level','team','desk','message','supports']};
const reviewSchema={type:'object',additionalProperties:false,properties:{
  status:{type:'string',enum:['ready','needs_info']},result:{type:'string'},
  evidenceChecks:{type:'array',items:{type:'string'}},limitations:{type:'array',items:{type:'string'}},
  decisions:{type:'array',items:{type:'string'}}
},required:['status','result','evidenceChecks','limitations','decisions']};
const guard='ใช้ข้อมูลที่ได้รับหรือหลักฐานที่เครื่องมืออ่านได้จริงเท่านั้น ห้ามสร้างข้อเท็จจริงหรืออ้างว่าตรวจหลักฐานภายนอกแล้ว แยกหลักฐาน สมมติฐาน และข้อมูลขาด การรับรองนี้เป็นผลตรวจของ AI เพื่อให้มนุษย์พิจารณา ไม่ใช่การรับรองทางคลินิกหรือจริยธรรม';
export function validateRoute(route,teams) {
  const team=teams.find(t=>t.id===route?.team);
  const desk=team?.desks.find(d=>d.id===route?.desk);
  if(!team||!desk) throw Error('AI เลือกโต๊ะที่ไม่มีในทะเบียน');
  if(![1,2,3].includes(route.level)||typeof route.message!=='string'||!route.message.trim()||!Array.isArray(route.supports)) throw Error('แผนจัดงานไม่ครบ');
  if(route.level===1 ? team.id!=='jeff'||route.supports.length : team.id==='jeff'||desk.id!==team.desks[0].id) throw Error('ต้องเลือกหัวหน้าทีมเฉพาะทางตามระดับงาน');
  if(route.supports.length>(route.level===1?0:route.level===2?1:3)) throw Error('จำนวนผู้สนับสนุนเกินขอบเขต');
  const selected=new Set([team.id+'/'+desk.id]);
  for(const a of route.supports){
    const t=teams.find(t=>t.id===a.team), d=t?.desks.find(d=>d.id===a.desk),key=a.team+'/'+a.desk;
    if(!d||a.team==='jeff'||selected.has(key)||typeof a.reason!=='string'||!a.reason.trim()||!Array.isArray(a.messageIndexes)) throw Error('ผู้สนับสนุนไม่ถูกต้องหรือไม่มีเหตุผล');
    selected.add(key);
  }
  return team;
}
export async function executeTask({messages,teams,run,emit,signal,onLog=()=>{},maxCalls=7}) {
  let count=0;
  async function call(team,desk,phase,options){
    signal?.throwIfAborted();
    if(++count>maxCalls)throw Error('เกินงบจำนวนการเรียกโมเดล');
    const record={id:randomUUID(),team,desk,phase,status:'started',started:new Date().toISOString(),usage:null,cost:null,
      inputHash:createHash('sha256').update(options.prompt).digest('hex'),inputCharacters:options.prompt.length};
    await onLog({...record});
    let usage=null;
    try{
      const result=await run({...options,signal,tools:options.tools ?? false,onUsage:value=>{usage=value;}});
      signal?.throwIfAborted();
      await onLog({...record,status:'completed',finished:new Date().toISOString(),usage,output:result});
      return result;
    }catch(error){await onLog({...record,status:'failed',finished:new Date().toISOString(),usage,error:error.message});throw error;}
  }
  emit({type:'stage',team:'jeff',desk:'secretary',state:'routing',text:'เจฟกำลังจัดเส้นทางงาน'});
  const context=JSON.stringify(messages);
  const route=await call('jeff','secretary','route',{prompt:context,schema:routeSchema,system:
    'คุณคือ JEFF เลขากลาง เลือกจากทะเบียนจริงเท่านั้น ระดับ 1 งานทั่วไปให้ตอบเอง ระดับ 2 หัวหน้าทีมหนึ่งทีมและผู้สนับสนุนไม่เกินหนึ่งเมื่อจำเป็น ระดับ 3 งาน Service Plan SAR RCA วิจัยหรือระบบองค์กรที่ซับซ้อน ใช้หัวหน้าทีมหลักหนึ่งและสนับสนุนไม่เกินสาม ห้ามเรียกทุกตัว เลือก desk แรกของทีมเป็นหัวหน้าทีม สนับสนุนแต่ละตัวระบุเหตุผลและดัชนีข้อความที่เกี่ยวข้อง (เริ่ม 0) ไม่ส่งบริบทเกินจำเป็น JEFF ห้ามตรวจรับเนื้อหา ทะเบียน: '+JSON.stringify(teams)+'\n'+guard});
  const team=validateRoute(route,teams),leader=team.desks[0];
  for(const a of route.supports)if(a.messageIndexes.some(i=>!Number.isInteger(i)||i<0||i>=messages.length))throw Error('ดัชนีบริบทไม่ถูกต้อง');
  await onLog({phase:'selection',status:'planned',level:route.level,leader:team.id+'/'+leader.id,reason:route.message,selected:route.supports});
  if(route.level===1){emit({type:'result',team:'jeff',desk:'secretary',state:'awaiting_user',text:route.message});return;}
  emit({type:'stage',team:team.id,desk:leader.id,state:'working',text:route.message});
  const draft=await call(team.id,leader.id,'draft',{tools:true,prompt:context,system:'คุณเป็นหัวหน้าทีม '+team.name+' รับผิดชอบวิเคราะห์และร่างผลงานตามบทบาท '+leader.brief+'\n'+guard});
  // Only independent support assignments run concurrently; leader review waits for all results.
  const outcomes=await Promise.allSettled(route.supports.map(async a=>{
    const t=teams.find(t=>t.id===a.team),d=t.desks.find(d=>d.id===a.desk);
    emit({type:'stage',team:t.id,desk:d.id,state:'working',text:a.reason});
    return {agent:t.id+'/'+d.id,result:await call(t.id,d.id,'support',{prompt:JSON.stringify({assignment:a.reason,messages:a.messageIndexes.map(i=>messages[i])}),system:'บทบาท '+d.name+' '+d.brief+' ตรวจหลักฐาน ความถูกต้อง ความสอดคล้องและข้อจำกัดตามโจทย์เฉพาะ ห้ามเพียงกล่าวเห็นด้วย\n'+guard})};
  }));
  const failed=outcomes.find(r=>r.status==='rejected');if(failed)throw failed.reason;
  emit({type:'stage',team:team.id,desk:leader.id,state:'reviewing',text:'หัวหน้าทีมกำลังตรวจหลักฐานและสังเคราะห์ผล'});
  const review=await call(team.id,leader.id,'review',{tools:true,prompt:JSON.stringify({messages,draft,supports:outcomes.map(r=>r.value)}),schema:reviewSchema,
    system:'คุณเป็นหัวหน้าทีม '+team.name+' ตรวจรับผลงาน รับผิดชอบผลสุดท้าย เทียบข้ออ้างกับหลักฐานที่ให้ ระบุ evidenceChecks ข้อจำกัด limitations และเหตุผลตัดสินข้อขัดแย้ง decisions แก้ข้อผิดพลาดใน result หากหลักฐานขาดให้ needs_info ห้ามส่งเจฟตรวจคุณภาพ\n'+guard});
  if(!['ready','needs_info'].includes(review?.status)||typeof review.result!=='string'||!review.result.trim()||!['evidenceChecks','limitations','decisions'].every(k=>Array.isArray(review[k])&&review[k].every(v=>typeof v==='string'&&v.trim().length>0))||!review.evidenceChecks.length)throw Error('ผลตรวจทานของหัวหน้าทีมไม่ครบ');
  await onLog({phase:'acceptance',team:team.id,desk:leader.id,status:review.status,...review});
  emit({type:'result',team:team.id,desk:leader.id,state:review.status==='ready'?'ready':'awaiting_user',text:review.result});
}
