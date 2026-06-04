/**
 * Routes API des services Google (authentifiées).
 * Gmail (envoi), Calendar (rendez-vous), Drive (documents) + statut.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { db } = require('../db');
const google = require('../google');

const router = express.Router();
router.use(authMiddleware);

/** Journalise une action dans le suivi d'activité (analytics). */
function logActivity(userId, action) {
  db.prepare('INSERT INTO activity_logs (user_id, agent_id, action) VALUES (?, ?, ?)')
    .run(userId, 'google', action);
}

/** GET /api/google/status — état de la connexion Google de l'utilisateur. */
router.get('/status', (req, res) => {
  const acc = google.getAccount(req.user.id);
  res.json({
    configured: google.isConfigured(),
    connected: Boolean(acc),
    email: acc?.google_email || null,
    connectedAt: acc?.connected_at || null,
    scopes: acc?.scope ? acc.scope.split(' ') : [],
  });
});

/** POST /api/google/disconnect — révoque la connexion (côté app). */
router.post('/disconnect', (req, res) => {
  google.disconnect(req.user.id);
  res.json({ success: true });
});

// ─────────────────── 1. Gmail ───────────────────

/** POST /api/google/gmail/send — envoie un email. */
router.post('/gmail/send', async (req, res) => {
  const { to, subject, body } = req.body || {};
  if (!to || !subject) {
    return res.status(400).json({ error: 'Destinataire et objet requis.' });
  }
  try {
    const result = await google.sendGmail(req.user.id, { to, subject, body: body || '' });
    logActivity(req.user.id, 'gmail_send');
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────── 2. Calendar ───────────────────

/** GET /api/google/calendar/events — liste les prochains rendez-vous. */
router.get('/calendar/events', async (req, res) => {
  try {
    const events = await google.listCalendarEvents(req.user.id);
    res.json({ events });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/google/calendar/events — crée un rendez-vous. */
router.post('/calendar/events', async (req, res) => {
  const { summary, description, start, end } = req.body || {};
  if (!summary || !start || !end) {
    return res.status(400).json({ error: 'Titre, début et fin requis.' });
  }
  try {
    const event = await google.createCalendarEvent(req.user.id, { summary, description, start, end });
    logActivity(req.user.id, 'calendar_create');
    res.json({ success: true, event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─────────────────── 3. Drive ───────────────────

/** GET /api/google/drive/files — liste les documents. */
router.get('/drive/files', async (req, res) => {
  try {
    const files = await google.listDriveFiles(req.user.id);
    res.json({ files });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** POST /api/google/drive/files — crée un document texte. */
router.post('/drive/files', async (req, res) => {
  const { name, content } = req.body || {};
  try {
    const file = await google.createDriveDoc(req.user.id, { name, content });
    logActivity(req.user.id, 'drive_create');
    res.json({ success: true, file });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
