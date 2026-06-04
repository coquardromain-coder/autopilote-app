/**
 * Intégration Google OAuth 2.0 — Gmail, Calendar et Drive.
 *
 * Charge les identifiants depuis le fichier JSON téléchargé sur la
 * Google Cloud Console (client_secret_*.json placé dans backend/),
 * construit les clients OAuth et expose des helpers métier pour les
 * trois services.
 */
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { db } = require('./db');

// ─────────────────── Chargement des identifiants ───────────────────

/**
 * Localise le fichier d'identifiants Google.
 * Priorité : variable GOOGLE_CREDENTIALS_PATH, sinon premier
 * fichier client_secret*.json trouvé dans le dossier backend.
 */
function findCredentialsFile() {
  if (process.env.GOOGLE_CREDENTIALS_PATH) {
    return path.resolve(__dirname, process.env.GOOGLE_CREDENTIALS_PATH);
  }
  const file = fs
    .readdirSync(__dirname)
    .find((f) => f.startsWith('client_secret') && f.endsWith('.json'));
  return file ? path.join(__dirname, file) : null;
}

let CREDENTIALS = null;
try {
  const file = findCredentialsFile();
  if (file) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Le JSON Google encapsule les clés sous "web" ou "installed"
    CREDENTIALS = raw.web || raw.installed || null;
    console.log(`[Google] Identifiants chargés depuis ${path.basename(file)}`);
  } else {
    console.warn('[Google] Aucun fichier client_secret*.json trouvé — intégration désactivée.');
  }
} catch (err) {
  console.error('[Google] Erreur de lecture des identifiants :', err.message);
}

// URI de redirection (doit correspondre à la Google Cloud Console)
const REDIRECT_URI =
  (CREDENTIALS && CREDENTIALS.redirect_uris && CREDENTIALS.redirect_uris[0]) ||
  'http://localhost:4000/auth/google/callback';

// Périmètres demandés
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',          // 1. Envoi d'emails
  'https://www.googleapis.com/auth/calendar.events',     // 2. Rendez-vous
  'https://www.googleapis.com/auth/drive.file',          // 3. Documents (créés par l'app)
];

/** Indique si l'intégration Google est configurée. */
function isConfigured() {
  return Boolean(CREDENTIALS && CREDENTIALS.client_id && CREDENTIALS.client_secret);
}

/** Crée un client OAuth2 neuf. */
function createOAuthClient() {
  return new google.auth.OAuth2(
    CREDENTIALS.client_id,
    CREDENTIALS.client_secret,
    REDIRECT_URI
  );
}

// ─────────────────── Flux d'autorisation ───────────────────

/**
 * Construit l'URL de consentement Google.
 * @param {string} state - valeur opaque (ici le JWT applicatif) renvoyée au callback.
 */
function getAuthUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',     // pour obtenir un refresh_token
    prompt: 'consent',          // force le refresh_token à chaque connexion
    scope: SCOPES,
    state,
  });
}

/** Échange le code d'autorisation contre des tokens. */
async function exchangeCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Récupère l'email du compte Google connecté
  let email = null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const me = await oauth2.userinfo.get();
    email = me.data.email;
  } catch (e) {
    console.warn('[Google] Impossible de lire l\'email du compte :', e.message);
  }

  return { tokens, email };
}

// ─────────────────── Persistance des tokens ───────────────────

/** Enregistre (ou met à jour) les tokens Google d'un utilisateur. */
function saveTokens(userId, tokens, email) {
  const existing = db.prepare('SELECT * FROM google_accounts WHERE user_id = ?').get(userId);
  // Google ne renvoie pas toujours un refresh_token : on conserve l'ancien.
  const refresh = tokens.refresh_token || (existing && existing.refresh_token) || null;

  if (existing) {
    db.prepare(
      `UPDATE google_accounts
       SET google_email=?, access_token=?, refresh_token=?, scope=?, token_type=?, expiry_date=?
       WHERE user_id=?`
    ).run(
      email ?? existing.google_email,
      tokens.access_token ?? existing.access_token,
      refresh,
      tokens.scope ?? existing.scope,
      tokens.token_type ?? existing.token_type,
      tokens.expiry_date ?? existing.expiry_date,
      userId
    );
  } else {
    db.prepare(
      `INSERT INTO google_accounts
       (user_id, google_email, access_token, refresh_token, scope, token_type, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      userId,
      email || null,
      tokens.access_token || null,
      refresh,
      tokens.scope || null,
      tokens.token_type || null,
      tokens.expiry_date || null
    );
  }
}

/** Renvoie le compte Google connecté d'un utilisateur (ou null). */
function getAccount(userId) {
  return db.prepare('SELECT * FROM google_accounts WHERE user_id = ?').get(userId) || null;
}

/** Déconnecte (supprime) le compte Google d'un utilisateur. */
function disconnect(userId) {
  db.prepare('DELETE FROM google_accounts WHERE user_id = ?').run(userId);
}

/**
 * Construit un client OAuth2 authentifié pour un utilisateur, à partir
 * des tokens stockés. Rafraîchit et persiste automatiquement le token.
 * @returns {OAuth2Client|null}
 */
function getClientForUser(userId) {
  const acc = getAccount(userId);
  if (!acc) return null;

  const client = createOAuthClient();
  client.setCredentials({
    access_token: acc.access_token,
    refresh_token: acc.refresh_token,
    scope: acc.scope,
    token_type: acc.token_type,
    expiry_date: acc.expiry_date,
  });

  // Persiste les nouveaux tokens lors d'un rafraîchissement automatique
  client.on('tokens', (tokens) => {
    saveTokens(userId, tokens, acc.google_email);
  });

  return client;
}

// ─────────────────── Helpers métier ───────────────────

/** 1. Gmail — envoie un email depuis le compte connecté. */
async function sendGmail(userId, { to, subject, body }) {
  const auth = getClientForUser(userId);
  if (!auth) throw new Error('Compte Google non connecté.');
  const gmail = google.gmail({ version: 'v1', auth });

  // Construit le message au format RFC 2822 puis encode en base64url
  const lines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ];
  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
  return res.data; // { id, threadId, ... }
}

/** 2. Calendar — liste les prochains rendez-vous. */
async function listCalendarEvents(userId, maxResults = 10) {
  const auth = getClientForUser(userId);
  if (!auth) throw new Error('Compte Google non connecté.');
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

/** 2. Calendar — crée un rendez-vous. */
async function createCalendarEvent(userId, { summary, description, start, end }) {
  const auth = getClientForUser(userId);
  if (!auth) throw new Error('Compte Google non connecté.');
  const calendar = google.calendar({ version: 'v3', auth });
  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary,
      description,
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    },
  });
  return res.data;
}

/** 3. Drive — liste les documents gérés par l'application. */
async function listDriveFiles(userId, pageSize = 20) {
  const auth = getClientForUser(userId);
  if (!auth) throw new Error('Compte Google non connecté.');
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.list({
    pageSize,
    fields: 'files(id, name, mimeType, webViewLink, createdTime)',
    orderBy: 'createdTime desc',
  });
  return res.data.files || [];
}

/** 3. Drive — crée un document texte dans le Drive de l'utilisateur. */
async function createDriveDoc(userId, { name, content }) {
  const auth = getClientForUser(userId);
  if (!auth) throw new Error('Compte Google non connecté.');
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.create({
    requestBody: { name: name || 'Document AutoPilote.txt' },
    media: { mimeType: 'text/plain', body: content || '' },
    fields: 'id, name, webViewLink',
  });
  return res.data;
}

module.exports = {
  isConfigured,
  getAuthUrl,
  exchangeCode,
  saveTokens,
  getAccount,
  disconnect,
  getClientForUser,
  sendGmail,
  listCalendarEvents,
  createCalendarEvent,
  listDriveFiles,
  createDriveDoc,
  SCOPES,
  REDIRECT_URI,
};
