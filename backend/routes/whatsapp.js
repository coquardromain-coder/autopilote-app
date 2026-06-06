/**
 * Routes WhatsApp — le Directeur accessible via WhatsApp (Twilio).
 *
 * - POST /api/whatsapp/webhook : reçoit les messages entrants (public, Twilio)
 * - POST /api/whatsapp/send    : envoi manuel (authentifié)
 * - GET  /api/whatsapp/conversations : historique WhatsApp (authentifié)
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const pilot = require('../agents/pilot');
const { buildClientContext } = require('../context');
const wa = require('../whatsapp');
const { notify } = require('../notify');

const router = express.Router();

/** Garde uniquement les chiffres d'un numéro (pour comparaison). */
const digits = (s) => String(s || '').replace(/\D/g, '');

/** Trouve l'utilisateur lié à un numéro WhatsApp entrant. */
function findUserByWhatsApp(from) {
  const fromDigits = digits(from);
  const users = db.prepare('SELECT * FROM users WHERE whatsapp_number IS NOT NULL').all();
  return users.find((u) => fromDigits.endsWith(digits(u.whatsapp_number)) || digits(u.whatsapp_number).endsWith(fromDigits)) || null;
}

/** Récupère (ou crée) la conversation WhatsApp d'un utilisateur. */
function getWhatsAppConversation(userId) {
  let conv = db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? AND channel = 'whatsapp' ORDER BY created_at DESC LIMIT 1"
  ).get(userId);
  if (!conv) {
    const info = db.prepare(
      "INSERT INTO conversations (user_id, agent_id, title, channel) VALUES (?, 'directeur', 'WhatsApp', 'whatsapp')"
    ).run(userId);
    conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(info.lastInsertRowid);
  }
  return conv;
}

/**
 * POST /api/whatsapp/webhook — réception d'un message WhatsApp entrant.
 * Twilio envoie du x-www-form-urlencoded : From, Body, NumMedia, MediaUrl0…
 */
router.post('/webhook', async (req, res) => {
  try {
    const b = req.body || {};
    const from = b.From || b.from;
    let text = b.Body || b.body || '';
    const numMedia = parseInt(b.NumMedia || '0', 10);
    const mediaType = b.MediaContentType0 || '';

    // Message vocal → transcription
    if (numMedia > 0 && mediaType.startsWith('audio')) {
      text = await wa.transcribeVoice(b.MediaUrl0);
    }

    const user = findUserByWhatsApp(from);
    if (!user) {
      // Numéro non reconnu : on répond une invitation à se connecter
      await wa.sendMessage(from, "Bonjour ! Ce numéro n'est associé à aucun compte AutoPilote. Renseignez votre numéro WhatsApp dans votre espace pour discuter avec le Directeur.");
      return res.type('text/xml').send('<Response/>');
    }

    const conv = getWhatsAppConversation(user.id);

    // Historique récent
    const history = db.prepare(
      'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20'
    ).all(conv.id);

    db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(conv.id, 'user', text);

    // Le Directeur traite et délègue, avec le contexte entreprise
    const clientContext = buildClientContext(user);
    const result = await pilot.handle(text, history, null, clientContext);

    db.prepare('INSERT INTO messages (conversation_id, role, agent_id, content) VALUES (?, ?, ?, ?)')
      .run(conv.id, 'assistant', result.agentId, result.content);
    db.prepare('INSERT INTO activity_logs (user_id, agent_id, action) VALUES (?, ?, ?)')
      .run(user.id, result.agentId, 'whatsapp');

    // Réponse envoyée sur WhatsApp
    await wa.sendMessage(from, result.content);
    notify(user.id, `Nouveau message WhatsApp traité par ${result.agentName}`, '💬');

    res.type('text/xml').send('<Response/>');
  } catch (err) {
    console.error('[WhatsApp webhook]', err.message);
    res.type('text/xml').send('<Response/>');
  }
});

// Les routes suivantes nécessitent une authentification
router.use(authMiddleware);

/** GET /api/whatsapp/status — état de la configuration + numéro lié. */
router.get('/status', (req, res) => {
  const user = db.prepare('SELECT whatsapp_number FROM users WHERE id = ?').get(req.user.id);
  res.json({
    configured: wa.isConfigured(),
    mode: wa.isConfigured() ? 'live' : 'simulation',
    whatsapp_number: user?.whatsapp_number || null,
  });
});

/** POST /api/whatsapp/send — envoi manuel d'un message WhatsApp. */
router.post('/send', async (req, res) => {
  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: 'Destinataire et message requis.' });
  try {
    const r = await wa.sendMessage(to, body);
    res.json({ success: true, ...r });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** GET /api/whatsapp/conversations — historique des échanges WhatsApp. */
router.get('/conversations', (req, res) => {
  const convs = db.prepare(
    "SELECT * FROM conversations WHERE user_id = ? AND channel = 'whatsapp' ORDER BY created_at DESC"
  ).all(req.user.id);
  const withMessages = convs.map((c) => ({
    ...c,
    messages: db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(c.id),
  }));
  res.json({ conversations: withMessages });
});

module.exports = router;
