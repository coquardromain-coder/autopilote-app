/**
 * Métadonnées d'affichage des agents (miroir du registre backend).
 * Sert à présenter les agents sur le site et dans le dashboard.
 */
export const AGENTS = [
  // Orchestrateur
  { id: 'pilot', name: 'Pilot', role: 'Orchestrateur central', category: 'orchestrateur', avatar: '🎯' },

  // AutoPilote (8)
  { id: 'lea', name: 'Léa', role: 'Onboarding & CRM', category: 'autopilote', avatar: '🤝' },
  { id: 'max', name: 'Max', role: 'Prospection commerciale', category: 'autopilote', avatar: '🚀' },
  { id: 'sofia', name: 'Sofia', role: 'Support client', category: 'autopilote', avatar: '💬' },
  { id: 'clara', name: 'Clara', role: 'Création de contenu', category: 'autopilote', avatar: '✍️' },
  { id: 'tom', name: 'Tom', role: 'Téléphonie & appels', category: 'autopilote', avatar: '📞' },
  { id: 'alex', name: 'Alex', role: 'Relances & suivi', category: 'autopilote', avatar: '🔔' },
  { id: 'hub', name: 'Hub', role: 'Coordination interne', category: 'autopilote', avatar: '🧩' },
  { id: 'vox', name: 'Vox', role: 'Reporting & analytics', category: 'autopilote', avatar: '📊' },

  // Compta Pilote
  { id: 'manon', name: 'Manon', role: 'Comptabilité & facturation', category: 'compta', avatar: '🧾' },

  // Devis Pilote
  { id: 'manon-d', name: 'Manon D.', role: 'Génération de devis', category: 'devis', avatar: '📄' },

  // Modules à la carte (8)
  { id: 'sol', name: 'Sol', role: 'Ressources humaines', category: 'module', avatar: '👥' },
  { id: 'robin', name: 'Robin', role: 'Juridique & conformité', category: 'module', avatar: '⚖️' },
  { id: 'charly', name: 'Charly', role: 'Marketing & publicité', category: 'module', avatar: '📣' },
  { id: 'flora', name: 'Flora', role: 'Réseaux sociaux', category: 'module', avatar: '🌸' },
  { id: 'sam', name: 'Sam', role: 'SEO & référencement', category: 'module', avatar: '🔎' },
  { id: 'pablo', name: 'Pablo', role: 'Design & visuels', category: 'module', avatar: '🎨' },
  { id: 'victor', name: 'Victor', role: 'Veille concurrentielle', category: 'module', avatar: '🛰️' },
  { id: 'maxi', name: 'Maxi', role: 'E-commerce', category: 'module', avatar: '🛒' },
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
    features: ['Agent Pilot inclus', '3 agents AutoPilote', 'CRM & support', 'Tableau de bord'],
  },
  {
    id: 'croissance',
    label: 'Pack Croissance',
    price: 749,
    tagline: 'Pour accélérer votre activité',
    popular: true,
    features: ['Les 8 agents AutoPilote', 'Compta Pilote (Manon)', 'Devis Pilote', 'Analytics avancés', '2 modules au choix'],
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
