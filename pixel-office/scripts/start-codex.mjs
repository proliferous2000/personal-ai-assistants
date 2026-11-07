import {startOffice} from '../server.mjs';
const office = await startOffice({engine:'codex'});
console.log('Office ดร.หน่อง · Codex CLI · ' + office.url);
const close = () => office.close().then(() => process.exit(0));
process.once('SIGINT', close);
process.once('SIGTERM', close);
