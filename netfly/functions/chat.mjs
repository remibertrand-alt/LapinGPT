 $('#chat-form')?.addEventListener('submit',sendChat);
 document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.buy));
 document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>equip(b.dataset.equip));
 $('#creator-login')?.addEventListener('submit',creatorLogin);
}
function addMessage(content,who){const row=document.createElement('div');row.className='msg '+(who==='user'?'mine':'');if(who==='assistant'){const m=document.createElement('span');m.textContent='🐰';row.append(m)}const b=document.createElement('div');b.className='bubble';b.textContent=content;row.append(b);$('#messages').append(row);$('#messages').scrollTop=$('#messages').scrollHeight}
async function sendChat(e){e.preventDefault();const input=$('#question'),message=input.value.trim();if(!message)return;addMessage(message,'user');input.value='';const wait=document.createElement('div');wait.id='waiting';wait.className='msg';wait.innerHTML='<span>🐰</span><div class="bubble">Je réfléchis…</div>';$('#messages').append(wait);
 try{const d=await api('chat',{message,history:history.slice(-8)});$('#waiting')?.remove();addMessage(d.reply,'assistant');history.push({role:'user',content:message},{role:'assistant',content:d.reply});await boot();}catch(x){$('#waiting')?.remove();addMessage(x.message,'assistant')}}
async function buy(id){try{const d=await api('game',{action:'buy',skinId:id});toast(d.message);await boot()}catch(e){toast(e.message)}}
async function equip(id){try{await api('game',{action:'equip',skinId:id});await boot();}catch(e){toast(e.message)}}
async function creatorLogin(e){e.preventDefault();const pass=$('#creator-password').value;const c=$('#creator-content');c.textContent='Connexion…';
 try{adminPass=pass;const d=await api('creator',{password:pass,action:'dashboard'});users=d.users||[];renderAdmin();}catch(x){c.textContent=x.message}}
function renderAdmin(){const c=$('#creator-content');c.innerHTML=`<div class="admin"><h3>Tableau de bord</h3><div class="admin-stats"><span>👥 ${users.length
