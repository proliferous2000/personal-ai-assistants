import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startOffice} from '../server.mjs';
import {runClaude} from '../lib/claude.mjs';
import {executeTask} from '../lib/workflow.mjs';
import {loadTeams} from '../lib/teams.mjs';

async function fixture(t) {
  const dir=await mkdtemp(join(tmpdir(),'jeff-office-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const registryPath=join(dir,'agents.json');
  await writeFile(registryPath,JSON.stringify({agents:[
    {id:'director',role:'HA Director',responsibilities:'Review'},
    {id:'sar',role:'SAR Writer',responsibilities:'SAR'}
  ]}));
  return {dir,registryPath,teams:await loadTeams(registryPath)};
}
const conversation=[{role:'user',content:'ช่วยทบทวน SAR'}];
test('worker output goes through its own team leader before delivery',async t=>{
  const {teams}=await fixture(t);
  const events=[];
  const calls=[];
  const values=[{team:'ha',desk:'sar',message:'มอบงานโต๊ะ SAR'},'ร่างเพื่อทบทวน',{status:'ready',result:'หัวหน้าทีมตรวจแล้ว'}];
  await executeTask({messages:conversation,teams,emit:event=>events.push(event),run:async call=>{
    calls.push(call);return values.shift();
  }});
  assert.equal(calls.length,3);
  assert.equal(calls[0].tools,undefined);
  assert.equal(calls[1].tools,true);
  assert.match(calls[2].system,/หัวหน้าทีม HA/);
  assert.deepEqual(events.map(event=>[event.team,event.desk,event.state]),[
    ['jeff','secretary','routing'],['ha','sar','working'],['ha','director','reviewing'],['ha','director','ready']
  ]);
  assert.equal(events.at(-1).text,'หัวหน้าทีมตรวจแล้ว');
});
test('unknown desk cannot produce a successful assignment',async t=>{
  const {teams}=await fixture(t);
  await assert.rejects(executeTask({messages:conversation,teams,emit(){},run:async()=>({team:'ha',desk:'missing',message:'invalid'})}),/ไม่มีในทะเบียน/);
});
test('CLI runner handles structured result, model error and missing executable',async t=>{
  const {dir}=await fixture(t);
  const script=join(dir,'fake-cli.mjs');
  await writeFile(script,"process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'result',subtype:'success',structured_output:{team:'ha'},result:'ok'}));});");
  const result=await runClaude({command:process.execPath,prefix:[script],prompt:'test',system:'test',schema:{},cwd:dir});
  assert.deepEqual(result,{team:'ha'});
  await writeFile(script,"process.stdin.resume();process.stdin.on('end',()=>{console.log(JSON.stringify({type:'result',subtype:'error_during_execution',is_error:true}));});");
  await assert.rejects(runClaude({command:process.execPath,prefix:[script],prompt:'test',system:'test',cwd:dir}),/ยังไม่ส่งผลงานสำเร็จ/);
  await assert.rejects(runClaude({command:join(dir,'not-installed'),prompt:'test',system:'test',cwd:dir}),/เปิด Claude Code ไม่ได้/);
});
test('server streams and persists results, rejects cross-origin writes and serializes work',async t=>{
  const {dir,registryPath}=await fixture(t);
  let unlock;
  const gate=new Promise(resolve=>{unlock=resolve;});
  let calls=0;
  const run=async()=>{
    calls++;
    if (calls===1) {await gate;return {team:'ha',desk:'sar',message:'รับโจทย์'};}
    if (calls===2) return 'draft';
    return {status:'needs_info',result:'ขอหลักฐาน SAR เพิ่มครับ'};
  };
  const office=await startOffice({port:0,dataDir:join(dir,'data'),registryPath,run});
  t.after(()=>office.close());
  const post=(body,origin=office.url)=>fetch(office.url+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
  assert.equal((await post({message:'test'},'https://elsewhere.example')).status,403);
  assert.equal((await post({message:1})).status,400);
  const first=await post({message:'SAR'});
  const reader=first.body.getReader();
  const initial=await reader.read();
  assert.match(new TextDecoder().decode(initial.value),/routing/);
  assert.equal((await post({message:'concurrent'})).status,409);
  unlock();
  let output='';
  while (true) {const next=await reader.read();if(next.done)break;output+=new TextDecoder().decode(next.value);}
  assert.match(output,/ขอหลักฐาน SAR เพิ่มครับ/);
  const stored=JSON.parse(await readFile(join(dir,'data','office.json'),'utf8'));
  assert.equal(stored.tasks[0].state,'awaiting_user');
  assert.equal(stored.messages.at(-1).content,'ขอหลักฐาน SAR เพิ่มครับ');
  assert.equal((await fetch(office.url+'/api/state')).status,200);
  assert.equal((await fetch(office.url+'/')).status,200);
});
test('unfinished work is marked interrupted on restart',async t=>{
  const {dir,registryPath}=await fixture(t);
  const {mkdir}=await import('node:fs/promises');
  const dataDir=join(dir,'restart');
  await mkdir(dataDir);
  await writeFile(join(dataDir,'office.json'),JSON.stringify({messages:[],tasks:[{state:'reviewing',id:'old',events:[]}]}));
  const office=await startOffice({port:0,dataDir,registryPath,run:async()=>{}});
  t.after(()=>office.close());
  const state=await (await fetch(office.url+'/api/state')).json();
  assert.equal(state.tasks[0].state,'interrupted');
});
