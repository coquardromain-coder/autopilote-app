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

// CORS configurable. FRONTEND_ORIGIN peut contenir plusieurs origines
// séparées par des virgules (ex: "https://app.exemple.fr,http://localhost:3000").
//
// Les origines de cette liste de base sont TOUJOURS autorisées (même si
// FRONTEND_ORIGIN est défini autrement dans l'hébergeur), pour éviter une
// mauvaise config d'env qui casserait la prod. FRONTEND_ORIGIN vient s'y ajouter.
const BASE_ORIGINS = [
  'https://autopilote.famcofinances.com',                       // domaine de prod
  'http://ruo4s93g0vwuv3ogm0ayatpl.157.180.72.230.sslip.io',    // ancien domaine sslip
  'http://localhost:3000',                                      // développement local
];
const ENV_ORIGINS = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Union sans doublon
const ALLOWED_ORIGINS = [...new Set([...BASE_ORIGINS, ...ENV_ORIGINS])];

// Middlewares globaux
app.use(
  cors({
    // Autorise les origines listées. Les requêtes sans en-tête Origin
    // (curl, appels serveur à serveur, health checks) sont acceptées.
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Origine non autorisée : on n'émet aucun en-tête CORS (le navigateur
      // bloquera la requête) sans générer d'erreur 500 ni polluer les logs.
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
// Parsing urlencoded (webhooks Twilio envoient du x-www-form-urlencoded)
app.use(express.urlencoded({ extended: false }));

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
// Flux OAuth montés à la racine (Google d'abord, puis réseaux sociaux)
app.use('/auth', require('./routes/googleAuth'));
app.use('/auth', require('./routes/socialAuth'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/google', require('./routes/google'));
app.use('/api/config', require('./routes/config'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/social', require('./routes/social'));
app.use('/api/content', require('./routes/content'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/dolibarr', require('./routes/dolibarr'));
app.use('/api/connectors', require('./routes/connectors'));
app.use('/api/onboarding', require('./routes/onboarding'));
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
  console.log(`  CORS    : ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('────────────────────────────────────────────');
  // Démarre le planificateur d'export EBP mensuel
  try { require('./scheduler').start(); } catch (e) { console.error('[Scheduler]', e.message); }
});
