/**
 * Bibliothèque de modèles de documents (français), adaptés au secteur
 * et aux informations de l'entreprise du client.
 *
 * Chaque modèle est rendu en Markdown afin de s'afficher proprement
 * dans l'interface (prévisualisation) et dans le chat.
 */
const { getSector } = require('./sectors');
const { parsePrestations } = require('./context');

/** Liste des types de modèles proposés. */
const TEMPLATE_TYPES = [
  { id: 'devis', label: 'Devis', description: 'Devis professionnel avec lignes de prestation, TVA et CGV.' },
  { id: 'facture', label: 'Facture', description: 'Facture conforme avec mentions légales françaises.' },
  { id: 'prospection', label: 'Email de prospection', description: '3 variantes adaptées à votre secteur.' },
  { id: 'relance', label: 'Email de relance', description: 'Séquence J+3, J+7 et J+15.' },
  { id: 'bienvenue', label: 'Email de bienvenue', description: 'Message d\'accueil d\'un nouveau client.' },
  { id: 'compte_rendu', label: 'Compte-rendu de réunion', description: 'Trame de compte-rendu structuré.' },
  { id: 'cgv', label: 'CGV', description: 'Conditions générales de vente (droit français).' },
  { id: 'mentions_legales', label: 'Mentions légales', description: 'Mentions légales pour site/document.' },
  { id: 'contrat_prestation', label: 'Contrat de prestation', description: 'Contrat de prestation de services.' },
  { id: 'nda', label: 'Accord de confidentialité (NDA)', description: 'Accord de non-divulgation.' },
];

// Mention obligatoire à apposer sur tout document juridique.
const DISCLAIMER = '\n\n---\n_Ce document est fourni à titre indicatif et ne remplace pas l\'avis d\'un avocat._';

// ─────────────────── Helpers ───────────────────

const euro = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** Construit des lignes d'exemple à partir des prestations du client. */
function sampleItems(user) {
  const prestations = parsePrestations(user.prestations).filter((p) => p.price);
  if (prestations.length) {
    return prestations.slice(0, 3).map((p) => ({
      label: p.label,
      qty: 1,
      price: Number(p.price) || 0,
    }));
  }
  const sector = getSector(user.sector);
  return sector.prestations.slice(0, 2).map((label, i) => ({ label, qty: 1, price: (i + 1) * 250 }));
}

/** Calcule les totaux HT / TVA / TTC. */
function totals(items, vatRate) {
  const ht = items.reduce((s, it) => s + (it.qty || 1) * (it.price || 0), 0);
  const tva = ht * (Number(vatRate) || 0) / 100;
  return { ht, tva, ttc: ht + tva };
}

const head = (user) => {
  const l = [`**${user.company || 'Votre entreprise'}**`];
  if (user.address) l.push(user.address);
  if (user.siret) l.push(`SIRET : ${user.siret}`);
  return l.join('  \n');
};

// ─────────────────── Modèles ───────────────────

function devis(user, client) {
  const items = sampleItems(user);
  const { ht, tva, ttc } = totals(items, user.vat_rate);
  const lignes = items
    .map((it) => `| ${it.label} | ${it.qty} | ${euro(it.price)} | ${euro(it.qty * it.price)} |`)
    .join('\n');
  return `# DEVIS

${head(user)}

**Client :** ${client.name}${client.company ? ` — ${client.company}` : ''}
**Devis n° :** DEVIS-AAAAMMJJ-001
**Date :** [date du jour] — **Validité :** 30 jours

| Désignation | Qté | P.U. HT | Total HT |
|---|---|---|---|
${lignes}

**Total HT :** ${euro(ht)}
**TVA (${user.vat_rate ?? 20} %) :** ${euro(tva)}
**Total TTC :** ${euro(ttc)}

_Conditions :_ Acompte de 30 % à la commande, solde à la livraison.
Devis valable 30 jours à compter de sa date d'émission.

**Conditions générales de vente (extrait) :** toute commande implique l'acceptation
sans réserve des présentes CGV. Les prix sont exprimés en euros. Le client dispose
des garanties légales applicables.

_Bon pour accord (date et signature) :_`;
}

function facture(user, client) {
  const items = sampleItems(user);
  const { ht, tva, ttc } = totals(items, user.vat_rate);
  const lignes = items
    .map((it) => `| ${it.label} | ${it.qty} | ${euro(it.price)} | ${euro(it.qty * it.price)} |`)
    .join('\n');
  return `# FACTURE

${head(user)}

**Facturé à :** ${client.name}${client.company ? ` — ${client.company}` : ''}
**Facture n° :** FACT-AAAAMMJJ-001
**Date d'émission :** [date du jour]
**Date d'échéance :** [date + 30 jours]

| Désignation | Qté | P.U. HT | Total HT |
|---|---|---|---|
${lignes}

**Total HT :** ${euro(ht)}
**TVA (${user.vat_rate ?? 20} %) :** ${euro(tva)}
**Total TTC à payer :** ${euro(ttc)}

---
**Mentions légales :**
- Conditions de paiement : 30 jours à réception de facture.
- En cas de retard de paiement, des pénalités au taux de 3 fois le taux d'intérêt
  légal seront appliquées, ainsi qu'une indemnité forfaitaire de 40 € pour frais
  de recouvrement (art. L441-10 et D441-5 du Code de commerce).
- Pas d'escompte pour paiement anticipé.
${(!user.vat_rate || Number(user.vat_rate) === 0) ? '- TVA non applicable, art. 293 B du CGI.' : ''}`;
}

function prospection(user) {
  const s = getSector(user.sector);
  const presta = s.prestations[0] || 'nos prestations';
  const c = user.company || 'notre entreprise';
  return `## Email de prospection — 3 variantes (secteur : ${s.label})

### Variante 1 — Directe & orientée bénéfice
**Objet :** ${presta} : gagnez du temps avec ${c}

Bonjour [Prénom],

Je me permets de vous contacter car ${c} accompagne des ${s.clients[0].toLowerCase()}
comme vous sur **${presta.toLowerCase()}**. Nos clients gagnent en sérénité et en temps.

Seriez-vous disponible 15 minutes cette semaine pour en échanger ?

Bien cordialement,
[Votre nom] — ${c}

---
### Variante 2 — Approche par la question
**Objet :** Une question rapide sur votre [besoin métier]

Bonjour [Prénom],

Comment gérez-vous actuellement ${presta.toLowerCase()} ? Beaucoup de
${s.clients[0].toLowerCase()} nous disent y passer trop de temps.

Si c'est aussi votre cas, je serais ravi de vous montrer comment nous pouvons aider.

À très vite,
[Votre nom] — ${c}

---
### Variante 3 — Recommandation / preuve sociale
**Objet :** ${c}, recommandé par des professionnels comme vous

Bonjour [Prénom],

Plusieurs ${s.clients[0].toLowerCase()} nous ont fait confiance pour
${presta.toLowerCase()}, avec d'excellents retours. J'aimerais vous présenter
notre approche, sans engagement.

Quel créneau vous conviendrait ?

Cordialement,
[Votre nom] — ${c}`;
}

function relance(user) {
  const c = user.company || 'notre entreprise';
  return `## Séquence de relance

### J+3 — Relance douce
**Objet :** Suite à notre échange

Bonjour [Prénom],

Je reviens vers vous suite à ma proposition. Avez-vous pu en prendre connaissance ?
Je reste à votre disposition pour toute question.

Bien à vous,
[Votre nom] — ${c}

---
### J+7 — Apport de valeur
**Objet :** Une précision qui pourrait vous intéresser

Bonjour [Prénom],

Je me permets de revenir vers vous. Pour vous aider à décider, voici un point clé :
[bénéfice concret / témoignage client]. Souhaitez-vous que nous en discutions ?

Cordialement,
[Votre nom] — ${c}

---
### J+15 — Dernière relance (ouverture de porte)
**Objet :** Dois-je clôturer votre dossier ?

Bonjour [Prénom],

Sans retour de votre part, je ne souhaite pas vous importuner davantage.
Si le moment n'est pas opportun, dites-le moi simplement — je resterai disponible
quand vous le souhaiterez.

Très cordialement,
[Votre nom] — ${c}`;
}

function bienvenue(user) {
  const c = user.company || 'notre entreprise';
  return `## Email de bienvenue

**Objet :** Bienvenue chez ${c} ! 🎉

Bonjour [Prénom],

Toute l'équipe de **${c}** est ravie de vous compter parmi ses clients !

Voici ce que vous pouvez attendre de nous :
- Un interlocuteur dédié et réactif
- Un suivi personnalisé de vos demandes
- La qualité et le sérieux à chaque étape

N'hésitez pas à nous contacter pour toute question. Nous sommes là pour vous.

À très bientôt,
L'équipe ${c}`;
}

function compteRendu(user) {
  return `## Compte-rendu de réunion

**Date :** [date]  **Lieu :** [lieu / visio]
**Participants :** [noms]
**Objet :** [sujet de la réunion]

### Points abordés
1. [Point 1]
2. [Point 2]
3. [Point 3]

### Décisions prises
- [Décision 1]
- [Décision 2]

### Actions à mener
| Action | Responsable | Échéance |
|---|---|---|
| [Action] | [Qui] | [Quand] |

### Prochaine réunion
[Date et objectif]

_Compte-rendu rédigé par ${user.company || '[votre entreprise]'}._`;
}

function cgv(user) {
  return `# Conditions Générales de Vente

**${user.company || '[Entreprise]'}**${user.siret ? ` — SIRET ${user.siret}` : ''}

**Article 1 — Objet.** Les présentes CGV régissent les ventes de prestations/produits de
${user.company || "l'entreprise"} à ses clients.

**Article 2 — Prix.** Les prix sont indiqués en euros${user.vat_rate ? `, TVA ${user.vat_rate} % en sus` : ''}.

**Article 3 — Commande.** Toute commande implique l'acceptation sans réserve des présentes CGV.

**Article 4 — Paiement.** Paiement à 30 jours sauf accord contraire. Tout retard entraîne des
pénalités (3× le taux d'intérêt légal) et une indemnité forfaitaire de 40 € (art. L441-10 C. com.).

**Article 5 — Rétractation.** Pour les consommateurs, délai légal de 14 jours selon le Code de la consommation.

**Article 6 — Responsabilité & garanties.** Application des garanties légales de conformité et des vices cachés.

**Article 7 — Données personnelles (RGPD).** Les données sont traitées conformément au RGPD.

**Article 8 — Litiges.** Droit français applicable. Recours préalable à la médiation de la consommation.${DISCLAIMER}`;
}

function mentionsLegales(user) {
  return `# Mentions légales

**Éditeur :** ${user.company || '[Entreprise]'}
**Adresse :** ${user.address || '[Adresse]'}
**SIRET :** ${user.siret || '[SIRET]'}
**Contact :** [email / téléphone]
**Directeur de la publication :** ${user.name || '[Nom]'}

**Hébergement :** [nom et adresse de l'hébergeur]

**Propriété intellectuelle :** l'ensemble du contenu est protégé. Toute reproduction est interdite sans autorisation.

**Données personnelles (RGPD) :** vous disposez d'un droit d'accès, de rectification et de suppression de vos données.${DISCLAIMER}`;
}

function contratPrestation(user, client) {
  return `# Contrat de prestation de services

**Entre les soussignés :**
- **Le Prestataire :** ${user.company || '[Entreprise]'}${user.siret ? `, SIRET ${user.siret}` : ''}${user.address ? `, ${user.address}` : ''}
- **Le Client :** ${client.name}${client.company ? ` — ${client.company}` : ''}

**Article 1 — Objet.** Le Prestataire réalise pour le Client la prestation suivante : [description].

**Article 2 — Durée.** Le contrat prend effet le [date] pour une durée de [durée].

**Article 3 — Prix et paiement.** Montant : [montant] €${user.vat_rate ? ` HT (TVA ${user.vat_rate} %)` : ''}. Modalités : [acompte / échéancier].

**Article 4 — Obligations des parties.** Le Prestataire s'engage à un devoir de conseil ; le Client à fournir les éléments nécessaires.

**Article 5 — Confidentialité.** Les parties s'engagent à la confidentialité des informations échangées.

**Article 6 — Résiliation.** En cas de manquement, résiliation possible après mise en demeure restée infructueuse (15 jours).

**Article 7 — Droit applicable.** Droit français. Tribunaux compétents : [ressort].

Fait à [lieu], le [date], en deux exemplaires.
**Le Prestataire** _____________  **Le Client** _____________${DISCLAIMER}`;
}

function nda(user, client) {
  return `# Accord de confidentialité (NDA)

**Entre :** ${user.company || '[Entreprise]'} et ${client.name}${client.company ? ` (${client.company})` : ''}.

**Article 1 — Objet.** Le présent accord vise à protéger les informations confidentielles échangées dans le cadre de [contexte].

**Article 2 — Informations confidentielles.** Toute information communiquée, écrite ou orale, identifiée comme confidentielle.

**Article 3 — Engagements.** Les parties s'engagent à ne pas divulguer ni utiliser ces informations à d'autres fins que celles prévues.

**Article 4 — Durée.** L'obligation de confidentialité court pendant [durée] à compter de la signature.

**Article 5 — Exclusions.** Sont exclues les informations publiques ou déjà connues licitement.

**Article 6 — Droit applicable.** Droit français.

Fait à [lieu], le [date].${DISCLAIMER}`;
}

const RENDERERS = {
  devis, facture, prospection, relance, bienvenue, compte_rendu: compteRendu,
  cgv, mentions_legales: mentionsLegales, contrat_prestation: contratPrestation, nda,
};

/**
 * Rend un modèle pour un utilisateur donné.
 * @param {string} type
 * @param {object} user
 * @param {object} [client] - client d'exemple
 */
function renderTemplate(type, user, client = { name: 'Client Exemple', company: 'Société Exemple' }) {
  const fn = RENDERERS[type];
  if (!fn) return null;
  // devis/facture utilisent le client ; les autres non
  return fn.length >= 2 ? fn(user, client) : fn(user);
}

module.exports = { TEMPLATE_TYPES, renderTemplate };
