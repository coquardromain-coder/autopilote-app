/**
 * Routes WhatsApp — via l'API Meta WhatsApp Cloud (gratuit).
 *
 * - GET  /api/whatsapp/webhook : vérification Meta (hub.challenge)
 * - POST /api/whatsapp/webhook : réception des messages entrants (public)
 * - POST /api/whatsapp/send    : envoi manuel (authentifié)
 * - GET  /api/whatsapp/conversations / /status : (authentifié)
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const pilot = require('../agents/pilot');
const { buildClientContext } = require('../context');
const wa = require('../integrations/whatsapp');
const store = require('../connectors/store');
const { notify } = require('../notify');

const router = express.Router();

/** Récupère la config WhatsApp (déchiffrée) d'un utilisateur. */
function waConfig(userId) { return store.getConfig(userId, 'whatsapp'); }

/** Trouve l'utilisateur dont la config WhatsApp correspond au phone_number_id. */
function findUserByPhoneNumberId(pnid) {
  const rows = db.prepare("SELECT user_id FROM connector_configs WHERE connector = 'whatsapp'").all();
  for (const r of rows) {
    const cfg = store.getConfig(r.user_id, 'whatsapp');
    if (cfg.phoneNumberId && String(cfg.phoneNumberId) === String(pnid)) return r.user_id;
  }
  return null;
}

function getWhatsAppConversation(userId) {
  let conv = db.prepare("SELECT * FROM conversations WHERE user_id = ? AND channel = 'whatsapp' ORDER BY created_at DESC LIMIT 1").get(userId);
  if (!conv) {
    const info = db.prepare("INSERT INTO conversations (user_id, agent_id, title, channel) VALUES (?, 'directeur', 'WhatsApp', 'whatsapp')").run(userId);
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  }
  return conv;
}

/** GET /api/whatsapp/webhook — vérification Meta (handshake). */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  // Accepte si le verify_token correspond à l'env ou à un token client stocké
  const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
  let ok = mode === 'subscribe' && token && (token === envToken);
  if (!ok && token) {
    const rows = db.prepare("SELECT user_id FROM connector_configs WHERE connector = 'whatsapp'").all();
    ok = rows.some((r) => store.getConfig(r.user_id, 'whatsapp').verifyToken === token);
  }
  if (ok) return res.status(200).send(challenge);
  res.sendStatus(403);
});

/** POST /api/whatsapp/webhook — message entrant. */
router.post('/webhook', async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const parsed = wa.parseWebhook(req.body);
    const pnid = value?.metadata?.phone_number_id;
    if (!parsed || !pnid) return res.sendStatus(200);

    const userId = findUserByPhoneNumberId(pnid);
    if (!userId) return res.sendStatus(200);

    const config = waConfig(userId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const conv = getWhatsAppConversation(userId);
    const history = db.prepare('SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20').all(conv.id);

    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').run(conv.id, 'user', parsed.text);

    const result = await pilot.handle(parsed.text, history, null, buildClientContext(user));
    db.prepare('INSERT INTO messages (conversation_id, role, agent_id, content) VALUES (?, ?, ?, ?)').run(conv.id, 'assistant', result.agentId, result.content);
    db.prepare('INSERT INTO activity_logs (user_id, agent_id, action) VALUES (?, ?, ?)').run(userId, result.agentId, 'whatsapp');

    await wa.sendMessage(config, parsed.from, result.content);
    notify(userId, `Message WhatsApp traité par ${result.agentName}`, '💬');
    res.sendStatus(200);
  } catch (err) {
    console.error('[WhatsApp webhook]', err.message);
    res.sendStatus(200);
  }
});

router.use(authMiddleware);

/** GET /api/whatsapp/status. */
router.get('/status', (req, res) => {
  const cfg = waConfig(req.user.id);
  res.json({ configured: wa.isConfigured(cfg), mode: wa.isConfigured(cfg) ? 'live' : 'simulation' });
});

/** POST /api/whatsapp/send — envoi manuel. */
router.post('/send', async (req, res) => {
  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'Destinataire et message requis.' });
  try {
    const r = await wa.sendMessage(waConfig(req.user.id), to, body);
    res.json({ success: true, ...r });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/whatsapp/conversations. */
router.get('/conversations', (req, res) => {
  const convs = db.prepare("SELECT * FROM conversations WHERE user_id = ? AND channel = 'whatsapp' ORDER BY created_at DESC").all(req.user.id);
  res.json({ conversations: convs.map((c) => ({ ...c, messages: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(c.id) })) });
});

module.exports = router;
