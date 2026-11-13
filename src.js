import './style.css';
import { createClient } from '@supabase/supabase-js';

const $=s=>document.querySelector(s);
const supabase=createClient(import.meta.env.VITE_SUPABASE_URL||'',import.meta.env.VITE_SUPABASE_ANON_KEY||'');
let session=null, profile=null, skins=[], owned=[], events=[], users=[], adminPass='', history=[], active='chat';
const baseSkin={id:'base',name:'Lapin classique',rarity:'Commun',price:0,emoji:'🐰',description:'Ton compagnon tout doux.',theme:'base'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('fr-FR');
function toast(msg){const el=$('#toast');if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800)}}
async function api(path,body={}) {
 const {data:{session:s}}=await supabase.auth.getSession();
 const r=await fetch(`/api/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...(s?{Authorization:`Bearer ${s.access_token}`}:{})},body:JSON.stringify(body)});
 const d=await r.json();if(!r.ok)throw new Error(d.error||'Une erreur est survenue.');return d;
}
function currentSkin(){return skins.find(x=>x.id===profile?.equipped_skin_id)||baseSkin}
function bunny(big=false){
 const s=currentSkin();
 return `<div class="bunny ${big?'big':''} theme-${esc(s.theme||'base')}"><span class="bunny-sparkle">✦</span><div class="ears"><i></i><i></i></div><div class="face"><i class="eye l"></i><i class="eye r"></i><i class="blush l"></i><i class="blush r"></i><i class="nose"></i><i class="mouth"></i></div><div class="body"></div><div class="skin-caption">${esc(s.name)}</div></div>`;
}
function render(){
 $('#app').innerHTML=`<header><a class="brand" href="#"><span>🐰</span> lapin<span>GPT</span></a><div class="header-right">${profile?`<span class="coins">🪙 <b>${money(profile.coins)}</b></span><span class="username">@${esc(profile.username)}</span><button id="logout" class="ghost">Déconnexion</button>`:`<button id="auth-open" class="primary">Connexion</button>`}</div></header>
 <main><section class="hero"><div><p class="eyebrow">TON COMPAGNON INTELLIGENT</p><h1>Un lapin, mille<br><em>bonnes idées.</em></h1><p>Pose tes questions. Ton lapin s’occupe du reste !</p></div><div class="hero-mascot">${bunny(true)}</div></section>
 ${profile?`<nav class="tabs">${[['chat','💬 Discussion'],['shop','✨ Boutique'],['collection','🎒 Mes skins'],['events','🎉 Événements'],['creator','🔐 Créateur']].map(([id,t])=>`<button class="tab ${active===id?'active':''}" data-tab="${id}">${t}</button>`).join('')}</nav><section id="view"></section>`:`<section class="auth-prompt"><h2>Bienvenue dans le terrier !</h2><p>Connecte-toi ou crée ton compte pour discuter avec ton lapin et sauvegarder ta collection.</p><button class="primary" id="auth-open2">Créer mon compte / Connexion</button></section>`}
 <footer>Lapin GPT · Un compagnon plein d’idées 🥕</footer></main><div id="toast"></div><dialog id="auth-dialog"><form id="auth-form" class="auth-card"><button type="button" class="close" id="auth-close">×</button><p class="eyebrow">REJOINS LE TERRIER</p><h2 id="auth-title">Créer un compte</h2><label>Nom d’utilisateur<input id="auth-username" maxlength="24" placeholder="Ex. Lapinou" required></label><label>Adresse e-mail<input id="auth-email" type="email" required placeholder="toi@exemple.fr"></label><label>Mot de passe<input id="auth-password" type="password" minlength="8" required placeholder="8 caractères minimum"></label><p id="auth-error" class="error"></p><button class="primary full" id="auth-submit">Créer mon compte</button><button type="button" class="link" id="auth-toggle">J’ai déjà un compte</button></form></dialog>`;
 $('#auth-open')?.addEventListener('click',openAuth);$('#auth-open2')?.addEventListener('click',openAuth);
 $('#logout')?.addEventListener('click',async()=>{await supabase.auth.signOut();session=null;profile=null;render()});
 $('#auth-close')?.addEventListener('click',()=>$('#auth-dialog').close());
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.tab;render();});
 $('#auth-toggle')?.addEventListener('click',()=>{const sign=$('#auth-title').textContent==='Créer un compte';$('#auth-title').textContent=sign?'Connexion':'Créer un compte';$('#auth-submit').textContent=sign?'Se connecter':'Créer mon compte';$('#auth-username').parentElement.hidden=sign;$('#auth-username').required=!sign;$('#auth-toggle').textContent=sign?'Créer un compte':'J’ai déjà un compte';$('#auth-error').textContent='';});
 $('#auth-form')?.addEventListener('submit',authSubmit);
 if(profile) renderTab();
}
function openAuth(){$('#auth-dialog').showModal()}
async function authSubmit(e){
 e.preventDefault();const email=$('#auth-email').value,password=$('#auth-password').value,username=$('#auth-username').value.trim(),signup=$('#auth-title').textContent==='Créer un compte';const err=$('#auth-error');err.textContent='Patiente…';
 try{
  if(signup){const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}});if(error)throw error;if(!data.session){err.textContent='Compte créé ! Vérifie ton e-mail pour confirmer ton inscription, puis connecte-toi.';return;}}
  else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
  $('#auth-dialog').close();await boot();
 }catch(x){err.textContent=x.message||'Impossible de se connecter.'}
}
async function boot(){
 const {data:{session:s}}=await supabase.auth.getSession();session=s;
 if(!session){profile=null;render();return}
 const {data:p,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();
 if(error){toast('Profil introuvable. Vérifie le SQL Supabase.');profile=null;render();return}
 profile=p;
 const [{data:sk},{data:os},{data:ev}]=await Promise.all([
  supabase.from('skins').select('*').eq('published',true).order('price'),
  supabase.from('user_skins').select('skin_id').eq('user_id',session.user.id),
  supabase.from('events').select('*').eq('published',true).order('created_at',{ascending:false})
 ]);
 skins=[baseSkin,...(sk||[]).filter(x=>x.id!=='base')];owned=(os||[]).map(x=>x.skin_id);if(!owned.includes('base'))owned.push('base');events=ev||[];
 render();
}
function renderTab(){const v=$('#view');if(!v)return;v.innerHTML=active==='chat'?chatView():active==='shop'?shopView():active==='collection'?collectionView():active==='events'?eventsView():creatorView();bindView()}
function chatView(){return `<div class="chat-layout"><div class="chat-mascot">${bunny(true)}<div class="hint">Coucou ${esc(profile.username)} ! Je suis ton lapin. 🥕</div></div><div class="chat-panel"><div class="panel-head"><div><p class="eyebrow">DISCUSSION</p><h2>Que veux-tu savoir ?</h2></div><span class="online">● En ligne</span></div><div class="messages" id="messages"><div class="msg"><span>🐰</span><div class="bubble">Coucou ! Pose-moi une question, je suis tout ouïe !</div></div></div><form id="chat-form" class="composer"><textarea id="question" rows="2" maxlength="4000" placeholder="Écris ta question ici…" required></textarea><button class="send">➤</button></form><p class="tiny">Chaque réponse réussie rapporte 5 🪙. Les pièces sont enregistrées sur ton compte.</p></div></div>`}
function card(s,shop){const has=owned.includes(s.id),equipped=profile.equipped_skin_id===s.id;return `<article class="skin-card"><div class="skin-art ${esc(s.theme||'base')}"><span class="rarity ${s.rarity==='Légendaire'?'legendary':''}">${esc(s.rarity)}</span><span class="art-bunny">${esc(s.emoji||'🐰')}</span>${s.theme==='royal'?'<span class="crown">♛</span>':''}</div><div class="skin-info"><h3>${esc(s.name)}</h3><p>${esc(s.description||'Un nouveau style pour ton lapin.')}</p><div class="card-bottom"><b>${Number(s.price)===0?'Gratuit':`🪙 ${money(s.price)}`}</b>${has?`<button data-equip="${s.id}" ${equipped?'disabled':''}>${equipped?'Équipé':'Équiper'}</button>`:shop?`<button data-buy="${s.id}">Acheter</button>`:''}</div></div></article>`}
function shopView(){return `<div class="section-head"><div><p class="eyebrow">FAIS-TOI PLAISIR</p><h2>La boutique à skins</h2><p>Échange tes pièces contre un nouveau style.</p></div><b>🪙 ${money(profile.coins)}</b></div><div class="skin-grid">${skins.map(s=>card(s,true)).join('')}</div>`}
function collectionView(){return `<div class="section-head"><div><p class="eyebrow">TA COLLECTION</p><h2>Mes skins</h2><p>Choisis le look de ton compagnon.</p></div></div><div class="skin-grid">${skins.filter(s=>owned.includes(s.id)).map(s=>card(s,false)).join('')}</div>`}
function eventsView(){return `<div class="section-head"><div><p class="eyebrow">ÇA BOUGE CHEZ LES LAPINS</p><h2>Les événements</h2><p>Les annonces du créateur, identiques pour tout le monde.</p></div></div>${events.length?events.map(e=>`<article class="event"><span>🎉 ÉVÉNEMENT</span><h3>${esc(e.title)}</h3><p>${esc(e.body)}</p></article>`).join(''):'<div class="empty">🎈<h3>Pas d’événement pour le moment</h3><p>Reviens bientôt !</p></div>'}`}
function creatorView(){return `<div class="creator"><div class="lock">🔐</div><p class="eyebrow">ESPACE PRIVÉ</p><h2>Interface créateur</h2><p>Accès réservé à l’administrateur.</p><form id="creator-login" class="login-row"><input id="creator-password" type="password" placeholder="Mot de passe créateur" required><button class="primary">Entrer</button></form><div id="creator-content"></div></div>`}
function bindView(){
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
function renderAdmin(){const c=$('#creator-content');c.innerHTML=`<div class="admin"><h3>Tableau de bord</h3><div class="admin-stats"><span>👥 ${users.length} comptes</span><span>🎨 ${skins.length} skins</span><span>🎉 ${events.length} événements</span></div><h4>Utilisateurs</h4><div class="user-list">${users.map(u=>`<div><b>${esc(u.username)}</b><small>${esc(u.email||'')}</small><span>🪙 ${money(u.coins)}</span></div>`).join('')||'Aucun utilisateur'}</div><div class="admin-grid"><form id="skin-form"><h4>Publier un skin</h4><input name="name" placeholder="Nom du skin" required maxlength="40"><input name="emoji" placeholder="Emoji (ex. 🐰)" value="🐰" required maxlength="8"><select name="rarity"><option>Commun</option><option>Légendaire</option></select><input name="price" type="number" min="0" placeholder="Prix en pièces" required><input name="description" placeholder="Description"><select name="theme"><option value="sunny">Soleil</option><option value="royal">Royal</option><option value="base">Classique</option></select><button class="primary">Publier le skin</button></form><form id="event-form"><h4>Publier un événement</h4><input name="title" placeholder="Titre de l’événement" required maxlength="100"><textarea name="body" placeholder="Description visible par tous" required maxlength="2000"></textarea><button class="primary">Publier l’événement</button></form></div><p id="admin-status" class="tiny"></p></div>`;
 $('#skin-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('creator',{password:adminPass,action:'publish-skin',skin:{name:f.get('name'),emoji:f.get('emoji'),rarity:f.get('rarity'),price:Number(f.get('price')),description:f.get('description'),theme:f.get('theme')}});toast('Skin publié !');await boot();active='creator';render();}catch(x){$('#admin-status').textContent=x.message}};
 $('#event-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('creator',{password:adminPass,action:'publish-event',title:f.get('title'),body:f.get('body')});toast('Événement publié pour tous !');await boot();active='creator';render();}catch(x){$('#admin-status').textContent=x.message}};
}
async function init(){const {data:{session:s}}=await supabase.auth.getSession();session=s;supabase.auth.onAuthStateChange(()=>setTimeout(boot,0));await boot()}
init();
