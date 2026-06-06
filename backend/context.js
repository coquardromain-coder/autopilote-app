/**
 * Construit le « contexte client » injecté automatiquement dans le
 * prompt système de chaque agent, à partir des informations de
 * l'entreprise : secteur, infos légales, prestations, brief libre.
 *
 * Ainsi, chaque réponse d'agent est personnalisée pour l'entreprise
 * du client sans que celui-ci ait à le rappeler.
 */
const { sectorContext } = require('./sectors');

/** Parse en sécurité le JSON des prestations stocké en base. */
function parsePrestations(raw) {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Construit le bloc de contexte à partir d'un enregistrement utilisateur.
 * @param {object} user - ligne de la table users
 * @returns {string} bloc de contexte (vide si rien à injecter)
 */
function buildClientContext(user) {
  if (!user) return '';
  const lines = ['', '────────', 'CONTEXTE DE L\'ENTREPRISE DU CLIENT (à utiliser pour personnaliser ta réponse) :'];

  // Identité de l'entreprise
  if (user.company) lines.push(`• Entreprise : ${user.company}`);
  if (user.siret) lines.push(`• SIRET : ${user.siret}`);
  if (user.address) lines.push(`• Adresse : ${user.address}`);

  // Secteur d'activité
  if (user.sector) {
    lines.push('• ' + sectorContext(user.sector).replace(/\n/g, '\n  '));
  }

  // Prestations & tarifs
  const prestations = parsePrestations(user.prestations);
  if (prestations.length) {
    lines.push('• Prestations & tarifs proposés :');
    for (const p of prestations) {
      const prix = p.price != null && p.price !== '' ? `${p.price} €` : 'sur devis';
      const unite = p.unit ? ` / ${p.unit}` : '';
      lines.push(`   - ${p.label} : ${prix}${unite}`);
    }
  }

  // Taux de TVA
  if (user.vat_rate != null) lines.push(`• Taux de TVA applicable : ${user.vat_rate} %`);

  // Brief libre rédigé par le client
  if (user.brief) lines.push(`• Description de l'activité par le client : ${user.brief}`);

  lines.push('────────', '');

  // Si seul l'en-tête est présent (aucune info), on n'injecte rien
  return lines.length > 5 ? lines.join('\n') : '';
}

module.exports = { buildClientContext, parsePrestations };
