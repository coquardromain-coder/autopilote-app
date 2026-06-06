/**
 * Routes API réseaux sociaux (authentifiées) : statut, publication,
 * programmation, liste des posts et statistiques basiques.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const social = require('../social');
const { notify } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/social/status — état des connexions Facebook & LinkedIn. */
router.get('/status', (req, res) => {
  const accounts = db.prepare('SELECT * FROM social_accounts WHERE user_id = ?').all(req.user.id);
  const byProvider = (p) => accounts.find((a) => a.provider === p) || null;
  const build = (p) => {
    const acc = byProvider(p);
    return { configured: social.isConfigured(p), connected: Boolean(acc), account_name: acc?.account_name || null };
  };
  res.json({ facebook: build('facebook'), linkedin: build('linkedin') });
});

/** POST /api/social/disconnect — déconnecte un réseau. */
router.post('/disconnect', (req, res) => {
  const { provider } = req.body || {};
  db.prepare('DELETE FROM social_accounts WHERE user_id = ? AND provider = ?').run(req.user.id, provider);
  res.json({ success: true });
});

/**
 * POST /api/social/publish — publie ou programme un post.
 * Corps : { provider, content, scheduledAt? }
 */
router.post('/publish', async (req, res) => {
  const { provider, content, scheduledAt } = req.body || {};
  if (!social.PROVIDERS[provider]) return res.status(400).json({ error: 'Réseau inconnu.' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu vide.' });

  const account = db.prepare('SELECT * FROM social_accounts WHERE user_id = ? AND provider = ?').get(req.user.id, provider);
  if (!account) return res.status(400).json({ error: `Compte ${social.label(provider)} non connecté.` });

  const result = await social.publish(provider, account, content);
  const status = scheduledAt ? 'programme' : 'publie';

  const info = db.prepare(
    `INSERT INTO social_posts (user_id, provider, content, status, scheduled_at, stats)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, provider, content, status, scheduledAt || null, JSON.stringify(result.stats));

  db.prepare('INSERT INTO activity_logs (user_id, agent_id, action) VALUES (?, ?, ?)')
    .run(req.user.id, 'creatif', status === 'programme' ? 'social_schedule' : 'social_publish');

  notify(req.user.id,
    status === 'programme'
      ? `Post ${social.label(provider)} programmé par le Créatif`
      : `Post publié sur ${social.label(provider)} par le Créatif`,
    '📣');

  const post = db.prepare('SELECT * FROM social_posts WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, simulated: result.simulated, post });
});

/** GET /api/social/posts — liste des publications. */
router.get('/posts', (req, res) => {
  const posts = db.prepare('SELECT * FROM social_posts WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ posts: posts.map((p) => ({ ...p, stats: safeJson(p.stats) })) });
});

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

module.exports = router;
