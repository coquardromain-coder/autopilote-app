/**
 * Secteurs d'activité préconfigurés d'AutoPilote.
 *
 * Chaque secteur fournit un contexte métier riche qui est injecté
 * automatiquement dans le prompt des agents lorsque le client a
 * sélectionné son secteur. Cela permet aux agents de parler le bon
 * vocabulaire et de comprendre les enjeux du métier.
 */

const SECTORS = {
  traiteur: {
    id: 'traiteur',
    label: 'Traiteur / Restauration événementielle',
    emoji: '🍽️',
    contexte:
      "Activité de traiteur et de restauration pour événements (mariages, séminaires, " +
      "cocktails d'entreprise, réceptions privées). La qualité, la présentation et le " +
      "respect des délais sont essentiels. Forte dépendance aux acomptes et à la " +
      "planification des prestations.",
    vocabulaire: ['cocktail dînatoire', 'pièce montée', 'menu dégustation', 'acompte', 'devis sur-mesure', 'mise en bouche', 'service à l\'assiette', 'buffet', 'commis', 'dressage'],
    clients: ['Couples (mariages)', 'Entreprises (séminaires, inaugurations)', 'Collectivités', 'Particuliers (anniversaires)'],
    prestations: ['Cocktail dînatoire', 'Menu assis 3 services', 'Buffet froid', 'Brunch', 'Location de matériel', 'Service & personnel'],
    saisonnalite: "Pic d'activité de mai à septembre (mariages) et en décembre (fêtes de fin d'année). Creux en janvier-février.",
  },
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    emoji: '🍴',
    contexte:
      "Restaurant traditionnel ou de spécialités. Enjeux : remplissage du midi et du soir, " +
      "fidélisation, gestion des réservations et des avis en ligne, marge sur les plats.",
    vocabulaire: ['couvert', 'service', 'carte', 'menu du jour', 'réservation', 'no-show', 'ticket moyen', 'happy hour', 'avis Google', 'brigade'],
    clients: ['Habitués du quartier', 'Déjeuners professionnels', 'Familles', 'Touristes'],
    prestations: ['Menu midi', 'Carte du soir', 'Privatisation', 'Plats à emporter', 'Événements privés'],
    saisonnalite: "Variable selon l'emplacement. Terrasses fortes en été, repas de groupes en fin d'année.",
  },
  artisan: {
    id: 'artisan',
    label: 'Artisan du bâtiment',
    emoji: '🔧',
    contexte:
      "Artisan du bâtiment (plombier, électricien, menuisier, chauffagiste…). Activité mêlant " +
      "dépannage d'urgence et chantiers planifiés. Enjeux : devis rapides, gestion des " +
      "déplacements, relances de paiement, garantie décennale.",
    vocabulaire: ['devis', 'chantier', 'intervention', 'dépannage', 'main d\'œuvre', 'fourniture', 'déplacement', 'garantie décennale', 'TVA 10%', 'acompte'],
    clients: ['Particuliers', 'Syndics de copropriété', 'Agences immobilières', 'Petites entreprises'],
    prestations: ['Dépannage urgent', 'Installation', 'Rénovation', 'Entretien / maintenance', 'Mise aux normes'],
    saisonnalite: "Chauffagistes très demandés en automne/hiver. Rénovations souvent au printemps. Dépannages toute l'année.",
  },
  commerce: {
    id: 'commerce',
    label: 'Commerce de détail',
    emoji: '🛍️',
    contexte:
      "Commerce de détail (boutique physique et/ou en ligne). Enjeux : trafic en magasin, " +
      "fidélisation, gestion des stocks, promotions et temps forts commerciaux.",
    vocabulaire: ['panier moyen', 'stock', 'réassort', 'promotion', 'fidélité', 'vitrine', 'click & collect', 'marge', 'saisonnalité', 'tête de gondole'],
    clients: ['Clients de passage', 'Clients fidèles', 'Acheteurs en ligne'],
    prestations: ['Vente en magasin', 'Vente en ligne', 'Click & collect', 'Cartes cadeaux', 'Conseil personnalisé'],
    saisonnalite: "Temps forts : soldes (janvier/été), rentrée, Black Friday, fêtes de fin d'année.",
  },
  liberal: {
    id: 'liberal',
    label: 'Profession libérale',
    emoji: '⚖️',
    contexte:
      "Profession libérale (avocat, expert-comptable, consultant, coach…). Vente de prestations " +
      "intellectuelles facturées au forfait ou au taux horaire. Enjeux : crédibilité, suivi des " +
      "dossiers, confidentialité, facturation des honoraires.",
    vocabulaire: ['honoraires', 'mission', 'forfait', 'taux horaire', 'mandat', 'dossier', 'confidentialité', 'note d\'honoraires', 'rendez-vous', 'expertise'],
    clients: ['Particuliers', 'Dirigeants de TPE/PME', 'Autres professionnels'],
    prestations: ['Conseil', 'Accompagnement', 'Audit / diagnostic', 'Représentation', 'Formation'],
    saisonnalite: "Pics liés aux échéances (fiscales pour les comptables, rentrée pour le conseil).",
  },
  immobilier: {
    id: 'immobilier',
    label: 'Immobilier',
    emoji: '🏠',
    contexte:
      "Agence immobilière ou mandataire. Enjeux : rentrée de mandats, qualification des acheteurs, " +
      "suivi des visites, négociation, gestion de la relation sur un cycle de vente long.",
    vocabulaire: ['mandat', 'estimation', 'visite', 'compromis', 'honoraires d\'agence', 'mise en relation', 'acquéreur', 'vendeur', 'bien', 'offre d\'achat'],
    clients: ['Vendeurs', 'Acquéreurs', 'Investisseurs', 'Bailleurs / locataires'],
    prestations: ['Estimation', 'Mandat de vente', 'Recherche de bien', 'Gestion locative', 'Conseil en investissement'],
    saisonnalite: "Activité forte au printemps et à la rentrée de septembre. Ralentissement en été et fin décembre.",
  },
  beaute: {
    id: 'beaute',
    label: 'Beauté / Bien-être',
    emoji: '💇',
    contexte:
      "Salon de coiffure, institut de beauté, spa ou praticien bien-être. Enjeux : remplissage " +
      "de l'agenda, fidélisation, vente de soins additionnels et de produits, gestion des rendez-vous.",
    vocabulaire: ['prestation', 'forfait', 'rendez-vous', 'cure', 'soin', 'carte de fidélité', 'produits revente', 'agenda', 'no-show', 'abonnement'],
    clients: ['Clientèle régulière', 'Nouveaux clients', 'Clients événementiels (mariage…)'],
    prestations: ['Coupe / coiffure', 'Coloration', 'Soin du visage', 'Épilation', 'Massage', 'Vente de produits'],
    saisonnalite: "Pics avant les fêtes, l'été (mariages, vacances) et la rentrée.",
  },
  generique: {
    id: 'generique',
    label: 'Autre / Générique',
    emoji: '🏢',
    contexte:
      "Activité de TPE/PME polyvalente. Les agents restent professionnels et s'adaptent à la " +
      "description fournie par le client.",
    vocabulaire: ['prestation', 'devis', 'facture', 'client', 'prospect', 'service'],
    clients: ['Particuliers', 'Entreprises'],
    prestations: ['Prestations de services', 'Vente de produits'],
    saisonnalite: "Variable selon l'activité.",
  },
};

/** Liste des secteurs pour l'affichage (sans détail interne superflu). */
function listSectors() {
  return Object.values(SECTORS).map((s) => ({
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    contexte: s.contexte,
    prestations: s.prestations,
  }));
}

/** Renvoie un secteur par son id (ou le générique par défaut). */
function getSector(id) {
  return SECTORS[id] || SECTORS.generique;
}

/**
 * Construit le bloc de contexte métier à injecter dans le prompt agent.
 * @param {string} id - identifiant du secteur
 * @returns {string}
 */
function sectorContext(id) {
  const s = getSector(id);
  return (
    `Secteur d'activité du client : ${s.label}.\n` +
    `Contexte métier : ${s.contexte}\n` +
    `Vocabulaire à employer : ${s.vocabulaire.join(', ')}.\n` +
    `Types de clients typiques : ${s.clients.join(', ')}.\n` +
    `Prestations courantes : ${s.prestations.join(', ')}.\n` +
    `Saisonnalité : ${s.saisonnalite}`
  );
}

module.exports = { SECTORS, listSectors, getSector, sectorContext };
