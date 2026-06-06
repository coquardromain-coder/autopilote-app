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
  { id: 'referenceur', name: 'Référenceur', role: 'Marketing & publicité', category: 'module', avatar: '📣' },
  { id: 'community', name: 'Community', role: 'Réseaux sociaux', category: 'module', avatar: '🌸' },
  { id: 'formateur', name: 'Formateur', role: 'SEO & référencement', category: 'module', avatar: '🔎' },
  { id: 'stratege', name: 'Stratège', role: 'Design & visuels', category: 'module', avatar: '🎨' },
  { id: 'technicien', name: 'Technicien', role: 'Veille concurrentielle', category: 'module', avatar: '🛰️' },
  { id: 'assistant', name: 'Assistant', role: 'E-commerce', category: 'module', avatar: '🛒' },
];

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
    id: 'essentiel',
    label: 'Pack Essentiel',
    price: 297,
    tagline: 'Pour démarrer l\'automatisation',
    features: ['Agent Directeur inclus', '3 agents AutoPilote', 'CRM & support', 'Tableau de bord'],
  },
  {
    id: 'croissance',
    label: 'Pack Croissance',
    price: 749,
    tagline: 'Pour accélérer votre activité',
    popular: true,
    features: ['Les 8 agents AutoPilote', 'Compta Pilote (Comptable)', 'Devis Pilote', 'Analytics avancés', '2 modules au choix'],
  },
  {
    id: 'elite',
    label: 'Pack Elite',
    price: 1149,
    tagline: 'Pour les équipes ambitieuses',
    features: ['Tout Croissance', '5 modules à la carte', 'Multi-utilisateurs', 'Support prioritaire'],
  },
  {
    id: 'illimite',
    label: 'Pack Illimité',
    price: 1490,
    tagline: 'Toute la puissance d\'AutoPilote',
    features: ['Les 17 agents', 'Tous les modules', 'Utilisateurs illimités', 'Accompagnement dédié'],
  },
];
