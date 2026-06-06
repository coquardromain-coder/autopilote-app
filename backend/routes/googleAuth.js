/**
 * Flux d'autorisation Google OAuth 2.0.
 *
 * Ces routes sont montées à la racine (/auth/google et
 * /auth/google/callback) afin de correspondre exactement à l'URI de
 * redirection déclarée dans la Google Cloud Console.
 *
 * Comme le callback est une simple redirection navigateur (sans en-tête
 * Authorization), on identifie l'utilisateur via le paramètre `state`,
 * qui contient son JWT applicatif signé.
 */
const express = require('express');
const { verifyToken } = require('../auth');
const google = require('../google');

const router = express.Router();

// FRONTEND_ORIGIN peut contenir plusieurs origines (CORS) séparées par
// des virgules ; pour les redirections OAuth on utilise la première.
const FRONTEND =
  (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
    .split(',')[0]
    .trim();

/**
 * GET /auth/google?token=<JWT>
 * Démarre la connexion : valide le JWT applicatif puis redirige vers
 * l'écran de consentement Google (le JWT est transmis via `state`).
 */
router.get('/google', (req, res) => {
  if (!google.isConfigured()) {
    return res.status(503).send('Intégration Google non configurée sur le serveur.');
  }
  const token = req.query.token;
  if (!token) {
    return res.status(400).send('Jeton applicatif manquant.');
  }
  try {
    verifyToken(token); // valide l'utilisateur
  } catch {
    return res.status(401).send('Jeton applicatif invalide ou expiré.');
  }
  const url = google.getAuthUrl(token);
  res.redirect(url);
});

/**
 * GET /auth/google/callback?code=...&state=<JWT>
 * Point de retour après consentement : échange le code, enregistre les
 * tokens pour l'utilisateur, puis renvoie vers le frontend.
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // L'utilisateur a refusé l'autorisation
  if (error) {
    return res.redirect(`${FRONTEND}/dashboard/integrations?google=refus`);
  }
  if (!code || !state) {
    return res.redirect(`${FRONTEND}/dashboard/integrations?google=erreur`);
  }

  // Identifie l'utilisateur à partir du state (JWT)
  let userId;
  try {
    userId = verifyToken(state).id;
  } catch {
    return res.redirect(`${FRONTEND}/dashboard/integrations?google=session`);
  }

  try {
    const { tokens, email } = await google.exchangeCode(code);
    google.saveTokens(userId, tokens, email);
    res.redirect(`${FRONTEND}/dashboard/integrations?google=connecte`);
  } catch (err) {
    console.error('[Google] Échec de l\'échange du code :', err.message);
    res.redirect(`${FRONTEND}/dashboard/integrations?google=erreur`);
  }
});

module.exports = router;
