/**
 * Routes Dolibarr — configuration, test de connexion, widgets de gestion
 * et export EBP.
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');
const doli = require('../integrations/dolibarr');
const google = require('../google');
const { notify } = require('../notify');

const router = express.Router();
router.use(authMiddleware);

function userRow(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/** GET /api/dolibarr/status — état de la configuration. */
router.get('/status', (req, res) => {
  const u = userRow(req.user.id);
  const config = doli.configFromUser(u);
  res.json({
    configured: doli.isConfigured(config),
    url: u.dolibarr_url || null,
    login: u.dolibarr_login || null,
    compta_email: u.compta_email || null,
  });
});

/**
 * POST /api/dolibarr/config — enregistre la config + teste la connexion.
 * Corps : { url, login, password, apiKey, compta_email }
 */
router.post('/config', async (req, res) => {
  const b = req.body || {};
  const u = userRow(req.user.id);
  db.prepare(
    `UPDATE users SET dolibarr_url=?, dolibarr_login=?, dolibarr_password=?, dolibarr_apikey=?, compta_email=? WHERE id=?`
  ).run(
    b.url ?? u.dolibarr_url, b.login ?? u.dolibarr_login,
    b.password ?? u.dolibarr_password, b.apiKey ?? u.dolibarr_apikey,
    b.compta_email ?? u.compta_email, req.user.id
  );

  // Test automatique de la connexion à la sauvegarde
  const config = doli.configFromUser(userRow(req.user.id));
  if (!config.url) return res.json({ saved: true, tested: false });
  try {
    const t = await doli.testConnection(config);
    res.json({ saved: true, tested: true, success: true, version: t.version });
  } catch (err) {
    res.json({ saved: true, tested: true, success: false, error: err.message });
  }
});

/** POST /api/dolibarr/test — teste la connexion courante. */
router.post('/test', async (req, res) => {
  const config = doli.configFromUser(userRow(req.user.id));
  try {
    const t = await doli.testConnection(config);
    res.json({ success: true, version: t.version });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/** GET /api/dolibarr/dashboard — widgets : CA, impayées, devis en attente. */
router.get('/dashboard', async (req, res) => {
  const config = doli.configFromUser(userRow(req.user.id));
  try {
    const factures = await doli.getFactures(config);
    const devis = await doli.getDevis(config);
    const arr = Array.isArray(factures) ? factures : [];
    const caMois = arr.filter((f) => Number(f.status) >= 1).reduce((s, f) => s + Number(f.total_ttc || 0), 0);
    const impayees = arr.filter((f) => Number(f.paye) === 0 && Number(f.status) >= 1);
    const devisAttente = (Array.isArray(devis) ? devis : []).filter((d) => Number(d.status) <= 1);
    res.json({
      configured: doli.isConfigured(config),
      simulated: Boolean(factures._simulated),
      url: userRow(req.user.id).dolibarr_url || null,
      ca_mois: caMois,
      impayees: { count: impayees.length, montant: impayees.reduce((s, f) => s + Number(f.total_ttc || 0), 0) },
      devis: { count: devisAttente.length, montant: devisAttente.reduce((s, d) => s + Number(d.total_ttc || 0), 0) },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/dolibarr/export-ebp — génère l'export EBP d'un mois et l'envoie
 * par email (si Gmail connecté), puis l'enregistre dans Mes documents.
 * Corps : { month? } au format YYYY-MM (par défaut : mois en cours).
 */
router.post('/export-ebp', async (req, res) => {
  const u = userRow(req.user.id);
  const config = doli.configFromUser(u);
  const month = (req.body && req.body.month) || new Date().toISOString().slice(0, 7);
  const dateDebut = `${month}-01`;
  const dateFin = `${month}-31`;

  try {
    const exp = await doli.exportEBP(config, dateDebut, dateFin);

    // Enregistre dans la bibliothèque de documents
    db.prepare('INSERT INTO documents (user_id, type, agent_id, title, content) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.id, 'Export comptable', 'comptable', exp.filename, '```\n' + exp.csv + '\n```');

    // Envoi par email si possible (Gmail connecté + email configuré)
    let emailed = false;
    const dest = u.compta_email || u.email;
    if (dest && google.getAccount && google.getAccount(req.user.id)) {
      try {
        await google.sendGmail(req.user.id, {
          to: dest,
          subject: `Export EBP ${month} — AutoPilote`,
          body: `Bonjour,\n\nVeuillez trouver l'export comptable EBP du mois ${month}.\n\n${exp.csv}\n\n— AutoPilote (Comptable)`,
        });
        emailed = true;
      } catch (_) { /* ignore */ }
    }

    notify(req.user.id, `Export EBP ${month} généré${emailed ? ' et envoyé par email' : ''} ✓`, '📊');
    res.json({ success: true, filename: exp.filename, count: exp.count, simulated: exp.simulated, emailed });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
