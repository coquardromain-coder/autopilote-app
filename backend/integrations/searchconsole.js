/**
 * Google Search Console (gratuit via OAuth Google).
 * config : { accessToken } (jeton Google de l'utilisateur).
 * Mode simulation si pas de jeton.
 */
function isConfigured(c) { return Boolean(c && c.accessToken); }
function auth(c) { return { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' }; }

/** Requêtes, clics, impressions, position moyenne. */
async function getSearchAnalytics(c, siteUrl, dates = {}) {
  if (!isConfigured(c)) return simAnalytics();
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, { method: 'POST', headers: auth(c), body: JSON.stringify({
    startDate: dates.start || '2026-05-01', endDate: dates.end || '2026-05-31', dimensions: ['query'], rowLimit: 25,
  }) });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Erreur Search Console');
  return d.rows || [];
}

/** Statut des sitemaps. */
async function getSitemapStatus(c, siteUrl) {
  if (!isConfigured(c)) return tag([{ path: '/sitemap.xml', lastSubmitted: '2026-05-10', isPending: false, errors: 0 }]);
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`, { headers: auth(c) });
  const d = await res.json();
  return d.sitemap || [];
}

/** Pages indexées / non indexées (approximation via inspection). */
async function getIndexingStatus(c, siteUrl) {
  if (!isConfigured(c)) return { _simulated: true, indexed: 42, notIndexed: 7 };
  return { indexed: null, notIndexed: null, note: 'Utiliser l\'API URL Inspection page par page.' };
}

/** Top 10 mots-clés (par clics). */
async function getTopKeywords(c, siteUrl) {
  const rows = await getSearchAnalytics(c, siteUrl, {});
  return (rows || []).slice(0, 10).map((r) => ({
    keyword: r.keys?.[0], clics: r.clicks, impressions: r.impressions, position: r.position,
  }));
}

function tag(a) { a._simulated = true; return a; }
function simAnalytics() {
  return tag([
    { keys: ['plombier paris'], clicks: 128, impressions: 3400, ctr: 0.037, position: 4.2 },
    { keys: ['dépannage plomberie urgent'], clicks: 86, impressions: 1900, ctr: 0.045, position: 3.1 },
    { keys: ['installation chauffe-eau prix'], clicks: 54, impressions: 2200, ctr: 0.024, position: 6.8 },
  ]);
}

module.exports = { isConfigured, getSearchAnalytics, getSitemapStatus, getIndexingStatus, getTopKeywords };
