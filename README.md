# Lapin GPT 🐰 — version complète

Application web responsive : comptes joueurs, discussion IA, monnaie, boutique et collection de skins, événements partagés et interface créateur.

## Déploiement Netlify

### 1. Préparer Supabase
1. Crée un projet sur https://supabase.com.
2. Ouvre **SQL Editor**, colle tout le fichier `supabase.sql` et exécute-le.
3. Dans **Authentication > URL Configuration**, ajoute l'URL de ton futur site Netlify dans Site URL et Redirect URLs.
4. Pour tester facilement, tu peux désactiver la confirmation d'e-mail dans Authentication > Providers > Email. Pour un site public, garde-la activée.

### 2. Préparer OpenAI
Crée une clé API sur https://platform.openai.com/api-keys. L'API est facturée séparément de ChatGPT Plus/Free. Ne mets jamais cette clé dans le code du navigateur.

### 3. Déployer
1. Décompresse le ZIP et pousse tous les fichiers dans un dépôt GitHub.
2. Dans Netlify, choisis **Add new site > Import an existing project** et connecte ce dépôt.
3. Build command : `npm run build`. Publish directory : `dist`. Le fichier `netlify.toml` les définit déjà.
4. Dans Netlify > Site configuration > Environment variables, ajoute toutes les variables ci-dessous.
5. Déclenche un nouveau déploiement.

### Variables Netlify
- `OPENAI_API_KEY` : clé secrète OpenAI.
- `OPENAI_MODEL` : facultatif, `gpt-4o-mini` par défaut.
- `CREATOR_PASSWORD` : mot de passe de l'interface créateur. Pour ce projet, configure la valeur que tu as choisie dans Netlify, pas dans le code.
- `SUPABASE_URL` : URL du projet Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` : clé service_role Supabase (secret serveur uniquement).
- `VITE_SUPABASE_URL` : URL du projet Supabase.
- `VITE_SUPABASE_ANON_KEY` : clé anon/public Supabase.

### Fonctionnalités
- Inscription/connexion par e-mail et mot de passe.
- Profil et pseudo créés dans Supabase.
- Skin de base offert et équipé au départ.
- Chat IA en français via fonction Netlify.
- +5 pièces après chaque réponse IA réussie, créditées côté serveur.
- Achat et équipement des skins validés côté serveur et en base.
- Skins communs et légendaires publiables par le créateur.
- Événements enregistrés dans Supabase et visibles par tous.
- Tableau de bord créateur avec liste des pseudos, e-mails et soldes de pièces.
- Le lapin porte le skin équipé dans l'écran de discussion.

## Notes de sécurité / limites
- Le mot de passe créateur est vérifié côté serveur. Pour un site public, choisis un secret robuste et limite son partage.
- Les fonctions utilisent la clé Supabase service_role uniquement côté serveur. Ne la publie jamais et ne la préfixe jamais par `VITE_`.
- Le tableau de bord admin expose les adresses e-mail aux personnes connaissant le mot de passe créateur : protège ce mot de passe.
- Les skins de cette version sont des skins illustrés par emoji/thèmes CSS. Les vrais visuels dessinés peuvent être ajoutés ensuite.
- Le système de comptes, inventaires, pièces, achats et événements est persistant et partagé via Supabase.
- L'usage de l'API OpenAI peut entraîner des frais. Configure des limites de dépenses dans ton compte API.
