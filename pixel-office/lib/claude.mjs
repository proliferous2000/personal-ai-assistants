import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

export function runClaude({prompt, system, schema, cwd, signal, onActivity = () => {},
  command = process.env.CLAUDE_COMMAND || 'claude', prefix = [], tools = false}) {
  return new Promise((resolve, reject) => {
    const args = [...prefix, '-p', '--output-format', 'stream-json', '--verbose',
      '--include-partial-messages', '--append-system-prompt', system,
      '--tools', tools ? 'Read,Glob,Grep' : ''];
    if (tools) args.push('--allowedTools', 'Read,Glob,Grep');
    if (schema) args.push('--json-schema', JSON.stringify(schema));
    // A configured command is a trusted executable path. Prompt text goes through stdin.
    const child = spawn(command, args, {cwd, shell:false, windowsHide:true, stdio:['pipe','pipe','pipe']});
    let result;
    let failed;
    let size = 0;
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve(value);
    };
    const stop = (message) => {
      failed = new Error(message);
      child.kill('SIGTERM');
    };
    const abort = () => stop('ยุติการทำงานตามการเชื่อมต่อ');
    const timer = setTimeout(() => {
      stop('Claude ใช้เวลานานเกิน 4 นาที');
      finish(failed);
    }, 240000);
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) abort();
    child.once('error', () => finish(new Error('เปิด Claude Code ไม่ได้ กรุณาตรวจการติดตั้งและการลงชื่อเข้าใช้')));
    child.stdin.on('error', () => {});
    child.stderr.on('data', chunk => {
      size += chunk.length;
      if (size > 2000000) stop('ข้อมูลจาก Claude มากเกินขอบเขต');
    });
    createInterface({input:child.stdout, crlfDelay:Infinity}).on('line', line => {
      size += Buffer.byteLength(line);
      if (size > 2000000) return stop('ข้อมูลจาก Claude มากเกินขอบเขต');
      try {
        const event = JSON.parse(line);
        if (event.type === 'result') result = event;
        if (event.type === 'assistant') {
          for (const part of event.message?.content || []) {
            if (part.type === 'tool_use') onActivity(part.name);
          }
        }
      } catch { /* Non-JSON diagnostics are not model results. */ }
    });
    child.once('close', code => {
      if (failed) return finish(failed);
      if (code !== 0 || !result || result.is_error || result.subtype !== 'success') {
        return finish(new Error('Claude ยังไม่ส่งผลงานสำเร็จ ตรวจการลงชื่อเข้าใช้ สิทธิ์ และข้อจำกัดการใช้งานที่เครื่องรัน'));
      }
      if (schema && !result.structured_output) return finish(new Error('Claude ส่งข้อมูลจัดเส้นทางไม่ครบ'));
      if (!schema && !result.result?.trim()) return finish(new Error('Claude ส่งคำตอบว่าง'));
      finish(null, schema ? result.structured_output : result.result);
    });
    child.stdin.end(prompt);
  });
}

export function claudeStatus({command = process.env.CLAUDE_COMMAND || 'claude', prefix = []} = {}) {
  return new Promise(resolve => {
    let out = '';
    const child = spawn(command, [...prefix, '--version'], {shell:false, windowsHide:true, timeout:8000});
    child.stdout.on('data', chunk => {out += chunk;});
    child.once('error', () => resolve({configured:false, detail:'ไม่พบคำสั่ง claude ตรวจการติดตั้งหรือกำหนด CLAUDE_COMMAND'}));
    child.once('close', code => resolve(code === 0
      ? {configured:true, detail:'พบ Claude Code ' + out.trim().slice(0, 40)}
      : {configured:false, detail:'เรียก claude --version ไม่สำเร็จ'}));
  });
}
