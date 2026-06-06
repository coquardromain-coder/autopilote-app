/**
 * Registre central des connecteurs AutoPilote.
 * Décrit chaque intégration : nom, icône, description, agents activés,
 * champs de configuration et type de test de connexion.
 */
const connectors = {
  dolibarr: {
    name: 'Dolibarr', icon: '📒', description: 'ERP & Comptabilité',
    agents: ['Deviseur', 'Comptable', 'Commercial', 'Analyste'],
    fields: ['url', 'apikey'], testEndpoint: '/api/index.php/version',
  },
  whatsapp: {
    name: 'WhatsApp Business', icon: '💬', description: 'Messagerie & pilotage vocal',
    agents: ['Directeur', 'Assistance', 'Relance'],
    fields: ['phoneNumberId', 'accessToken', 'verifyToken'], testEndpoint: 'meta_graph_api',
  },
  opensign: {
    name: 'Signature électronique', icon: '✍️', description: 'Signature de devis et contrats',
    agents: ['Deviseur', 'Juriste', 'Comptable'],
    fields: ['url', 'apikey', 'senderEmail'], testEndpoint: '/api/app/classes/_User',
  },
  docuseal: {
    name: 'DocuSeal', icon: '🖋️', description: 'Signature électronique (auto-hébergée)',
    agents: ['Deviseur', 'Juriste', 'Comptable'],
    fields: ['url', 'apikey'], testEndpoint: '/api/templates',
  },
  fonoster: {
    name: 'Téléphonie', icon: '📞', description: 'Appels et SMS automatiques',
    agents: ['Vocal', 'Relance', 'Commercial'],
    fields: ['url', 'accessKeyId', 'accessKeySecret', 'phoneNumber'], testEndpoint: 'fonoster_api',
  },
  searchconsole: {
    name: 'Search Console', icon: '🔍', description: 'Référencement Google',
    agents: ['Référenceur', 'Analyste'],
    fields: ['siteUrl'], oauth: 'google', testEndpoint: 'google_oauth',
  },
  analytics: {
    name: 'Google Analytics', icon: '📊', description: 'Trafic et conversions',
    agents: ['Analyste', 'Stratège'],
    fields: ['propertyId'], oauth: 'google', testEndpoint: 'google_oauth',
  },
  googlebusiness: {
    name: 'Google Business', icon: '📍', description: 'Fiche Google & avis clients',
    agents: ['Community', 'Assistance'],
    fields: ['locationId'], oauth: 'google', testEndpoint: 'google_oauth',
  },
  hunterio: {
    name: 'Hunter.io', icon: '🎯', description: 'Recherche d\'emails pros',
    agents: ['Chasseur'],
    fields: ['apikey'], testEndpoint: 'hunter_api',
  },
  wordpress: {
    name: 'WordPress', icon: '📝', description: 'Blog & articles SEO',
    agents: ['Référenceur', 'Créatif'],
    fields: ['url', 'username', 'password'], testEndpoint: '/wp-json/wp/v2/posts',
  },
  meta: {
    name: 'Facebook & Instagram', icon: '📱', description: 'Publication réseaux sociaux',
    agents: ['Créatif', 'Community'],
    fields: [], oauth: 'meta', testEndpoint: 'meta_oauth',
  },
  linkedin: {
    name: 'LinkedIn', icon: '💼', description: 'Prospection & publication',
    agents: ['Chasseur', 'Créatif', 'Community'],
    fields: [], oauth: 'linkedin', testEndpoint: 'linkedin_oauth',
  },
  stripe: {
    name: 'Stripe', icon: '💳', description: 'Paiements en ligne',
    agents: ['Comptable', 'Deviseur'],
    fields: ['publicKey', 'secretKey'], testEndpoint: 'stripe_api',
  },
  dolibarr_export: {
    name: 'Export EBP', icon: '📤', description: 'Export mensuel vers EBP',
    agents: ['Comptable'],
    fields: ['email_compta'], testEndpoint: null,
  },
};

/** Liste publique (pour l'UI) : tableau ordonné avec id inclus. */
function listConnectors() {
  return Object.entries(connectors).map(([id, c]) => ({ id, ...c }));
}

/** Message uniforme quand un connecteur n'est pas configuré. */
function notConfiguredMessage(connectorId, action = 'réaliser cette action') {
  const c = connectors[connectorId];
  const name = c ? c.name : connectorId;
  return `Pour ${action}, connectez ${name} dans Paramètres → Intégrations → ${name}. Moins de 2 minutes ✓`;
}

module.exports = { connectors, listConnectors, notConfiguredMessage };
