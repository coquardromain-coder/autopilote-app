/**
 * Google Business Profile (gratuit via OAuth Google).
 * config : { accessToken }. locationId passé en argument.
 * Mode simulation si pas de jeton.
 */
function isConfigured(c) { return Boolean(c && c.accessToken); }
function auth(c) { return { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' }; }

/** Infos de la fiche établissement. */
async function getBusinessInfo(c) {
  if (!isConfigured(c)) return { _simulated: true, name: 'Démo SARL', address: '10 rue de Paris, 75001', rating: 4.6, reviewCount: 38 };
  const res = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: auth(c) });
  const d = await res.json();
  return d.accounts?.[0] || {};
}

/** Liste des avis clients. */
async function getReviews(c, locationId) {
  if (!isConfigured(c)) return tag([
    { reviewId: 'r1', author: 'Marie L.', stars: 5, comment: 'Intervention rapide et soignée, je recommande !', reply: null },
    { reviewId: 'r2', author: 'Paul D.', stars: 2, comment: 'Retard à l\'intervention, déçu.', reply: null },
  ]);
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`, { headers: auth(c) });
  const d = await res.json();
  return d.reviews || [];
}

/** Répond à un avis. */
async function replyToReview(c, locationId, reviewId, reply) {
  if (!isConfigured(c)) return { _simulated: true, replied: true };
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/reviews/${reviewId}/reply`, {
    method: 'PUT', headers: auth(c), body: JSON.stringify({ comment: reply }),
  });
  if (!res.ok) throw new Error('Erreur réponse avis Google');
  return { replied: true };
}

/** Met à jour les horaires d'ouverture. */
async function updateBusinessHours(c, locationId, hours) {
  if (!isConfigured(c)) return { _simulated: true, updated: true };
  const res = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?updateMask=regularHours`, {
    method: 'PATCH', headers: auth(c), body: JSON.stringify({ regularHours: hours }),
  });
  if (!res.ok) throw new Error('Erreur mise à jour horaires');
  return { updated: true };
}

/** Publie un post sur la fiche Google. */
async function createPost(c, locationId, content) {
  if (!isConfigured(c)) return { _simulated: true, postId: 'SIM-POST-' + Date.now().toString(36) };
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationId}/localPosts`, {
    method: 'POST', headers: auth(c), body: JSON.stringify({ languageCode: 'fr', summary: content, topicType: 'STANDARD' }),
  });
  const d = await res.json();
  return { postId: d?.name };
}

function tag(a) { a._simulated = true; return a; }

module.exports = { isConfigured, getBusinessInfo, getReviews, replyToReview, updateBusinessHours, createPost };
