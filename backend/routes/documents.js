/**
 * Routes "Mes documents" — bibliothèque des contenus générés par les
 * agents (devis, contenus, contrats…), classés par type et par date.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/documents — liste (filtre optionnel ?type=). */
router.get('/', (req, res) => {
  const { type } = req.query;
  const rows = type
    ? db.prepare('SELECT * FROM documents WHERE user_id = ? AND type = ? ORDER BY created_at DESC').all(req.user.id, type)
    : db.prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ documents: rows });
});

/** POST /api/documents — enregistre un document. */
router.post('/', (req, res) => {
  const { type, title, content, agent_id } = req.body || {};
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis.' });
  const info = db.prepare(
    'INSERT INTO documents (user_id, type, agent_id, title, content) VALUES (?, ?, ?, ?, ?)'
  ).run(req.user.id, type || 'document', agent_id || null, title, content);
  res.status(201).json({ document: db.prepare('SELECT * FROM documents WHERE id = ?').get(info.lastInsertRowid) });
});

/** DELETE /api/documents/:id */
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM documents WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Document introuvable.' });
  res.json({ success: true });
});

module.exports = router;
