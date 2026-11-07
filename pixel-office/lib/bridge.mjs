const states = new Set(['routing','working','reviewing','ready','awaiting_user','blocked']);
const id = /^[a-zA-Z0-9_-]{1,100}$/;

// Reports received from ChatGPT never execute a model or change the native chat context.
export function acceptBridgeEvent(input, teams, tasks, now = Date.now()) {
  if (!input || !id.test(input.taskId || '') || !id.test(input.eventId || '')) throw new Error('taskId และ eventId ไม่ถูกต้อง');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200
    || typeof input.text !== 'string' || !input.text.trim() || input.text.length > 10000) throw new Error('ชื่อหรือรายละเอียดสถานะไม่ถูกต้อง');
  const team = teams.find(t => t.id === input.team);
  if (!team?.desks.some(d => d.id === input.desk) || !states.has(input.state)) throw new Error('ทีม โต๊ะ หรือสถานะไม่มีในทะเบียน');
  let task = tasks.find(t => t.source === 'chatgpt' && t.externalId === input.taskId);
  if (task?.events.some(e => e.eventId === input.eventId)) return {duplicate:true, task};
  if (!task) {
    task = {id:'chatgpt-' + input.taskId, externalId:input.taskId, source:'chatgpt', created:now, events:[]};
    tasks.unshift(task);
  }
  const type = ['ready','awaiting_user'].includes(input.state) ? 'result' : input.state === 'blocked' ? 'error' : 'stage';
  const event = {type, taskId:task.id, eventId:input.eventId, source:'chatgpt', time:now,
    title:input.title.trim(), text:input.text.trim(), team:input.team, desk:input.desk, state:input.state};
  Object.assign(task, {title:event.title, team:event.team, desk:event.desk, state:event.state, updated:now});
  if (type === 'result') {task.result=event.text; delete task.error;}
  else if (type === 'error') task.error=event.text;
  else {delete task.result; delete task.error;}
  task.events.push(event);
  task.events=task.events.slice(-100);
  tasks.splice(100);
  return {duplicate:false, task, event};
}
