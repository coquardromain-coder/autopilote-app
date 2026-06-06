/**
 * Routes Notifications — alertes du dashboard (tâche terminée, etc.).
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/notifications — liste + nombre non lues. */
router.get('/', (req, res) => {
  const items = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
  ).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id).n;
  res.json({ notifications: items, unread });
});

/** POST /api/notifications/read — marque tout comme lu. */
router.post('/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
