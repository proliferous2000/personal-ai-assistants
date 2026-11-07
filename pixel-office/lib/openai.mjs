// ตัวเชื่อม OpenAI API (Responses API) ที่มีสัญญาเดียวกับ runClaude
// ต้องใช้ API key ของ OpenAI Platform ซึ่งคิดเงินแยกจากแพ็กเกจ ChatGPT และเชื่อม Project/GPT/ความจำใน ChatGPT ไม่ได้
const toolNote = '\nโหมดนี้ไม่มีเครื่องมืออ่านไฟล์ ใช้เฉพาะข้อความที่อยู่ในบทสนทนา ถ้าต้องมีเอกสารให้ถามหาจากผู้ใช้ ห้ามอ้างว่าเปิดไฟล์แล้ว';

export function openaiStatus(env = process.env) {
  const missing = [!env.OPENAI_API_KEY && 'OPENAI_API_KEY', !env.OPENAI_MODEL && 'OPENAI_MODEL'].filter(Boolean);
  return {configured: !missing.length,
    detail: missing.length ? 'ยังไม่ได้ตั้ง ' + missing.join(' และ ') : 'ตั้งค่าแล้ว โมเดล ' + env.OPENAI_MODEL};
}

export async function runOpenAI({prompt, system, schema, signal, tools = false,
  apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL,
  baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  effort = process.env.OPENAI_REASONING_EFFORT}) {
  if (!apiKey || !model) throw new Error(openaiStatus({OPENAI_API_KEY: apiKey, OPENAI_MODEL: model}).detail + ' บนเครื่องที่รัน Office');
  // store:false ไม่ให้ OpenAI เก็บ response ไว้ฝั่งเซิร์ฟเวอร์ตามค่าปริยาย
  const body = {model, instructions: system + (tools ? toolNote : ''), input: prompt, store: false};
  if (effort) body.reasoning = {effort};
  if (schema) body.text = {format: {type: 'json_schema', name: 'jeff_output', strict: true, schema}};
  const signals = [AbortSignal.timeout(240000), signal].filter(Boolean);
  let response;
  try {
    response = await fetch(baseUrl + '/responses', {method: 'POST', signal: AbortSignal.any(signals),
      headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey}, body: JSON.stringify(body)});
  } catch (error) {
    throw new Error(signal?.aborted ? 'ยุติการทำงานตามการเชื่อมต่อ' : 'ติดต่อ OpenAI ไม่สำเร็จ ตรวจอินเทอร์เน็ตและค่า OPENAI_BASE_URL');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error('OpenAI ตอบกลับสถานะ ' + response.status + (data.error?.message ? ': ' + String(data.error.message).replaceAll(apiKey, '[redacted]').slice(0, 200) : ''));
  }
  if (data.status === 'incomplete') throw new Error('OpenAI ส่งคำตอบไม่จบ (' + (data.incomplete_details?.reason || 'ไม่ทราบสาเหตุ') + ')');
  if (data.status !== 'completed') throw new Error('OpenAI ยังไม่ส่งผลสำเร็จ');
  const parts = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []);
  if (parts.some(part => part.type === 'refusal')) throw new Error('OpenAI ปฏิเสธการตอบโจทย์นี้');
  const text = parts.filter(part => part.type === 'output_text').map(part => part.text).join('').trim();
  if (!text) throw new Error('OpenAI ส่งคำตอบว่าง');
  if (!schema) return text;
  try { return JSON.parse(text); } catch { throw new Error('OpenAI ส่งข้อมูลจัดเส้นทางไม่ครบ'); }
}
