/**
 * Hunter.io — recherche d'emails professionnels (free tier 50/mois).
 * config : { apikey }. Mode simulation si non configuré.
 */
function isConfigured(c) { return Boolean(c && c.apikey); }
const BASE = 'https://api.hunter.io/v2';

async function testConnection(c) {
  if (!isConfigured(c)) throw new Error('Hunter.io non configuré');
  const res = await fetch(`${BASE}/account?api_key=${c.apikey}`);
  if (!res.ok) throw new Error(`Connexion Hunter.io échouée (HTTP ${res.status})`);
  return { success: true };
}

/** Trouve l'email professionnel d'une personne. */
async function findEmail(c, firstName, lastName, domain) {
  if (!isConfigured(c)) return { _simulated: true, email: `${firstName}.${lastName}@${domain}`.toLowerCase(), score: 85 };
  const res = await fetch(`${BASE}/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${c.apikey}`);
  const d = await res.json();
  if (!res.ok) throw new Error(d.errors?.[0]?.details || 'Erreur Hunter.io');
  return { email: d.data?.email, score: d.data?.score };
}

/** Vérifie la validité d'un email. */
async function verifyEmail(c, email) {
  if (!isConfigured(c)) return { _simulated: true, email, status: 'valid', score: 90 };
  const res = await fetch(`${BASE}/email-verifier?email=${encodeURIComponent(email)}&api_key=${c.apikey}`);
  const d = await res.json();
  return { email, status: d.data?.status, score: d.data?.score };
}

/** Trouve tous les emails d'un domaine. */
async function domainSearch(c, domain) {
  if (!isConfigured(c)) return tag([
    { email: `contact@${domain}`, type: 'generic' },
    { email: `j.martin@${domain}`, first_name: 'Jean', last_name: 'Martin', position: 'Gérant' },
  ]);
  const res = await fetch(`${BASE}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${c.apikey}`);
  const d = await res.json();
  return d.data?.emails || [];
}

function tag(a) { a._simulated = true; return a; }

module.exports = { isConfigured, testConnection, findEmail, verifyEmail, domainSearch };
