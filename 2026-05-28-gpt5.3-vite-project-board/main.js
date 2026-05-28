const KEY='pb-data-v1';
const state=JSON.parse(localStorage.getItem(KEY)??'{"users":{},"projects":{},"tasks":{}}');
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
let user=null; let currentProjectId=null;
const $=s=>document.querySelector(s);
$('#loginBtn').onclick=()=>{const u=$('#username').value.trim(); if(!u) return; user=u; state.users[u]=true; save(); init();};
function init(){ $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); $('#userBar').textContent=`Signed in as ${user}`; renderProjects(); }
$('#projectForm').onsubmit=e=>{e.preventDefault(); const name=$('#projectName').value.trim(); if(!name)return; const id=crypto.randomUUID(); state.projects[id]={id,name,owner:user}; currentProjectId=id; $('#projectName').value=''; save(); renderProjects();};
$('#projectSelect').onchange=e=>{currentProjectId=e.target.value; renderTasks();};
$('#taskForm').onsubmit=e=>{e.preventDefault(); if(!currentProjectId) return; const title=$('#taskTitle').value.trim(); if(!title) return; const id=crypto.randomUUID(); state.tasks[id]={id,projectId:currentProjectId,title,status:'todo'}; $('#taskTitle').value=''; save(); renderTasks();};
function renderProjects(){ const mine=Object.values(state.projects).filter(p=>p.owner===user); const sel=$('#projectSelect'); sel.innerHTML=mine.map(p=>`<option value='${p.id}'>${p.name}</option>`).join(''); currentProjectId=currentProjectId&&mine.find(p=>p.id===currentProjectId)?currentProjectId:mine[0]?.id??null; if(currentProjectId) sel.value=currentProjectId; renderTasks();}
function renderTasks(){ document.querySelectorAll('.lane').forEach(l=>l.innerHTML=''); if(!currentProjectId) return; Object.values(state.tasks).filter(t=>t.projectId===currentProjectId).forEach(t=>{const el=document.createElement('div'); el.className='card'; el.draggable=true; el.dataset.id=t.id; el.textContent=t.title; el.ondragstart=ev=>ev.dataTransfer.setData('text/plain',t.id); document.querySelector(`.lane[data-status="${t.status}"]`).append(el);});}
document.querySelectorAll('.lane').forEach(l=>{l.ondragover=e=>e.preventDefault(); l.ondrop=e=>{e.preventDefault(); const id=e.dataTransfer.getData('text/plain'); if(state.tasks[id]){state.tasks[id].status=l.dataset.status; save(); renderTasks();}}});
