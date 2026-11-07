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

import {createServer} from 'node:http';
import {runOpenAI} from '../lib/openai.mjs';
async function fakeOpenAI(t, reply) {
  const seen = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', chunk => {body += chunk;});
    req.on('end', () => {
      seen.push({url: req.url, auth: req.headers.authorization, body: JSON.parse(body)});
      res.writeHead(reply.status || 200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(reply.json));
    });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return {seen, baseUrl: 'http://127.0.0.1:' + server.address().port};
}
const ok = text => ({json: {status: 'completed', output: [{type: 'message', content: [{type: 'output_text', text}]}]}});
test('OpenAI adapter sends strict schema with store:false and parses structured output', async t => {
  const {seen, baseUrl} = await fakeOpenAI(t, ok('{"team":"jeff","desk":"secretary","message":"สวัสดี"}'));
  const result = await runOpenAI({prompt: 'p', system: 's', schema: {type: 'object'}, apiKey: 'sk-test', model: 'm', baseUrl, effort: 'low'});
  assert.equal(result.message, 'สวัสดี');
  assert.equal(seen[0].url, '/responses');
  assert.equal(seen[0].auth, 'Bearer sk-test');
  assert.equal(seen[0].body.store, false);
  assert.equal(seen[0].body.text.format.strict, true);
  assert.equal(seen[0].body.reasoning.effort, 'low');
});
test('OpenAI adapter fails visibly on missing config, HTTP errors, refusal and bad JSON', async t => {
  await assert.rejects(runOpenAI({prompt: 'p', system: 's', apiKey: '', model: 'm'}), /OPENAI_API_KEY/);
  await assert.rejects(runOpenAI({prompt: 'p', system: 's', apiKey: 'sk-test-placeholder', model: ''}), /OPENAI_MODEL/);
  const bad = await fakeOpenAI(t, {status: 401, json: {error: {message: 'bad key'}}});
  await assert.rejects(runOpenAI({prompt: 'p', system: 's', apiKey: 'sk-test-placeholder', model: 'm', baseUrl: bad.baseUrl}), /401.*bad key/);
  const leaked = await fakeOpenAI(t, {status:401,json:{error:{message:'invalid key sk-test-placeholder'}}});
  await assert.rejects(runOpenAI({prompt:'p',system:'s',apiKey:'sk-test-placeholder',model:'m',baseUrl:leaked.baseUrl}),
    error => error.message.includes('[redacted]') && !error.message.includes('sk-test-placeholder'));
  const pending = await fakeOpenAI(t, {json:{status:'in_progress',output:[]}});
  await assert.rejects(runOpenAI({prompt:'p',system:'s',apiKey:'sk-test-placeholder',model:'m',baseUrl:pending.baseUrl}), /ยังไม่ส่งผลสำเร็จ/);
  const refusal = await fakeOpenAI(t, {json: {status: 'completed', output: [{type: 'message', content: [{type: 'refusal', refusal: 'no'}]}]}});
  await assert.rejects(runOpenAI({prompt: 'p', system: 's', apiKey: 'sk-test-placeholder', model: 'm', baseUrl: refusal.baseUrl}), /ปฏิเสธ/);
  const junk = await fakeOpenAI(t, ok('not json'));
  await assert.rejects(runOpenAI({prompt: 'p', system: 's', schema: {}, apiKey: 'sk-test-placeholder', model: 'm', baseUrl: junk.baseUrl}), /ไม่ครบ/);
});
test('health endpoint reports engine config without exposing the API key', async t => {
  const {dir, registryPath} = await fixture(t);
  const saved = {...process.env};
  Object.assign(process.env, {OPENAI_API_KEY: 'sk-secret-value', OPENAI_MODEL: 'test-model'});
  t.after(() => {delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL; Object.assign(process.env, saved);});
  const office = await startOffice({port: 0, dataDir: dir, registryPath, engine: 'openai'});
  t.after(() => office.close());
  const get = async path => (await fetch(office.url + path, {headers: {Host: office.url.replace('http://', '')}})).text();
  const health = JSON.parse(await get('/api/health'));
  assert.equal(health.engineId, 'openai');
  assert.equal(health.configured, true);
  assert.doesNotMatch(JSON.stringify(health) + await get('/api/state'), /sk-secret-value/);
  await assert.rejects(startOffice({port: 0, dataDir: dir, registryPath, engine: 'nope'}), /ENGINE/);
});
