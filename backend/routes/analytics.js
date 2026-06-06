/**
 * Routes analytics — tableau de bord et indicateurs (agent Analyste).
 * Agrège les données de l'utilisateur pour alimenter le dashboard.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/analytics/overview — synthèse des indicateurs clés. */
router.get('/overview', (req, res) => {
  const uid = req.user.id;

  const contacts = db
    .prepare('SELECT COUNT(*) AS n FROM contacts WHERE user_id = ?')
    .get(uid).n;
  const clients = db
    .prepare("SELECT COUNT(*) AS n FROM contacts WHERE user_id = ? AND status = 'client'")
    .get(uid).n;
  const conversations = db
    .prepare('SELECT COUNT(*) AS n FROM conversations WHERE user_id = ?')
    .get(uid).n;
  const messages = db
    .prepare(
      `SELECT COUNT(*) AS n FROM messages m
       JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = ?`
    )
    .get(uid).n;
  const invoices = db
    .prepare('SELECT COUNT(*) AS n FROM invoices WHERE user_id = ?')
    .get(uid).n;
  const revenue = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE user_id = ? AND status = 'payee'")
    .get(uid).total;
  const pendingRevenue = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE user_id = ? AND status != 'payee'")
    .get(uid).total;
  const quotes = db
    .prepare('SELECT COUNT(*) AS n FROM quotes WHERE user_id = ?')
    .get(uid).n;

  // Activité par agent (top agents utilisés)
  const byAgent = db
    .prepare(
      `SELECT agent_id, COUNT(*) AS n FROM activity_logs
       WHERE user_id = ? GROUP BY agent_id ORDER BY n DESC LIMIT 10`
    )
    .all(uid);

  res.json({
    kpis: {
      contacts,
      clients,
      conversations,
      messages,
      invoices,
      quotes,
      revenue,
      pendingRevenue,
    },
    activityByAgent: byAgent,
  });
});

/** GET /api/analytics/activity — historique d'activité récent. */
router.get('/activity', (req, res) => {
  const rows = db
    .prepare(
      `SELECT * FROM activity_logs WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`
    )
    .all(req.user.id);
  res.json({ activity: rows });
});

module.exports = router;
