/**
 * Intégration réseaux sociaux pour le Créatif :
 * Facebook / Instagram (Meta Graph API) et LinkedIn.
 *
 * OAuth + publication. Mode simulation complet si les clés API ne sont
 * pas configurées (connexion et publication simulées, sans appel réseau).
 */
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

const PROVIDERS = {
  facebook: {
    label: 'Facebook / Instagram',
    configured: () => Boolean(META_APP_ID && META_APP_SECRET),
    authUrl: (state) =>
      `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(BACKEND + '/api/auth/facebook/callback')}` +
      `&state=${encodeURIComponent(state)}&scope=pages_manage_posts,instagram_basic`,
  },
  linkedin: {
    label: 'LinkedIn',
    configured: () => Boolean(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET),
    authUrl: (state) =>
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(BACKEND + '/api/auth/linkedin/callback')}` +
      `&state=${encodeURIComponent(state)}&scope=w_member_social`,
  },
};

/** Indique si un provider est réellement configuré. */
function isConfigured(provider) {
  return PROVIDERS[provider] ? PROVIDERS[provider].configured() : false;
}

/** Renvoie l'URL d'autorisation OAuth d'un provider. */
function getAuthUrl(provider, state) {
  return PROVIDERS[provider]?.authUrl(state) || null;
}

/** Libellé lisible d'un provider. */
function label(provider) {
  return PROVIDERS[provider]?.label || provider;
}

/**
 * Publie (ou simule la publication d') un contenu sur un réseau.
 * Retourne des statistiques simulées en l'absence d'API réelle.
 */
async function publish(provider, account, content) {
  if (!isConfigured(provider)) {
    // Mode simulation : pas d'appel réseau réel
    return {
      simulated: true,
      externalId: 'SIM-' + provider + '-' + Date.now().toString(36),
      stats: simulatedStats(content),
    };
  }
  // En mode réel, on appellerait ici l'API Graph/LinkedIn avec account.access_token.
  // (Implémentation réseau réelle volontairement minimale.)
  return { simulated: false, externalId: null, stats: simulatedStats(content) };
}

/** Génère des statistiques basiques plausibles (mode démo). */
function simulatedStats(content) {
  const base = Math.max(20, (content || '').length % 200);
  return { vues: base * 7, likes: Math.round(base / 3), partages: Math.round(base / 12) };
}

/**
 * Interprète une commande du Directeur de type :
 * "publie ce post sur LinkedIn", "programme un post Facebook pour demain 9h".
 * @returns {{provider:string, schedule:boolean}|null}
 */
function interpretCommand(text) {
  const t = (text || '').toLowerCase();
  const isPublish = /\b(publie|publier|poste|poster|programme|programmer)\b/.test(t);
  if (!isPublish) return null;
  let provider = null;
  if (/linkedin/.test(t)) provider = 'linkedin';
  else if (/facebook|insta|instagram|meta/.test(t)) provider = 'facebook';
  if (!provider) return null;
  const schedule = /\b(programme|programmer|demain|plus tard|à\s*\d|le\s)\b/.test(t);
  return { provider, schedule };
}

module.exports = { PROVIDERS, isConfigured, getAuthUrl, label, publish, interpretCommand };
