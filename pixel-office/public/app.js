const $ = selector => document.querySelector(selector);
const labels = {routing:'เจฟกำลังจัดงาน',working:'กำลังทำงาน',reviewing:'หัวหน้าทีมตรวจทาน',ready:'พร้อมให้คุณหน่องตรวจ',awaiting_user:'รอคุณหน่องตอบ',blocked:'ติดขัด',interrupted:'หยุดกลางงาน'};
let teams = [];
let tasks = [];
let busy = false;
let selected;
const stations = new Map();
let activity = {team:'jeff',desk:'secretary'};
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const time = new Intl.DateTimeFormat('th-TH',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Bangkok'});
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function message(role, content, type) {
  const node = el('p','message ' + (type || role));
  node.append(el('small','',role === 'user' ? 'คุณหน่อง' : type === 'stage' ? 'เส้นทางงาน' : 'เจฟ รายงานผล'),document.createTextNode(content));
  $('#messages').append(node);
  $('#messages').scrollTop = $('#messages').scrollHeight;
}
function drawCharacter(canvas, color, moving = false, phase = 0) {
  const ctx = canvas.getContext('2d');
  const box = (x,y,w,h,tone) => {ctx.fillStyle=tone;ctx.fillRect(x,y,w,h);};
  ctx.clearRect(0,0,82,70);
  box(2,59,78,7,'#292333');
  box(29,15,22,12,'#302b42');
  box(26,21,27,21,'#e6b397');
  box(26,18,27,8,'#342d41');
  box(25,22,5,11,'#342d41');
  box(32,28,3,3,'#3c3143');
  box(44,28,3,3,'#3c3143');
  box(35,36,9,2,'#bc776c');
  box(25,41,30,20,color);
  box(36,38,10,9,'#e6b397');
  box(52,43,22,18,'#25283d');
  box(55,46,16,10,moving ? '#8fdabd' : '#526b83');
  box(10,58,63,5,'#cd996b');
  box(9,63,66,5,'#7c5144');
  box(19,49 + (moving ? phase : 0),15,5,'#e6b397');
  if (moving) box(57,48,10,2,'#e6ffdc');
}
function showDesk(team, desk) {
  const box = $('#desk-info');
  box.replaceChildren(el('h2','',desk.name),el('p','',team.name + ' · ชั้น ' + team.floor + ' · ' + desk.brief));
}
function build() {
  $('#floors').replaceChildren();
  stations.clear();
  [...teams].reverse().forEach(team => {
    const floor = el('section','floor');
    floor.style.setProperty('--tone',team.color);
    floor.setAttribute('aria-label','ชั้น ' + team.floor + ' ' + team.name);
    const shaft = el('div','shaft');
    shaft.setAttribute('aria-hidden','true');
    shaft.append(el('span','lift-character','JEFF'));
    const sign = el('div','floor-sign');
    sign.append(el('strong','',team.floor + 'F'),el('span','',team.short));
    const rooms = el('div','rooms');
    rooms.setAttribute('aria-label','โต๊ะในทีม ' + team.name);
    team.desks.forEach((desk,index) => {
      const button = el('button','desk' + (index === 0 && team.id !== 'jeff' ? ' leader' : ''));
      button.type = 'button';
      button.setAttribute('aria-label',desk.name + ' ชั้น ' + team.floor);
      const canvas = el('canvas');
      canvas.width=82;canvas.height=70;
      canvas.setAttribute('aria-hidden','true');
      button.append(canvas,el('span','name',desk.name));
      button.onclick = () => showDesk(team,desk);
      rooms.append(button);
      stations.set(team.id + '/' + desk.id,{button,canvas,color:team.color,floor});
      drawCharacter(canvas,team.color);
    });
    floor.append(shaft,sign,rooms);
    $('#floors').append(floor);
  });
}
function setActive(teamId,deskId) {
  activity = {team:teamId,desk:deskId};
  stations.forEach((station,key) => {
    const active = key === teamId + '/' + deskId;
    station.button.classList.toggle('active',active);
    station.floor.classList.toggle('active',key.startsWith(teamId + '/'));
    drawCharacter(station.canvas,station.color,active && busy);
    if (active) {
      const rooms = station.button.parentElement;
      // Reveal the receiving desk within its floor without moving the chat viewport.
      const left = station.button.offsetLeft - rooms.offsetLeft;
      if (left < rooms.scrollLeft || left + station.button.offsetWidth > rooms.scrollLeft + rooms.clientWidth) {
        rooms.scrollTo({left:Math.max(0,left - 20),behavior:reduced ? 'instant' : 'smooth'});
      }
    }
  });
}
let animation;
function animate(now) {
  const station = stations.get(activity.team + '/' + activity.desk);
  if (station) drawCharacter(station.canvas,station.color,true,Math.floor(now / 180) % 2 ? 2 : 0);
  if (busy && !reduced) animation=requestAnimationFrame(animate);
}
function busyState(value) {
  busy = value;
  document.body.classList.toggle('busy',value);
  $('#send').disabled = value;
  cancelAnimationFrame(animation);
  if (value && !reduced) animation=requestAnimationFrame(animate);
  if (!value) stations.forEach(station => drawCharacter(station.canvas,station.color));
}
function renderTasks() {
  $('#task-count').textContent = tasks.length;
  $('#tasks').replaceChildren();
  for (const task of tasks) {
    const button = el('button','',task.title);
    button.type='button';
    button.append(el('small','',labels[task.state] || task.state));
    button.onclick = () => {
      selected = task.id;
      showTask(task);
      $('#task-dialog').showModal();
    };
    $('#tasks').append(button);
  }
  if (!tasks.length) $('#tasks').append(el('p','','ยังไม่มีงาน เริ่มคุยกับเจฟได้เลยครับ'));
}
function showTask(task) {
  $('#task-heading').textContent=task.title;
  $('#task-state').textContent=labels[task.state] || task.state;
  $('#task-events').replaceChildren();
  for (const event of task.events || []) {
    const team=teams.find(team=>team.id===event.team);
    const desk=team?.desks.find(desk=>desk.id===event.desk);
    const info=[time.format(event.time),team?.name,desk?.name,event.text].filter(Boolean).join(' · ');
    $('#task-events').append(el('li','',info));
  }
  $('#task-result').textContent=task.result || task.error || 'ยังไม่มีผลงานกลับมา';
}
function applyEvent(event) {
  let task=tasks.find(task=>task.id===event.taskId);
  if (!task) {
    task={id:event.taskId,title:$('#message').dataset.lastTitle || 'งานใหม่',events:[]};
    tasks.unshift(task);
  }
  task.events.push(event);
  Object.assign(task,{state:event.state || task.state,team:event.team,desk:event.desk});
  if (event.type==='result') task.result=event.text;
  if (event.type==='error') task.error=event.text;
  $('#activity').textContent=event.text;
  setActive(event.team,event.desk);
  if (event.type==='stage') message('assistant',event.text,'stage');
  if (event.type==='result' || event.type==='error') message('assistant',event.text);
  renderTasks();
  if ($('#task-dialog').open && selected===task.id) showTask(task);
}
async function load() {
  const response=await fetch('/api/state');
  if (!response.ok) throw new Error('เปิดข้อมูล Office ไม่สำเร็จ');
  const state=await response.json();
  teams=state.teams;tasks=state.tasks;
  build();renderTasks();busyState(state.running);
  $('#messages').replaceChildren();
  if (!state.messages.length) message('assistant','ครับคุณหน่อง เจฟพร้อมรับโจทย์ครับ ผมจะประสานงานและรายงานผลจากหัวหน้าทีมให้');
  state.messages.forEach(item=>message(item.role,item.content));
  $('#connection').textContent='Office เชื่อมต่อแล้ว · Claude Code บนเครื่อง';
}
$('#close-dialog').onclick=()=>$('#task-dialog').close();
$('#message').onkeydown=event=>{
  if (event.key==='Enter' && !event.shiftKey && !event.isComposing && event.keyCode!==229) {
    event.preventDefault();
    if ($('#message').value.trim() && !busy) $('#chat-form').requestSubmit();
  }
};
$('#chat-form').onsubmit=async event=>{
  event.preventDefault();
  const text=$('#message').value.trim();
  if (!text || busy) return;
  $('#message').dataset.lastTitle=text.slice(0,100);
  $('#message').value='';
  message('user',text);
  busyState(true);
  let finished=false;
  try {
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text})});
    if (!response.ok) throw new Error((await response.json()).error);
    const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
    let pending='';
    try {
      while (true) {
        const {done,value}=await reader.read();
        if (done) break;
        pending+=value;
        const lines=pending.split('\n');
        pending=lines.pop();
        for (const line of lines.filter(Boolean)) {
          const update=JSON.parse(line);
          applyEvent(update);
          finished ||= update.type==='result' || update.type==='error';
        }
      }
      if (!finished) throw new Error('การเชื่อมต่อสิ้นสุดก่อนส่งผลงานครบ เปิดหน้าใหม่เพื่อตรวจสถานะ');
    } finally {reader.releaseLock();}
  } catch (error) {
    message('assistant',error.message || 'ติดต่อ Office ไม่สำเร็จ');
    $('#message').value ||= text;
  } finally {
    busyState(false);
    $('#message').focus();
  }
};
load().catch(error=>{
  $('#connection').textContent='Office เชื่อมต่อไม่ได้';
  message('assistant',error.message);
  $('#send').disabled=true;
});
