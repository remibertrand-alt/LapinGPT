
import './style.css';
import { createClient } from '@supabase/supabase-js';

const $ = s => document.querySelector(s);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let session = null;
let profile = null;
let skins = [];
let owned = [];
let events = [];
let users = [];
let adminPass = '';
let history = [];
let active = 'chat';

const baseSkin = {
  id: 'base',
  name: 'Lapin classique',
  rarity: 'Commun',
  price: 0,
  emoji: '🐰',
  description: 'Ton compagnon tout doux.',
  theme: 'base'
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const money = n => Number(n || 0).toLocaleString('fr-FR');

function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

async function api(path, body = {}) {
  let auth;

  try {
    auth = await supabase.auth.getSession();
  } catch (error) {
    throw new Error('Erreur de session Supabase : ' + error.message);
  }

  if (auth.error) {
    throw new Error('Session Supabase : ' + auth.error.message);
  }

  const token = auth.data?.session?.access_token;

  let response;

  try {
    response = await fetch(`/.netlify/functions/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error('Impossible de joindre Netlify : ' + error.message);
  }

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `Réponse Netlify non JSON (HTTP ${response.status}) : ${raw.slice(0, 250)}`
    );
  }

  if (!response.ok) {
    throw new Error(data.error || `Erreur serveur HTTP ${response.status}`);
  }

  return data;
}

function currentSkin() {
  return skins.find(x => x.id === profile?.equipped_skin_id) || baseSkin;
}

function bunny(big = false) {
  const s = currentSkin();

  return `
    <div class="bunny ${big ? 'big' : ''} theme-${esc(s.theme || 'base')}">
      <span class="bunny-sparkle">✦</span>
      <div class="ears"><i></i><i></i></div>
      <div class="face">
        <i class="eye l"></i>
        <i class="eye r"></i>
        <i class="blush l"></i>
        <i class="blush r"></i>
        <i class="nose"></i>
        <i class="mouth"></i>
      </div>
      <div class="body"></div>
      <div class="skin-caption">${esc(s.name)}</div>
    </div>
  `;
}

function render() {
  const app = $('#app');
  if (!app) return;

  app.innerHTML = `
    <header>
      <a class="brand" href="#">
        <span>🐰</span> lapin<span>GPT</span>
      </a>

      <div class="header-right">
        ${profile ? `
          <span class="coins">🪙 <b>${money(profile.coins)}</b></span>
          <span class="username">@${esc(profile.username)}</span>
          <button id="logout" class="ghost">Déconnexion</button>
        ` : `
          <button id="auth-open" class="primary">Connexion</button>
        `}
      </div>
    </header>

    <main>
      <section class="hero">
        <div>
          <p class="eyebrow">TON COMPAGNON INTELLIGENT</p>
          <h1>Un lapin, mille<br><em>bonnes idées.</em></h1>
          <p>Pose tes questions. Ton lapin s’occupe du reste !</p>
        </div>
        <div class="hero-mascot">${bunny(true)}</div>
      </section>

      ${profile ? `
        <nav class="tabs">
          ${[
            ['chat', '💬 Discussion'],
            ['shop', '✨ Boutique'],
            ['collection', '🎒 Mes skins'],
            ['events', '🎉 Événements'],
            ['creator', '🔐 Créateur']
          ].map(([id, title]) => `
            <button class="tab ${active === id ? 'active' : ''}" data-tab="${id}">
              ${title}
            </button>
          `).join('')}
        </nav>
        <section id="view"></section>
      ` : `
        <section class="auth-prompt">
          <h2>Bienvenue dans le terrier !</h2>
          <p>
            Connecte-toi ou crée ton compte pour discuter avec ton lapin
            et sauvegarder ta collection.
          </p>
          <button class="primary" id="auth-open2">
            Créer mon compte / Connexion
          </button>
        </section>
      `}

      <footer>Lapin GPT · Un compagnon plein d’idées 🥕</footer>
    </main>

    <div id="toast"></div>

    <dialog id="auth-dialog">
      <form id="auth-form" class="auth-card">
        <button type="button" class="close" id="auth-close">×</button>
        <p class="eyebrow">REJOINS LE TERRIER</p>
        <h2 id="auth-title">Créer un compte</h2>

        <label>
          Nom d’utilisateur
          <input id="auth-username" maxlength="24" placeholder="Ex. Lapinou" required>
        </label>

        <label>
          Adresse e-mail
          <input id="auth-email" type="email" required placeholder="toi@exemple.fr">
        </label>

        <label>
          Mot de passe
          <input id="auth-password" type="password" minlength="8" required placeholder="8 caractères minimum">
        </label>

        <p id="auth-error" class="error"></p>

        <button class="primary full" id="auth-submit">Créer mon compte</button>

        <button type="button" class="link" id="auth-toggle">
          J’ai déjà un compte
        </button>
      </form>
    </dialog>
  `;

  $('#auth-open')?.addEventListener('click', openAuth);
  $('#auth-open2')?.addEventListener('click', openAuth);

  $('#logout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    session = null;
    profile = null;
    history = [];
    render();
  });

  $('#auth-close')?.addEventListener('click', () => {
    $('#auth-dialog').close();
  });

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.onclick = () => {
      active = button.dataset.tab;
      render();
    };
  });

  $('#auth-toggle')?.addEventListener('click', () => {
    const signup = $('#auth-title').textContent === 'Créer un compte';

    $('#auth-title').textContent = signup ? 'Connexion' : 'Créer un compte';
    $('#auth-submit').textContent = signup ? 'Se connecter' : 'Créer mon compte';

    $('#auth-username').parentElement.hidden = signup;
    $('#auth-username').required = !signup;

    $('#auth-toggle').textContent = signup
      ? 'Créer un compte'
      : 'J’ai déjà un compte';

    $('#auth-error').textContent = '';
  });

  $('#auth-form')?.addEventListener('submit', authSubmit);

  if (profile) renderTab();
}

function openAuth() {
  $('#auth-dialog')?.showModal();
}

async function authSubmit(e) {
  e.preventDefault();

  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const username = $('#auth-username').value.trim();

  const signup = $('#auth-title').textContent === 'Créer un compte';
  const errorElement = $('#auth-error');
  const submit = $('#auth-submit');

  errorElement.textContent = 'Patiente…';
  submit.disabled = true;

  try {
    if (signup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });

      if (error) throw error;

      if (!data.session) {
        errorElement.textContent =
          'Le compte a été créé, mais Supabase demande encore une confirmation e-mail. Vérifie le réglage de confirmation des e-mails dans Supabase.';
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    }

    $('#auth-dialog').close();
    await boot();

  } catch (error) {
    errorElement.textContent = error.message || 'Impossible de se connecter.';
  } finally {
    submit.disabled = false;
  }
}

async function boot() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    session = data.session;

    if (!session) {
      profile = null;
      render();
      return;
    }

    const { data: p, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) throw profileError;

    profile = p;

    const [
      { data: skinData, error: skinError },
      { data: ownedData, error: ownedError },
      { data: eventData, error: eventError }
    ] = await Promise.all([
      supabase.from('skins').select('*').order('price'),
      supabase.from('user_skins').select('skin_id').eq('user_id', session.user.id),
      supabase.from('events').select('*').order('created_at', { ascending: false })
    ]);

    if (skinError) throw skinError;
    if (ownedError) throw ownedError;
    if (eventError) throw eventError;

    skins = [
      baseSkin,
      ...(skinData || []).filter(s => {
        return s.id !== 'base' && (s.published === true || s.is_active === true);
      })
    ];

    owned = (ownedData || []).map(x => x.skin_id);

    if (!owned.includes('base')) owned.push('base');

    events = (eventData || []).filter(e => {
      return e.published === true || e.is_active === true;
    });

    render();

  } catch (error) {
    console.error('Erreur de chargement Lapin GPT :', error);
    toast(error.message || 'Erreur de chargement.');
    profile = null;
    render();
  }
}

function renderTab() {
  const view = $('#view');
  if (!view) return;

  view.innerHTML =
    active === 'chat' ? chatView() :
    active === 'shop' ? shopView() :
    active === 'collection' ? collectionView() :
    active === 'events' ? eventsView() :
    creatorView();

  bindView();
}

function chatView() {
  return `
    <div class="chat-layout">
      <div class="chat-mascot">
        ${bunny(true)}
        <div class="hint">
          Coucou ${esc(profile.username)} ! Je suis ton lapin. 🥕
        </div>
      </div>

      <div class="chat-panel">
        <div class="panel-head">
          <div>
            <p class="eyebrow">DISCUSSION</p>
            <h2>Que veux-tu savoir ?</h2>
          </div>
          <span class="online">● En ligne</span>
        </div>

        <div class="messages" id="messages">
          <div class="msg">
            <span>🐰</span>
            <div class="bubble">
              Coucou ! Pose-moi une question, je suis tout ouïe !
            </div>
          </div>
        </div>

        <form id="chat-form" class="composer">
          <textarea id="question" rows="2" maxlength="4000"
            placeholder="Écris ta question ici…" required></textarea>
          <button class="send">➤</button>
        </form>

        <p class="tiny">
          Chaque réponse réussie rapporte 5 🪙.
          Les pièces sont enregistrées sur ton compte.
        </p>
      </div>
    </div>
  `;
}

function card(s, shop) {
  const has = owned.includes(s.id);
  const equipped = profile.equipped_skin_id === s.id;

  return `
    <article class="skin-card">
      <div class="skin-art ${esc(s.theme || 'base')}">
        <span class="rarity ${s.rarity === 'Légendaire' ? 'legendary' : ''}">
          ${esc(s.rarity)}
        </span>
        <span class="art-bunny">${esc(s.emoji || '🐰')}</span>
        ${s.theme === 'royal' ? '<span class="crown">♛</span>' : ''}
      </div>

      <div class="skin-info">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description || 'Un nouveau style pour ton lapin.')}</p>

        <div class="card-bottom">
          <b>${Number(s.price) === 0 ? 'Gratuit' : `🪙 ${money(s.price)}`}</b>

          ${has ? `
            <button data-equip="${esc(s.id)}" ${equipped ? 'disabled' : ''}>
              ${equipped ? 'Équipé' : 'Équiper'}
            </button>
          ` : shop ? `
            <button data-buy="${esc(s.id)}">Acheter</button>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

function shopView() {
  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">FAIS-TOI PLAISIR</p>
        <h2>La boutique à skins</h2>
        <p>Échange tes pièces contre un nouveau style.</p>
      </div>
      <b>🪙 ${money(profile.coins)}</b>
    </div>

    <div class="skin-grid">
      ${skins.map(s => card(s, true)).join('')}
    </div>
  `;
}

function collectionView() {
  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">TA COLLECTION</p>
        <h2>Mes skins</h2>
        <p>Choisis le look de ton compagnon.</p>
      </div>
    </div>

    <div class="skin-grid">
      ${skins.filter(s => owned.includes(s.id)).map(s => card(s, false)).join('')}
    </div>
  `;
}

function eventsView() {
  return `
    <div class="section-head">
      <div>
        <p class="eyebrow">ÇA BOUGE CHEZ LES LAPINS</p>
        <h2>Les événements</h2>
        <p>Les annonces du créateur, identiques pour tout le monde.</p>
      </div>
    </div>

    ${events.length ? events.map(e => `
      <article class="event">
        <span>🎉 ÉVÉNEMENT</span>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.body ?? e.description)}</p>
      </article>
    `).join('') : `
      <div class="empty">
        🎈
        <h3>Pas d’événement pour le moment</h3>
        <p>Reviens bientôt !</p>
      </div>
    `}
  `;
}

function creatorView() {
  return `
    <div class="creator">
      <div class="lock">🔐</div>
      <p class="eyebrow">ESPACE PRIVÉ</p>
      <h2>Interface créateur</h2>
      <p>Accès réservé à l’administrateur.</p>

      <form id="creator-login" class="login-row">
        <input id="creator-password" type="password"
          placeholder="Mot de passe créateur" required>
        <button class="primary">Entrer</button>
      </form>

      <div id="creator-content"></div>
    </div>
  `;
}

function bindView() {
  $('#chat-form')?.addEventListener('submit', sendChat);

  document.querySelectorAll('[data-buy]').forEach(button => {
    button.onclick = () => buy(button.dataset.buy);
  });

  document.querySelectorAll('[data-equip]').forEach(button => {
    button.onclick = () => equip(button.dataset.equip);
  });

  $('#creator-login')?.addEventListener('submit', creatorLogin);
}

function addMessage(content, who) {
  const row = document.createElement('div');
  row.className = 'msg ' + (who === 'user' ? 'mine' : '');

  if (who === 'assistant') {
    const mascot = document.createElement('span');
    mascot.textContent = '🐰';
    row.append(mascot);
  }

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;

  row.append(bubble);

  $('#messages')?.append(row);

  const messages = $('#messages');
  if (messages) messages.scrollTop = messages.scrollHeight;
}

async function sendChat(e) {
  e.preventDefault();

  const input = $('#question');
  const message = input.value.trim();

  if (!message) return;

  addMessage(message, 'user');
  input.value = '';

  const wait = document.createElement('div');
  wait.id = 'waiting';
  wait.className = 'msg';

  const mascot = document.createElement('span');
  mascot.textContent = '🐰';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = 'Je réfléchis…';

  wait.append(mascot, bubble);
  $('#messages').append(wait);

  try {
    const data = await api('chat', {
      message,
      history: history.slice(-8)
    });

    $('#waiting')?.remove();

    if (!data.reply) {
      throw new Error('Le serveur n’a pas renvoyé de réponse.');
    }

    addMessage(data.reply, 'assistant');

    history.push(
      { role: 'user', content: message },
      { role: 'assistant', content: data.reply }
    );

    if (history.length > 20) history = history.slice(-20);

    await boot();

  } catch (error) {
    $('#waiting')?.remove();
    addMessage(error.message || 'Une erreur est survenue.', 'assistant');
  }
}

async function buy(id) {
  try {
    const data = await api('game', {
      action: 'buy',
      skinId: id
    });

    toast(data.message || 'Skin acheté !');
    await boot();

  } catch (error) {
    toast(error.message);
  }
}

async function equip(id) {
  try {
    await api('game', {
      action: 'equip',
      skinId: id
    });

    toast('Nouveau skin équipé !');
    await boot();

  } catch (error) {
    toast(error.message);
  }
}

async function creatorLogin(e) {
  e.preventDefault();

  const pass = $('#creator-password').value;
  const content = $('#creator-content');

  content.textContent = 'Connexion…';

  try {
    adminPass = pass;

    const data = await api('creator', {
      password: pass,
      action: 'dashboard'
    });

    users = data.users || [];
    renderAdmin();

  } catch (error) {
    content.textContent = error.message;
  }
}

function renderAdmin() {
  const content = $('#creator-content');
  if (!content) return;

  content.innerHTML = `
    <div class="admin">
      <h3>Tableau de bord</h3>

      <div class="admin-stats">
        <span>👥 ${users.length} comptes</span>
        <span>🎨 ${skins.length} skins</span>
        <span>🎉 ${events.length} événements</span>
      </div>

      <h4>Utilisateurs</h4>

      <div class="user-list">
        ${users.map(u => `
          <div>
            <b>${esc(u.username)}</b>
            <small>${esc(u.email || '')}</small>
            <span>🪙 ${money(u.coins)}</span>
          </div>
        `).join('') || 'Aucun utilisateur'}
      </div>

      <div class="admin-grid">
        <form id="skin-form">
          <h4>Publier un skin</h4>

          <input name="name" placeholder="Nom du skin" required maxlength="40">
          <input name="emoji" placeholder="Emoji (ex. 🐰)" value="🐰" required maxlength="8">

          <select name="rarity">
            <option>Commun</option>
            <option>Légendaire</option>
          </select>

          <input name="price" type="number" min="0" placeholder="Prix en pièces" required>
          <input name="description" placeholder="Description">

          <select name="theme">
            <option value="sunny">Soleil</option>
            <option value="royal">Royal</option>
            <option value="base">Classique</option>
          </select>

          <button class="primary">Publier le skin</button>
        </form>

        <form id="event-form">
          <h4>Publier un événement</h4>

          <input name="title" placeholder="Titre de l’événement" required maxlength="100">

          <textarea name="body" placeholder="Description visible par tous"
            required maxlength="2000"></textarea>

          <button class="primary">Publier l’événement</button>
        </form>
      </div>

      <p id="admin-status" class="tiny"></p>
    </div>
  `;

  $('#skin-form').onsubmit = async e => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      await api('creator', {
        password: adminPass,
        action: 'publish-skin',
        skin: {
          name: form.get('name'),
          emoji: form.get('emoji'),
          rarity: form.get('rarity'),
          price: Number(form.get('price')),
          description: form.get('description'),
          theme: form.get('theme')
        }
      });

      toast('Skin publié !');
      await boot();
      active = 'creator';
      render();

    } catch (error) {
      $('#admin-status').textContent = error.message;
    }
  };

  $('#event-form').onsubmit = async e => {
    e.preventDefault();

    const form = new FormData(e.target);

    try {
      await api('creator', {
        password: adminPass,
        action: 'publish-event',
        title: form.get('title'),
        body: form.get('body')
      });

      toast('Événement publié pour tous !');
      await boot();
      active = 'creator';
      render();

    } catch (error) {
      $('#admin-status').textContent = error.message;
    }
  };
}

async function init() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    session = data.session;

    supabase.auth.onAuthStateChange(() => {
      setTimeout(boot, 0);
    });

    await boot();

  } catch (error) {
    console.error('Erreur initialisation :', error);
    toast(error.message || 'Impossible de démarrer Lapin GPT.');
  }
}

init();
