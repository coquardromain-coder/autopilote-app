/**
 * Routes de facturation et devis (agents Comptable & Deviseur)
 * ainsi que la gestion des abonnements (paiements SIMULÉS, pas de Stripe).
 */
const express = require('express');
const { db } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// Tarifs des packs (en euros / mois)
const PLANS = {
  essentiel: { label: 'Pack Essentiel', price: 297 },
  croissance: { label: 'Pack Croissance', price: 749 },
  elite: { label: 'Pack Elite', price: 1149 },
  illimite: { label: 'Pack Illimité', price: 1490 },
};

// ─────────────────── FACTURES (Comptable) ───────────────────

/** GET /api/billing/invoices */
router.get('/invoices', (req, res) => {
  const invoices = db
    .prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ invoices });
});

/** POST /api/billing/invoices */
router.post('/invoices', (req, res) => {
  const { client_name, amount, due_date, status } = req.body || {};
  if (!client_name || amount == null) {
    return res.status(400).json({ error: 'Client et montant requis.' });
  }
  const number = 'FACT-' + Date.now().toString().slice(-8);
  const info = db
    .prepare(
      `INSERT INTO invoices (user_id, number, client_name, amount, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, number, client_name, Number(amount),
      status || 'brouillon', due_date || null);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ invoice });
});

/** PATCH /api/billing/invoices/:id — change le statut (ex: marquer payée). */
router.patch('/invoices/:id', (req, res) => {
  const inv = db
    .prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!inv) return res.status(404).json({ error: 'Facture introuvable.' });
  const { status, amount, client_name } = req.body || {};
  db.prepare('UPDATE invoices SET status=?, amount=?, client_name=? WHERE id=?').run(
    status ?? inv.status, amount ?? inv.amount, client_name ?? inv.client_name, inv.id
  );
  res.json({ invoice: db.prepare('SELECT * FROM invoices WHERE id = ?').get(inv.id) });
});

/** DELETE /api/billing/invoices/:id */
router.delete('/invoices/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM invoices WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Facture introuvable.' });
  res.json({ success: true });
});

// ─────────────────── DEVIS (Deviseur) ───────────────────

/** GET /api/billing/quotes */
router.get('/quotes', (req, res) => {
  const quotes = db
    .prepare('SELECT * FROM quotes WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ quotes });
});

/** POST /api/billing/quotes */
router.post('/quotes', (req, res) => {
  const { client_name, amount, content, status } = req.body || {};
  if (!client_name || amount == null) {
    return res.status(400).json({ error: 'Client et montant requis.' });
  }
  const number = 'DEVIS-' + Date.now().toString().slice(-8);
  const info = db
    .prepare(
      `INSERT INTO quotes (user_id, number, client_name, amount, status, content)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, number, client_name, Number(amount),
      status || 'brouillon', content || null);
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ quote });
});

/** PATCH /api/billing/quotes/:id */
router.patch('/quotes/:id', (req, res) => {
  const q = db
    .prepare('SELECT * FROM quotes WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!q) return res.status(404).json({ error: 'Devis introuvable.' });
  const { status, amount, client_name, content } = req.body || {};
  db.prepare('UPDATE quotes SET status=?, amount=?, client_name=?, content=? WHERE id=?').run(
    status ?? q.status, amount ?? q.amount, client_name ?? q.client_name,
    content ?? q.content, q.id
  );
  res.json({ quote: db.prepare('SELECT * FROM quotes WHERE id = ?').get(q.id) });
});

/** DELETE /api/billing/quotes/:id */
router.delete('/quotes/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM quotes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Devis introuvable.' });
  res.json({ success: true });
});

// ─────────────────── ABONNEMENTS (paiements simulés) ───────────────────

/** GET /api/billing/plans — liste des packs et tarifs. */
router.get('/plans', (req, res) => {
  res.json({ plans: PLANS });
});

/** GET /api/billing/subscription — abonnement actif de l'utilisateur. */
router.get('/subscription', (req, res) => {
  const sub = db
    .prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.user.id);
  res.json({ subscription: sub || null });
});

/**
 * POST /api/billing/subscribe — souscrit à un pack (PAIEMENT SIMULÉ).
 * Aucun appel à un prestataire externe : on enregistre simplement
 * l'abonnement et on met à jour le plan de l'utilisateur.
 */
router.post('/subscribe', (req, res) => {
  const { plan } = req.body || {};
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Pack inconnu.' });
  }

  // Annule l'abonnement actif précédent
  db.prepare(
    `UPDATE subscriptions SET status = 'annule' WHERE user_id = ? AND status = 'active'`
  ).run(req.user.id);

  // Crée le nouvel abonnement (simulé)
  const info = db
    .prepare(
      `INSERT INTO subscriptions (user_id, plan, price, status)
       VALUES (?, ?, ?, 'active')`
    )
    .run(req.user.id, plan, PLANS[plan].price);

  // Met à jour le plan de l'utilisateur
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.user.id);

  const subscription = db
    .prepare('SELECT * FROM subscriptions WHERE id = ?')
    .get(info.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: `Paiement simulé accepté — abonnement « ${PLANS[plan].label} » activé.`,
    subscription,
  });
});

module.exports = router;
