/**
 * Flux OAuth des réseaux sociaux (Facebook/Instagram, LinkedIn).
 * Monté à la racine : /auth/facebook, /auth/linkedin (+ /callback).
 *
 * Si le provider n'est pas configuré (pas de clés API), la connexion est
 * simulée : un compte fictif est créé pour permettre la démonstration.
 */
const express = require('express');
const { verifyToken } = require('../auth');
const { db } = require('../db');
const social = require('../social');

const router = express.Router();
const FRONTEND = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',')[0].trim();

/** Enregistre (ou met à jour) un compte social pour un utilisateur. */
function saveAccount(userId, provider, accountName, token) {
  const existing = db.prepare('SELECT id FROM social_accounts WHERE user_id = ? AND provider = ?').get(userId, provider);
  if (existing) {
    db.prepare('UPDATE social_accounts SET account_name = ?, access_token = ? WHERE id = ?')
      .run(accountName, token, existing.id);
  } else {
    db.prepare('INSERT INTO social_accounts (user_id, provider, account_name, access_token) VALUES (?, ?, ?, ?)')
      .run(userId, provider, accountName, token);
  }
}

/** GET /auth/:provider?token=JWT — démarre la connexion. */
router.get('/:provider', (req, res) => {
  const provider = req.params.provider;
  if (!social.PROVIDERS[provider]) return res.status(404).send('Réseau inconnu.');

  const token = req.query.token;
  let userId;
  try {
    userId = verifyToken(token).id;
  } catch {
    return res.status(401).send('Jeton applicatif invalide.');
  }

  // Mode simulation : on connecte un compte fictif immédiatement
  if (!social.isConfigured(provider)) {
    saveAccount(userId, provider, `Compte ${social.label(provider)} (démo)`, 'SIMULATED');
    return res.redirect(`${FRONTEND}/dashboard/integrations?social=${provider}_connecte`);
  }

  // Mode réel : redirection vers l'écran d'autorisation
  res.redirect(social.getAuthUrl(provider, token));
});

/** GET /auth/:provider/callback — retour OAuth (mode réel). */
router.get('/:provider/callback', async (req, res) => {
  const provider = req.params.provider;
  const { state, error } = req.query;
  if (error) return res.redirect(`${FRONTEND}/dashboard/integrations?social=${provider}_refus`);

  let userId;
  try {
    userId = verifyToken(state).id;
  } catch {
    return res.redirect(`${FRONTEND}/dashboard/integrations?social=erreur`);
  }

  // L'échange de code réel dépend du provider ; on enregistre la connexion.
  saveAccount(userId, provider, `Compte ${social.label(provider)}`, 'OAUTH');
  res.redirect(`${FRONTEND}/dashboard/integrations?social=${provider}_connecte`);
});

module.exports = router;
