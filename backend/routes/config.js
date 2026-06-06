/**
 * Routes de configuration : secteurs d'activité et modèles de documents.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { db } = require('../db');
const { listSectors } = require('../sectors');
const { TEMPLATE_TYPES, renderTemplate } = require('../templates');

const router = express.Router();
router.use(authMiddleware);

/** GET /api/config/sectors — liste des secteurs préconfigurés. */
router.get('/sectors', (_req, res) => {
  res.json({ sectors: listSectors() });
});

/** GET /api/config/templates — liste des types de modèles disponibles. */
router.get('/templates', (_req, res) => {
  res.json({ templates: TEMPLATE_TYPES });
});

/**
 * GET /api/config/templates/:type — prévisualise un modèle, rendu avec les
 * informations de l'entreprise du client (secteur, prestations, infos légales).
 */
router.get('/templates/:type', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const content = renderTemplate(req.params.type, user);
  if (!content) return res.status(404).json({ error: 'Modèle inconnu.' });
  res.json({ type: req.params.type, content });
});

module.exports = router;
