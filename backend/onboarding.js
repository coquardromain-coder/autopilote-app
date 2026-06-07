/**
 * Moteur d'onboarding intelligent.
 * - Définit les OUTILS proposés selon le PACK.
 * - Calcule l'état de connexion de chaque outil pour un utilisateur.
 * - Déduit l'ACTIVATION de chaque agent selon ses connecteurs requis/optionnels.
 */
const { db } = require('./db');
const google = require('./google');
const store = require('./connectors/store');

// ─────────────────── Catalogue des outils d'onboarding ───────────────────
// kind : google (OAuth Google) | google_field (Google + champ) | social | connector
const TOOLS = {
  gmail:        { name: 'Gmail', icon: '📧', kind: 'google', activates: ['Directeur', 'Assistance', 'Relance'] },
  calendar:     { name: 'Google Calendar', icon: '📅', kind: 'google', activates: ['Coordinateur', 'Commercial'] },
  dolibarr:     { name: 'Dolibarr', icon: '📒', kind: 'connector', fields: ['url', 'apikey'], activates: ['Deviseur', 'Comptable', 'Commercial'] },
  whatsapp:     { name: 'WhatsApp Business', icon: '💬', kind: 'connector', fields: ['phoneNumberId', 'accessToken', 'verifyToken'], help: 'https://business.facebook.com/wa/manage/', activates: ['Directeur', 'Relance'] },
  drive:        { name: 'Google Drive', icon: '📁', kind: 'google', activates: ['Créatif', 'Juriste'] },
  hunterio:     { name: 'Hunter.io', icon: '🎯', kind: 'connector', fields: ['apikey'], help: 'https://hunter.io/users/sign_up', activates: ['Chasseur'] },
  meta:         { name: 'Facebook / Instagram', icon: '📱', kind: 'social', provider: 'facebook', activates: ['Créatif', 'Community'] },
  linkedin:     { name: 'LinkedIn', icon: '💼', kind: 'social', provider: 'linkedin', activates: ['Chasseur', 'Community'] },
  googlebusiness:{ name: 'Google Business Profile', icon: '📍', kind: 'google_field', fields: ['locationId'], activates: ['Community', 'Assistance'] },
  wordpress:    { name: 'WordPress', icon: '📝', kind: 'connector', fields: ['url', 'username', 'password'], activates: ['Référenceur'] },
  stripe:       { name: 'Stripe', icon: '💳', kind: 'connector', fields: ['publicKey', 'secretKey'], activates: ['Comptable', 'Deviseur'] },
  docuseal:     { name: 'Signature (DocuSeal/YouSign)', icon: '✍️', kind: 'connector', fields: ['url', 'apikey'], activates: ['Juriste', 'Deviseur'] },
  analytics:    { name: 'Google Analytics', icon: '📊', kind: 'google_field', fields: ['propertyId'], activates: ['Analyste', 'Stratège'] },
  searchconsole:{ name: 'Google Search Console', icon: '🔍', kind: 'google_field', fields: ['siteUrl'], activates: ['Référenceur', 'Analyste'] },
};

// Outils par pack (cumulatif)
const PACK_TOOLS = {
  starter: ['gmail', 'calendar', 'dolibarr'],
  business: ['gmail', 'calendar', 'dolibarr', 'whatsapp', 'drive', 'hunterio'],
  elite: ['gmail', 'calendar', 'dolibarr', 'whatsapp', 'drive', 'hunterio', 'meta', 'linkedin', 'googlebusiness', 'wordpress'],
  agence: ['gmail', 'calendar', 'dolibarr', 'whatsapp', 'drive', 'hunterio', 'meta', 'linkedin', 'googlebusiness', 'wordpress', 'stripe', 'docuseal', 'analytics', 'searchconsole'],
};

// Connecteurs requis / optionnels par agent (ids d'outils)
const AGENT_REQUIREMENTS = {
  directeur:    { required: ['gmail'], optional: ['whatsapp'] },
  commercial:   { required: ['calendar'], optional: ['dolibarr'] },
  chasseur:     { required: ['gmail'], optional: ['linkedin', 'hunterio'] },
  assistance:   { required: ['gmail'], optional: ['googlebusiness'] },
  creatif:      { required: ['drive'], optional: ['meta'] },
  vocal:        { required: [], optional: [] },
  relance:      { required: ['gmail'], optional: ['whatsapp'] },
  coordinateur: { required: ['calendar'], optional: [] },
  analyste:     { required: ['analytics'], optional: ['searchconsole'] },
  comptable:    { required: ['dolibarr'], optional: ['stripe'] },
  deviseur:     { required: ['dolibarr'], optional: ['stripe', 'docuseal'] },
  recruteur:    { required: [], optional: [] },
  juriste:      { required: ['drive'], optional: ['docuseal'] },
  referenceur:  { required: ['wordpress'], optional: ['searchconsole'] },
  community:    { required: ['meta'], optional: ['linkedin', 'googlebusiness'] },
  formateur:    { required: [], optional: [] },
  stratege:     { required: ['analytics'], optional: [] },
  technicien:   { required: [], optional: [] },
  assistant:    { required: [], optional: [] },
};

/** Outils proposés pour un pack (défaut starter). */
function toolsForPack(plan) {
  return PACK_TOOLS[plan] || PACK_TOOLS.starter;
}

/** Indique si un outil donné est connecté pour l'utilisateur. */
function isToolConnected(userId, toolId) {
  const tool = TOOLS[toolId];
  if (!tool) return false;
  const googleOk = Boolean(google.getAccount(userId));
  switch (tool.kind) {
    case 'google':
      return googleOk;
    case 'google_field': {
      const cfg = store.getConfig(userId, toolId);
      return googleOk && Object.keys(cfg).length > 0;
    }
    case 'social': {
      const row = db.prepare('SELECT 1 FROM social_accounts WHERE user_id = ? AND provider = ?').get(userId, tool.provider);
      return Boolean(row);
    }
    case 'connector': {
      if (toolId === 'dolibarr') {
        const u = db.prepare('SELECT dolibarr_url, dolibarr_apikey FROM users WHERE id = ?').get(userId);
        if (u && u.dolibarr_url && u.dolibarr_apikey) return true;
      }
      return store.statusMap(userId)[toolId] === 'connecte';
    }
    default:
      return false;
  }
}

/** Ensemble des outils connectés pour l'utilisateur. */
function connectedTools(userId) {
  const set = new Set();
  for (const id of Object.keys(TOOLS)) if (isToolConnected(userId, id)) set.add(id);
  return set;
}

/** Liste des outils du pack avec leur statut de connexion. */
function packToolsStatus(userId, plan) {
  const connected = connectedTools(userId);
  return toolsForPack(plan).map((id) => ({
    id, ...TOOLS[id],
    status: connected.has(id) ? 'connecte' : 'non_configure',
  }));
}

/**
 * Statut d'activation de chaque agent.
 * - inactif : tous les requis non connectés
 * - basique : requis OK mais optionnels manquants
 * - complet : requis + optionnels OK
 * - actif   : agent sans dépendance
 */
function agentActivation(userId) {
  const connected = connectedTools(userId);
  const result = {};
  for (const [agentId, req] of Object.entries(AGENT_REQUIREMENTS)) {
    const required = req.required || [];
    const optional = req.optional || [];
    if (required.length === 0) {
      result[agentId] = { status: 'actif', label: 'Actif' };
      continue;
    }
    const reqOk = required.every((t) => connected.has(t));
    if (!reqOk) { result[agentId] = { status: 'inactif', label: 'Inactif' }; continue; }
    const optOk = optional.every((t) => connected.has(t));
    result[agentId] = optOk
      ? { status: 'complet', label: 'Actif (complet)' }
      : { status: 'basique', label: 'Actif (basique)' };
  }
  return result;
}

module.exports = { TOOLS, PACK_TOOLS, AGENT_REQUIREMENTS, toolsForPack, packToolsStatus, agentActivation, connectedTools };
