/**
 * Routes Contenu — publication WordPress (capacité du Référenceur).
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const wordpress = require('../wordpress');
const { notify } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/content/wordpress/status — état de la configuration WordPress. */
router.get('/wordpress/status', (_req, res) => {
  res.json({ configured: wordpress.isConfigured(), mode: wordpress.isConfigured() ? 'live' : 'simulation' });
});

/** POST /api/content/wordpress/publish — publie un article de blog. */
router.post('/wordpress/publish', async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis.' });
  try {
    const result = await wordpress.publishArticle({ title, content });
    // Conserve une trace dans la bibliothèque de documents
    db.prepare('INSERT INTO documents (user_id, type, agent_id, title, content) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'Article de blog', 'referenceur', title, content);
    notify(req.user.id, `Article « ${title.slice(0, 40)} » publié sur WordPress par le Référenceur`, '📝');
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
