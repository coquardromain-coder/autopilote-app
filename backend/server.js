/**
 * Serveur principal AutoPilote (Express).
 * Point d'entrée du backend : configure les middlewares, monte les
 * routes et démarre l'écoute HTTP.
 */
// override: true garantit que les valeurs du fichier .env ont priorité
// sur d'éventuelles variables d'environnement héritées (ex: une clé vide).
require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./db');
const { isLive, MODEL } = require('./anthropic');
const googleLib = require('./google');

// Initialise le schéma de la base de données dès le démarrage
initSchema();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// Middlewares globaux
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

// Journalisation simple des requêtes
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Route de santé / statut
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'AutoPilote API',
    iaMode: isLive() ? 'live' : 'demo',
    model: MODEL,
    google: googleLib.isConfigured() ? 'configuré' : 'non configuré',
  });
});

// Montage des routes
// Flux OAuth Google monté à la racine (correspond à l'URI de redirection)
app.use('/auth', require('./routes/googleAuth'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/google', require('./routes/google'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/analytics', require('./routes/analytics'));

// Gestion des routes inconnues
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

// Gestionnaire d'erreurs global
app.use((err, _req, res, _next) => {
  console.error('[Erreur]', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

app.listen(PORT, () => {
  console.log('────────────────────────────────────────────');
  console.log(`  AutoPilote API démarrée sur http://localhost:${PORT}`);
  console.log(`  Mode IA : ${isLive() ? 'LIVE (Anthropic)' : 'DÉMONSTRATION (sans clé API)'}`);
  console.log(`  Modèle  : ${MODEL}`);
  console.log(`  Google  : ${googleLib.isConfigured() ? 'configuré (Gmail, Calendar, Drive)' : 'non configuré'}`);
  console.log('────────────────────────────────────────────');
});
