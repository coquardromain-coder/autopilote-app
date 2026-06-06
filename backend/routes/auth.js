/**
 * Routes d'authentification : inscription, connexion, profil.
 */
const express = require('express');
const { db } = require('../db');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  authMiddleware,
} = require('../auth');

const router = express.Router();

/** POST /api/auth/register — création de compte. */
router.post('/register', (req, res) => {
  const { email, password, name, company } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, mot de passe et nom sont requis.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  // Vérifie l'unicité de l'email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });
  }

  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, company)
       VALUES (?, ?, ?, ?)`
    )
    .run(email, hashPassword(password), name, company || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = generateToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

/** POST /api/auth/login — connexion. */
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const token = generateToken(user);
  res.json({ token, user: publicUser(user) });
});

/** GET /api/auth/me — profil de l'utilisateur connecté. */
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user: publicUser(user) });
});

/** PATCH /api/auth/me — met à jour le profil, l'entreprise et l'onboarding. */
router.patch('/me', authMiddleware, (req, res) => {
  const b = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  // Les prestations sont stockées en JSON
  let prestations = user.prestations;
  if (b.prestations !== undefined) {
    prestations = JSON.stringify(Array.isArray(b.prestations) ? b.prestations : []);
  }

  db.prepare(
    `UPDATE users SET
       name = ?, company = ?, onboarded = ?,
       sector = ?, siret = ?, address = ?, logo = ?, brief = ?,
       vat_rate = ?, prestations = ?
     WHERE id = ?`
  ).run(
    b.name ?? user.name,
    b.company ?? user.company,
    b.onboarded !== undefined ? (b.onboarded ? 1 : 0) : user.onboarded,
    b.sector ?? user.sector,
    b.siret ?? user.siret,
    b.address ?? user.address,
    b.logo ?? user.logo,
    b.brief ?? user.brief,
    b.vat_rate != null ? Number(b.vat_rate) : user.vat_rate,
    prestations,
    user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ user: publicUser(updated) });
});

/** Filtre les champs sensibles avant de renvoyer un utilisateur. */
function publicUser(u) {
  let prestations = [];
  try { prestations = JSON.parse(u.prestations || '[]'); } catch { prestations = []; }
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    company: u.company,
    role: u.role,
    plan: u.plan,
    onboarded: Boolean(u.onboarded),
    // Informations entreprise
    sector: u.sector || null,
    siret: u.siret || null,
    address: u.address || null,
    logo: u.logo || null,
    brief: u.brief || null,
    vat_rate: u.vat_rate != null ? u.vat_rate : 20,
    prestations,
    created_at: u.created_at,
  };
}

module.exports = router;
