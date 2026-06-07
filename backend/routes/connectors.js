/**
 * Système de connecteurs unifié : catalogue, statut par utilisateur,
 * sauvegarde (chiffrée AES-256) et test de connexion.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const { connectors, listConnectors } = require('../connectors');
const store = require('../connectors/store');
const google = require('../google');
const doli = require('../integrations/dolibarr');
const { testConnector } = require('../connectors/test');
const { saveAndTest } = require('../connectors/save');

const router = express.Router();
router.use(authMiddleware);

function userRow(id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(id); }

/** Détermine le statut d'un connecteur pour un utilisateur. */
function statusOf(id, userId, smap) {
  const c = connectors[id];
  // Connecteurs OAuth Google
  if (c.oauth === 'google') {
    const cfg = store.getConfig(userId, id);
    if (!google.getAccount(userId)) return 'non_configure';
    return Object.keys(cfg).length ? 'connecte' : 'en_cours';
  }
  if (c.oauth === 'meta') {
    return db.prepare("SELECT 1 FROM social_accounts WHERE user_id=? AND provider='facebook'").get(userId) ? 'connecte' : 'non_configure';
  }
  if (c.oauth === 'linkedin') {
    return db.prepare("SELECT 1 FROM social_accounts WHERE user_id=? AND provider='linkedin'").get(userId) ? 'connecte' : 'non_configure';
  }
  // Dolibarr : peut venir des colonnes users (legacy) ou du store
  if (id === 'dolibarr') {
    const u = userRow(userId);
    if (doli.isConfigured(doli.configFromUser(u))) return 'connecte';
  }
  return smap[id] || 'non_configure';
}

/** GET /api/connectors — catalogue + statut + agents. */
router.get('/', (req, res) => {
  const smap = store.statusMap(req.user.id);
  const items = listConnectors().map((c) => ({
    id: c.id, name: c.name, icon: c.icon, description: c.description,
    agents: c.agents, fields: c.fields, oauth: c.oauth || null,
    status: statusOf(c.id, req.user.id, smap),
  }));
  res.json({ connectors: items });
});

/** GET /api/connectors/:id — config (non sensible : champs présents seulement). */
router.get('/:id', (req, res) => {
  const cfg = store.getConfig(req.user.id, req.params.id);
  // On ne renvoie pas les secrets en clair : juste les champs renseignés (masqués)
  const masked = {};
  for (const k of Object.keys(cfg)) masked[k] = cfg[k] ? '••••' : '';
  res.json({ config: masked });
});

/**
 * POST /api/connectors/:id — enregistre (chiffré) et teste la connexion.
 */
router.post('/:id', async (req, res) => {
  const id = req.params.id;
  if (!connectors[id]) return res.status(404).json({ error: 'Connecteur inconnu.' });
  const result = await saveAndTest(req.user.id, id, req.body || {});
  res.json(result);
});

/** POST /api/connectors/:id/test — re-teste la connexion. */
router.post('/:id/test', async (req, res) => {
  const id = req.params.id;
  const config = store.getConfig(req.user.id, id);
  try {
    const t = await testConnector(id, req.user.id, config);
    store.setStatus(req.user.id, id, 'connecte');
    res.json({ success: true, version: t.version });
  } catch (err) {
    store.setStatus(req.user.id, id, 'erreur');
    res.json({ success: false, error: err.message });
  }
});

/** DELETE /api/connectors/:id — déconnecte. */
router.delete('/:id', (req, res) => {
  store.removeConfig(req.user.id, req.params.id);
  res.json({ success: true });
});

module.exports = router;
