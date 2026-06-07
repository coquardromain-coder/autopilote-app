/**
 * Routes d'onboarding intelligent : état (outils du pack + activation des
 * agents + exemples secteur), sauvegarde de progression, provisioning Dolibarr.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const { packToolsStatus, agentActivation } = require('../onboarding');
const { getExamples } = require('../sectors');
const { listAgents } = require('../agents/registry');
const store = require('../connectors/store');
const { notify } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

function userRow(id) { return db.prepare('SELECT * FROM users WHERE id = ?').get(id); }

/** GET /api/onboarding — tout l'état nécessaire à l'assistant. */
router.get('/', (req, res) => {
  const u = userRow(req.user.id);
  const plan = u.plan || 'starter';
  const activation = agentActivation(req.user.id);
  const agents = listAgents().map((a) => ({
    id: a.id, name: a.name, avatar: a.avatar, role: a.role, category: a.category,
    activation: activation[a.id] || { status: 'actif', label: 'Actif' },
  }));
  res.json({
    plan,
    tools: packToolsStatus(req.user.id, plan),
    agents,
    sectorExamples: getExamples(u.sector),
    step: u.onboarding_step || 0,
    dolibarrProvisioned: Boolean(u.dolibarr_provisioned),
    user: {
      company: u.company, siret: u.siret, address: u.address, phone: u.phone,
      logo: u.logo, sector: u.sector, billing_email: u.billing_email,
      brief: u.brief, tone: u.tone, email_signature: u.email_signature,
      vat_rate: u.vat_rate, onboarded: Boolean(u.onboarded),
      prestations: safeJson(u.prestations),
    },
  });
});

/** PATCH /api/onboarding — sauvegarde de progression (auto-save). */
router.patch('/', (req, res) => {
  const b = req.body || {};
  const u = userRow(req.user.id);
  const prestations = b.prestations !== undefined
    ? JSON.stringify(Array.isArray(b.prestations) ? b.prestations : [])
    : u.prestations;

  db.prepare(
    `UPDATE users SET
       company=?, siret=?, address=?, phone=?, logo=?, sector=?, billing_email=?,
       brief=?, tone=?, email_signature=?, vat_rate=?, prestations=?,
       onboarding_step=?, onboarded=?
     WHERE id=?`
  ).run(
    b.company ?? u.company, b.siret ?? u.siret, b.address ?? u.address,
    b.phone ?? u.phone, b.logo ?? u.logo, b.sector ?? u.sector,
    b.billing_email ?? u.billing_email, b.brief ?? u.brief, b.tone ?? u.tone,
    b.email_signature ?? u.email_signature,
    b.vat_rate != null ? Number(b.vat_rate) : u.vat_rate, prestations,
    b.step != null ? Number(b.step) : u.onboarding_step,
    b.onboarded !== undefined ? (b.onboarded ? 1 : 0) : u.onboarded,
    req.user.id
  );
  res.json({ saved: true });
});

/**
 * POST /api/onboarding/dolibarr — Option A : espace Dolibarr mutualisé.
 * Si une instance partagée est configurée (env SHARED_DOLIBARR_*), on l'associe
 * au compte ; sinon on marque l'espace comme "à configurer".
 */
router.post('/dolibarr', (req, res) => {
  const url = process.env.SHARED_DOLIBARR_URL;
  const apikey = process.env.SHARED_DOLIBARR_APIKEY;
  if (url && apikey) {
    db.prepare('UPDATE users SET dolibarr_url=?, dolibarr_apikey=?, dolibarr_provisioned=1 WHERE id=?')
      .run(url, apikey, req.user.id);
    store.setConfig(req.user.id, 'dolibarr', { url, apikey }, 'connecte');
    notify(req.user.id, 'Votre espace Dolibarr mutualisé est prêt ✓', '📒');
    return res.json({ success: true, mode: 'mutualise', message: 'Espace Dolibarr mutualisé activé.' });
  }
  // Pas d'instance partagée configurée : on marque provisionné mais à finaliser
  db.prepare('UPDATE users SET dolibarr_provisioned=1 WHERE id=?').run(req.user.id);
  res.json({
    success: true, mode: 'manuel',
    message: 'Espace réservé. Renseignez l\'URL et la clé API Dolibarr dans Intégrations pour finaliser.',
  });
});

function safeJson(s) { try { return JSON.parse(s || '[]'); } catch { return []; } }

module.exports = router;
