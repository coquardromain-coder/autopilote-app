/**
 * Interface ADMIN — gestion des clients par le conseiller AutoPilote.
 * Connexion séparée (adminAuth). Permet de configurer les connecteurs des
 * clients à leur place, voir leurs conversations et l'état de leurs agents.
 */
const express = require('express');
const { db } = require('../db');
const { adminLogin, adminMiddleware } = require('../adminAuth');
const { connectors, listConnectors } = require('../connectors');
const store = require('../connectors/store');
const { saveAndTest } = require('../connectors/save');
const { agentActivation } = require('../onboarding');
const { listAgents } = require('../agents/registry');
const google = require('../google');
const { sendWelcomeEmails } = require('../welcome');

const router = express.Router();

/** POST /api/admin/login — connexion admin (public). */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const r = adminLogin(email, password);
  if (r.error) return res.status(401).json({ error: r.error });
  res.json({ token: r.token });
});

// Tout le reste exige le jeton admin
router.use(adminMiddleware);

/** Statut d'un connecteur pour un client (vue admin). */
function connectorStatus(userId, id) {
  const c = connectors[id];
  const smap = store.statusMap(userId);
  if (c.oauth === 'google') return google.getAccount(userId) ? 'connecte' : 'non_configure';
  if (c.oauth === 'meta') return db.prepare("SELECT 1 FROM social_accounts WHERE user_id=? AND provider='facebook'").get(userId) ? 'connecte' : 'non_configure';
  if (c.oauth === 'linkedin') return db.prepare("SELECT 1 FROM social_accounts WHERE user_id=? AND provider='linkedin'").get(userId) ? 'connecte' : 'non_configure';
  if (id === 'dolibarr') {
    const u = db.prepare('SELECT dolibarr_url, dolibarr_apikey FROM users WHERE id=?').get(userId);
    if (u && u.dolibarr_url && u.dolibarr_apikey) return 'connecte';
  }
  return smap[id] || 'non_configure';
}

/** GET /api/admin/clients — liste des clients + synthèse connecteurs. */
router.get('/clients', (_req, res) => {
  const users = db.prepare('SELECT id, name, email, company, plan, sector, created_at FROM users ORDER BY created_at DESC').all();
  const clients = users.map((u) => {
    const total = listConnectors().length;
    const connected = listConnectors().filter((c) => connectorStatus(u.id, c.id) === 'connecte').length;
    return { ...u, connectors: { connected, total } };
  });
  res.json({ clients });
});

/** GET /api/admin/clients/:id — détail complet d'un client. */
router.get('/clients/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Client introuvable.' });

  const conns = listConnectors().map((c) => ({
    id: c.id, name: c.name, icon: c.icon, description: c.description, agents: c.agents,
    fields: c.fields, oauth: c.oauth || null, status: connectorStatus(u.id, c.id),
  }));
  const activation = agentActivation(u.id);
  const agents = listAgents().map((a) => ({ id: a.id, name: a.name, avatar: a.avatar, role: a.role, activation: activation[a.id] || { status: 'actif', label: 'Actif' } }));

  const conversations = db.prepare('SELECT * FROM conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(u.id)
    .map((c) => ({ ...c, messages: db.prepare('SELECT role, agent_id, content, created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC').all(c.id) }));

  res.json({
    client: {
      id: u.id, name: u.name, email: u.email, company: u.company, plan: u.plan,
      sector: u.sector, siret: u.siret, address: u.address, phone: u.phone,
      brief: u.brief, onboarded: Boolean(u.onboarded), created_at: u.created_at,
    },
    connectors: conns, agents, conversations,
  });
});

/** POST /api/admin/clients/:id/connectors/:connector — config à la place du client. */
router.post('/clients/:id/connectors/:connector', async (req, res) => {
  const u = db.prepare('SELECT id FROM users WHERE id=?').get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Client introuvable.' });
  const result = await saveAndTest(u.id, req.params.connector, req.body || {});
  res.json(result);
});

/** POST /api/admin/clients/:id/welcome-email — (ré)envoi de l'email de bienvenue. */
router.post('/clients/:id/welcome-email', async (req, res) => {
  const u = db.prepare('SELECT name, email, company, sector, plan FROM users WHERE id=?').get(Number(req.params.id));
  if (!u) return res.status(404).json({ error: 'Client introuvable.' });
  const r = await sendWelcomeEmails(u); // sans mot de passe (non stocké en clair)
  res.json({ success: true, result: r });
});

module.exports = router;
