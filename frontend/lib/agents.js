/**
 * Métadonnées d'affichage des agents (miroir du registre backend).
 * Sert à présenter les agents sur le site et dans le dashboard.
 */
export const AGENTS = [
  // Orchestrateur
  { id: 'directeur', name: 'Directeur', role: 'Orchestrateur central', category: 'orchestrateur', avatar: '🎯' },

  // AutoPilote (8)
  { id: 'commercial', name: 'Commercial', role: 'Onboarding & CRM', category: 'autopilote', avatar: '🤝' },
  { id: 'chasseur', name: 'Chasseur', role: 'Prospection commerciale', category: 'autopilote', avatar: '🚀' },
  { id: 'assistance', name: 'Assistance', role: 'Support client', category: 'autopilote', avatar: '💬' },
  { id: 'creatif', name: 'Créatif', role: 'Création de contenu', category: 'autopilote', avatar: '✍️' },
  { id: 'vocal', name: 'Vocal', role: 'Téléphonie & appels', category: 'autopilote', avatar: '📞' },
  { id: 'relance', name: 'Relance', role: 'Relances & suivi', category: 'autopilote', avatar: '🔔' },
  { id: 'coordinateur', name: 'Coordinateur', role: 'Coordination interne', category: 'autopilote', avatar: '🧩' },
  { id: 'analyste', name: 'Analyste', role: 'Reporting & analytics', category: 'autopilote', avatar: '📊' },

  // Compta Pilote
  { id: 'comptable', name: 'Comptable', role: 'Comptabilité & facturation', category: 'compta', avatar: '🧾' },

  // Devis Pilote
  { id: 'deviseur', name: 'Deviseur', role: 'Génération de devis', category: 'devis', avatar: '📄' },

  // Modules à la carte (8)
  { id: 'recruteur', name: 'Recruteur', role: 'Ressources humaines', category: 'module', avatar: '👥' },
  { id: 'juriste', name: 'Juriste', role: 'Juridique & conformité', category: 'module', avatar: '⚖️' },
  { id: 'referenceur', name: 'Référenceur', role: 'SEO & contenu éditorial', category: 'module', avatar: '📣' },
  { id: 'community', name: 'Community', role: 'Réseaux sociaux', category: 'module', avatar: '🌸' },
  { id: 'formateur', name: 'Formateur', role: 'Formation & accompagnement', category: 'module', avatar: '🎓' },
  { id: 'stratege', name: 'Stratège', role: 'Design & visuels', category: 'module', avatar: '🎨' },
  { id: 'technicien', name: 'Technicien', role: 'Veille concurrentielle', category: 'module', avatar: '🛰️' },
  { id: 'assistant', name: 'Assistant', role: 'E-commerce', category: 'module', avatar: '🛒' },
];

// Connecteurs prioritaires recommandés selon le secteur (onboarding)
export const SECTOR_CONNECTORS = {
  traiteur: ['dolibarr', 'whatsapp', 'stripe'],
  restaurant: ['googlebusiness', 'meta', 'whatsapp'],
  artisan: ['dolibarr', 'stripe', 'whatsapp'],
  commerce: ['meta', 'googlebusiness', 'stripe'],
  liberal: ['dolibarr', 'stripe', 'opensign'],
  immobilier: ['opensign', 'dolibarr', 'whatsapp'],
  beaute: ['googlebusiness', 'meta', 'whatsapp'],
  generique: ['dolibarr', 'whatsapp', 'stripe'],
};

// Libellés lisibles des catégories
export const CATEGORY_LABELS = {
  orchestrateur: 'Orchestrateur',
  autopilote: 'AutoPilote',
  compta: 'Compta Pilote',
  devis: 'Devis Pilote',
  module: 'Modules à la carte',
};

// Les 4 packs tarifaires
export const PLANS = [
  {
    id: 'starter',
    label: 'Pack Starter',
    price: 49,
    tagline: 'Pour démarrer en douceur',
    features: ['5 agents core (Directeur, Commercial, Assistance, Créatif, Analyste)', '100 conversations/mois', 'Support email'],
  },
  {
    id: 'business',
    label: 'Pack Business',
    price: 99,
    tagline: 'Pour accélérer votre activité',
    popular: true,
    features: ['12 agents', 'WhatsApp inclus', 'Conversations illimitées', 'Support prioritaire'],
  },
  {
    id: 'elite',
    label: 'Pack Elite',
    price: 199,
    tagline: 'Pour les équipes ambitieuses',
    features: ['19 agents complets', 'WhatsApp + réseaux sociaux + SEO', 'WordPress connecté', 'Support dédié'],
  },
  {
    id: 'agence',
    label: 'Pack Agence',
    price: 399,
    tagline: 'Pour les agences multi-clients',
    features: ['Multi-comptes clients', 'Marque blanche possible', 'Tableau de bord agence', 'Account manager dédié'],
  },
];
