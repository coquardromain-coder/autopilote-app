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

// Modules d'intégration
const doli = require('../integrations/dolibarr');
const metaWa = require('../integrations/whatsapp');
const opensign = require('../integrations/opensign');
const docuseal = require('../integrations/docuseal');
const fonoster = require('../integrations/fonoster');
const hunterio = require('../integrations/hunterio');
const wordpress = require('../wordpress');

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

/** Teste la connexion d'un connecteur avec une config donnée. */
async function testConnector(id, userId, config) {
  switch (id) {
    case 'dolibarr': return doli.testConnection({ url: config.url, apiKey: config.apikey });
    case 'whatsapp': return metaWa.testConnection(config);
    case 'opensign': return opensign.testConnection(config);
    case 'docuseal': return docuseal.testConnection(config);
    case 'fonoster': return fonoster.testConnection(config);
    case 'hunterio': return hunterio.testConnection(config);
    case 'wordpress':
      if (!wordpress.isConfigured(config)) throw new Error('Champs WordPress incomplets');
      await wordpress.getTags(config); return { success: true };
    case 'stripe': {
      if (!config.secretKey) throw new Error('Clé secrète Stripe manquante');
      const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${config.secretKey}` } });
      if (!r.ok) throw new Error('Clé Stripe invalide'); return { success: true };
    }
    case 'searchconsole': case 'analytics': case 'googlebusiness':
      if (!google.getAccount(userId)) throw new Error('Connectez d\'abord Google Workspace');
      return { success: true };
    default: return { success: true };
  }
}

/**
 * POST /api/connectors/:id — enregistre (chiffré) et teste la connexion.
 */
router.post('/:id', async (req, res) => {
  const id = req.params.id;
  if (!connectors[id]) return res.status(404).json({ error: 'Connecteur inconnu.' });
  const config = req.body || {};

  // Cas particuliers : synchronise avec les systèmes existants
  if (id === 'dolibarr') {
    db.prepare('UPDATE users SET dolibarr_url=?, dolibarr_apikey=? WHERE id=?')
      .run(config.url || null, config.apikey || null, req.user.id);
  }
  if (id === 'dolibarr_export') {
    db.prepare('UPDATE users SET compta_email=? WHERE id=?').run(config.email_compta || null, req.user.id);
  }
  if (id === 'whatsapp') {
    db.prepare('UPDATE users SET whatsapp_number=? WHERE id=?').run(config.whatsapp_number || userRow(req.user.id).whatsapp_number, req.user.id);
  }

  // Enregistre la config chiffrée
  store.setConfig(req.user.id, id, config, 'en_cours');

  // Test automatique de connexion
  try {
    const t = await testConnector(id, req.user.id, config);
    store.setStatus(req.user.id, id, 'connecte');
    res.json({ saved: true, success: true, status: 'connecte', version: t.version, name: t.name });
  } catch (err) {
    store.setStatus(req.user.id, id, 'erreur');
    res.json({ saved: true, success: false, status: 'erreur', error: err.message });
  }
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
