import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, rename} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {loadTeams} from './lib/teams.mjs';
import {runClaude, claudeStatus} from './lib/claude.mjs';
import {runOpenAI, openaiStatus} from './lib/openai.mjs';
import {runCodex, codexStatus} from './lib/codex.mjs';
import {executeTask} from './lib/workflow.mjs';
import {acceptBridgeEvent} from './lib/bridge.mjs';

const root = dirname(fileURLToPath(import.meta.url));
export const engines = {
  claude:{label:'Claude Code CLI', run:runClaude, status:claudeStatus},
  codex:{label:'Codex CLI (OpenAI)', run:runCodex, status:codexStatus},
  openai:{label:'OpenAI API', run:runOpenAI, status:async () => openaiStatus()}
};
export async function startOffice({port = Number(process.env.PORT || 3100),
  dataDir = resolve(root,'data'), engine = process.env.ENGINE || 'claude', run, registryPath = resolve(root,'../ha_quality_team_v2/config/agents.json')} = {}) {
  if (!engines[engine]) throw new Error('ENGINE ต้องเป็น claude, codex หรือ openai');
  run ??= options => engines[engine].run({...options, cwd:root});
  const teams = await loadTeams(registryPath);
  await mkdir(dataDir,{recursive:true});
  const statePath = resolve(dataDir,'office.json');
  let state = {messages:[],tasks:[]};
  try {
    state = JSON.parse(await readFile(statePath,'utf8'));
    if (!Array.isArray(state.messages) || !Array.isArray(state.tasks)) throw new Error('Invalid office state');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  state.tasks.filter(task => ['routing','working','reviewing'].includes(task.state))
    .forEach(task => {task.state = 'interrupted'; task.error = 'เซิร์ฟเวอร์หยุดระหว่างทำงาน กรุณาส่งโจทย์ต่อ';});
  let saving = Promise.resolve();
  function persist() {
    const snapshot = JSON.stringify(state,null,2);
    saving = saving.catch(() => {}).then(async () => {
      await writeFile(statePath + '.tmp',snapshot,{mode:0o600});
      await rename(statePath + '.tmp',statePath);
    });
    return saving;
  }
  await persist();
  let running;
  const viewers = new Set();
  const publish = event => {
    for (const client of viewers) {
      if (!client.destroyed) client.write('data: ' + JSON.stringify(event) + '\n\n');
    }
  };
  const staticFiles = {
    '/':['public/index.html','text/html; charset=utf-8'],
    '/app.js':['public/app.js','text/javascript; charset=utf-8'],
    '/style.css':['public/style.css','text/css; charset=utf-8']
  };
  const json = (res,status,body) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  const server = createServer(async (req,res) => {
    try {
      const port = server.address().port;
      if (!['127.0.0.1:' + port,'localhost:' + port].includes(req.headers.host)) {
        return json(res,403,{error:'Office รองรับการเปิดผ่าน localhost เท่านั้น'});
      }
      const path = new URL(req.url,'http://127.0.0.1').pathname;
      if (req.method === 'GET' && path === '/api/state') {
        return json(res,200,{teams,...state,running:Boolean(running),engine:engines[engine].label,engineId:engine});
      }
      if (req.method === 'GET' && path === '/api/health') {
        // ตรวจเฉพาะการตั้งค่า ไม่เรียกโมเดล และไม่เปิดเผยคีย์ ความพร้อมจริงยืนยันได้ด้วยการส่งโจทย์สำเร็จเท่านั้น
        return json(res,200,{engine:engines[engine].label,engineId:engine,...await engines[engine].status()});
      }
      if (req.method === 'GET' && path === '/api/events') {
        if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return json(res,403,{error:'Origin ไม่ถูกต้อง'});
        res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        res.write('data: {"type":"sync"}\n\n');
        viewers.add(res);
        const keepalive=setInterval(() => res.write(': keepalive\n\n'),25000);
        res.once('close',() => {clearInterval(keepalive); viewers.delete(res);});
        return;
      }
      if (req.method === 'POST' && path === '/api/bridge/events') {
        if (req.headers.origin !== 'http://' + req.headers.host || !req.headers['content-type']?.startsWith('application/json')) {
          return json(res,403,{error:'รับสถานะผ่านหน้า Office บนเครื่องนี้เท่านั้น'});
        }
        let body='';
        req.setEncoding('utf8');
        for await (const chunk of req) {
          body+=chunk;
          if (Buffer.byteLength(body)>40000) return json(res,413,{error:'สถานะยาวเกินไป'});
        }
        let input;
        try {input=JSON.parse(body);} catch {return json(res,400,{error:'JSON ไม่ถูกต้อง'});}
        let accepted;
        try {accepted=acceptBridgeEvent(input,teams,state.tasks);} catch(error) {return json(res,400,{error:error.message});}
        await persist();
        if (!accepted.duplicate) {
          publish(accepted.event);
        }
        return json(res,200,{ok:true,duplicate:accepted.duplicate,taskId:accepted.task.id});
      }
      if (req.method === 'GET' && staticFiles[path]) {
        const [file,type] = staticFiles[path];
        res.writeHead(200,{'Content-Type':type,'Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'});
        return res.end(await readFile(resolve(root,file)));
      }
      if (req.method !== 'POST' || path !== '/api/chat') return json(res,404,{error:'Not found'});
      const ownOrigin = 'http://' + req.headers.host;
      if (req.headers.origin !== ownOrigin || !req.headers['content-type']?.startsWith('application/json')) {
        return json(res,403,{error:'กรุณาส่งงานจากหน้า Office ที่เปิดบนเครื่องนี้'});
      }
      if (running) return json(res,409,{error:'มีงานกำลังทำอยู่ กรุณารอผลก่อนส่งข้อความถัดไป'});
      let text = '';
      req.setEncoding('utf8');
      for await (const chunk of req) {
        text += chunk;
        if (Buffer.byteLength(text) > 20000) return json(res,413,{error:'ข้อความยาวเกินไป'});
      }
      let message;
      try {message = JSON.parse(text).message;} catch {return json(res,400,{error:'ข้อความไม่ถูกต้อง'});}
      if (typeof message !== 'string' || !message.trim() || message.length > 10000) {
        return json(res,400,{error:'กรุณาระบุโจทย์ภายใน 10,000 ตัวอักษร'});
      }
      // Recheck after reading the body to serialize requests arriving together.
      if (running) return json(res,409,{error:'มีงานกำลังทำอยู่'});
      const controller = new AbortController();
      running = controller;
      const task = {id:randomUUID(),title:message.trim().slice(0,100),created:Date.now(),state:'routing',team:'jeff',desk:'secretary',events:[],executionLog:[]};
      state.tasks.unshift(task);
      state.tasks = state.tasks.slice(0,100);
      state.messages.push({role:'user',content:message.trim()});
      state.messages = state.messages.slice(-40);
      try {
        await persist();
        res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store'});
        res.flushHeaders();
        const disconnect = () => {if (!res.writableEnded) controller.abort();};
        res.once('close',disconnect);
        const emit = event => {
          const update = {...event,taskId:task.id,time:Date.now()};
          task.events.push(update);
          if (event.state) Object.assign(task,{state:event.state,team:event.team,desk:event.desk});
          if (event.type === 'result') {
            task.result = event.text;
            state.messages.push({role:'assistant',content:event.text});
          }
          if (!res.destroyed) res.write(JSON.stringify(update) + '\n');
        };
        try {
          let messages = state.messages.slice(-10);
          while (JSON.stringify(messages).length > 26000 && messages.length > 1) messages.shift();
          await executeTask({messages,teams,run,emit,signal:controller.signal,onLog:async record => {
            task.executionLog.push({...record,time:Date.now()});
            await persist();
          }});
        } catch (error) {
          task.state = 'blocked';
          task.error = error.message;
          emit({type:'error',team:task.team,desk:task.desk,state:'blocked',text:error.message});
        }
        await persist();
        res.off('close',disconnect);
        res.end();
      } finally {
        running = undefined;
      }
    } catch {
      if (!res.headersSent) json(res,500,{error:'บันทึกหรือโหลดข้อมูลไม่สำเร็จ'});
      else res.end();
    }
  });
  await new Promise((resolveListen,reject) => {
    server.once('error',reject);
    server.listen(port,'127.0.0.1',resolveListen);
  });
  return {server,engine,url:'http://127.0.0.1:' + server.address().port,
    async close(){running?.abort(); for(const client of viewers) client.end(); await new Promise(done => server.close(done)); await saving;}};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const office = await startOffice();
  console.log('Office ดร.หน่อง ' + office.url);
  console.log('เครื่องมือคิด: ' + engines[office.engine].label + ' · ส่งงานได้จากช่องคุยกับเจฟ');
  const close = () => office.close().then(() => process.exit(0));
  process.once('SIGINT',close);
  process.once('SIGTERM',close);
}
