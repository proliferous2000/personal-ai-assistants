// ตัวเชื่อม Codex CLI ของ OpenAI สัญญาเดียวกับ runClaude ใช้ได้กับการล็อกอินด้วยบัญชี ChatGPT (codex login)
// รันแบบ read-only และรับโจทย์ทาง stdin ผลสุดท้ายอ่านจากไฟล์ที่ -o เขียนให้ ไม่พึ่งรูปแบบ event ของ --json
import {spawn} from 'node:child_process';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {existsSync} from 'node:fs';
import {dirname, isAbsolute} from 'node:path';

const command0 = () => process.env.CODEX_COMMAND || 'codex';

// npm installs a .cmd wrapper on Windows; spawn(shell:false) needs the JS entry instead.
export function codexInvocation(command, prefix = [], {platform = process.platform, searchPath = process.env.PATH || ''} = {}) {
  if (platform !== 'win32' || prefix.length || !/codex(?:\.cmd)?$/i.test(command)) return {command, prefix};
  const dirs = isAbsolute(command) || /[\\/]/.test(command)
    ? [dirname(command)] : searchPath.split(';').filter(Boolean);
  for (const dir of dirs) {
    const native = join(dir, 'codex.exe');
    if (existsSync(native)) return {command:native, prefix:[]};
    const entry = join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (existsSync(entry)) return {command:process.execPath, prefix:[entry]};
  }
  return {command, prefix};
}

function capture(command, args) {
  return new Promise(resolve => {
    const child = spawn(command, args, {shell: false, windowsHide: true, timeout: 8000});
    let out = '';
    child.stdout.on('data', chunk => {out += chunk;});
    child.stderr.on('data', chunk => {out += chunk;});
    child.once('error', () => resolve({code: -1, out}));
    child.once('close', code => resolve({code, out}));
  });
}

export async function codexStatus({command = command0(), prefix = []} = {}) {
  ({command, prefix} = codexInvocation(command, prefix));
  const version = await capture(command, [...prefix, '--version']);
  if (version.code !== 0) return {configured: false, detail: 'ไม่พบคำสั่ง codex ติดตั้งแล้วหรือยัง หรือกำหนด CODEX_COMMAND'};
  const login = await capture(command, [...prefix, 'login', 'status']);
  return login.code === 0
    ? {configured: true, detail: 'พบ ' + version.out.trim().slice(0, 40) + ' และล็อกอินแล้ว'}
    : {configured: false, detail: 'พบ Codex แต่ยังไม่ได้ล็อกอิน รัน codex login ก่อน'};
}

export async function runCodex({prompt, system, schema, cwd, signal, onActivity = () => {},
  command = command0(), prefix = [], model = process.env.CODEX_MODEL}) {
  if (signal?.aborted) throw new Error('ยุติการทำงานตามการเชื่อมต่อ');
  ({command, prefix} = codexInvocation(command, prefix));
  const dir = await mkdtemp(join(tmpdir(), 'jeff-codex-'));
  try {
    const outFile = join(dir, 'final.txt');
    const args = [...prefix, 'exec', '--json', '--sandbox', 'read-only', '--skip-git-repo-check', '-o', outFile];
    if (model) args.push('-m', model);
    if (schema) {
      const schemaFile = join(dir, 'schema.json');
      await writeFile(schemaFile, JSON.stringify(schema));
      args.push('--output-schema', schemaFile);
    }
    args.push('-');
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, {cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
      let failed, size = 0, settled = false;
      const finish = error => {
        if (settled) return;
        settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
        error ? reject(error) : resolve();
      };
      const stop = message => {failed = new Error(message); child.kill('SIGTERM');};
      const abort = () => stop('ยุติการทำงานตามการเชื่อมต่อ');
      const timer = setTimeout(() => {stop('Codex ใช้เวลานานเกิน 4 นาที'); finish(failed);}, 240000);
      signal?.addEventListener('abort', abort, {once: true});
      if (signal?.aborted) abort();
      child.once('error', () => finish(new Error('เปิด Codex CLI ไม่ได้ กรุณาตรวจการติดตั้งและการล็อกอิน (codex login)')));
      child.stdin.on('error', () => {});
      child.stderr.on('data', chunk => {size += chunk.length; if (size > 2000000) stop('ข้อมูลจาก Codex มากเกินขอบเขต');});
      createInterface({input: child.stdout, crlfDelay: Infinity}).on('line', line => {
        size += Buffer.byteLength(line);
        if (size > 2000000) return stop('ข้อมูลจาก Codex มากเกินขอบเขต');
        try {
          const event = JSON.parse(line);
          // แสดงกิจกรรมแบบพยายามอ่าน ถ้ารูปแบบ event เปลี่ยนจะไม่กระทบผลงาน
          if (event.type === 'item.started' && event.item?.type) onActivity(event.item.type);
        } catch { /* ไม่ใช่ JSON event */ }
      });
      child.once('close', code => failed ? finish(failed) : code === 0 ? finish()
        : finish(new Error('Codex ยังไม่ส่งผลงานสำเร็จ ตรวจการล็อกอิน (codex login) สิทธิ์ และโควตาที่เครื่องรัน')));
      // Codex ไม่มีช่อง system prompt แยกที่ตรวจสอบแล้ว จึงนำคำสั่งบทบาทมาไว้หน้าโจทย์
      child.stdin.end(system + '\n\n=== โจทย์และบริบทสนทนา ===\n' + prompt);
    });
    const text = (await readFile(outFile, 'utf8').catch(() => '')).trim();
    if (!text) throw new Error('Codex ส่งคำตอบว่าง');
    if (!schema) return text;
    try { return JSON.parse(text); } catch { throw new Error('Codex ส่งข้อมูลจัดเส้นทางไม่ครบ'); }
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}
