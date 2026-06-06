/**
 * Google Analytics 4 (gratuit via OAuth Google) — GA4 Data API.
 * config : { accessToken }. propertyId passé en argument.
 * Mode simulation si pas de jeton.
 */
function isConfigured(c) { return Boolean(c && c.accessToken); }
function auth(c) { return { Authorization: `Bearer ${c.accessToken}`, 'Content-Type': 'application/json' }; }

async function runReport(c, propertyId, body) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const res = await fetch(url, { method: 'POST', headers: auth(c), body: JSON.stringify(body) });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Erreur GA4');
  return d;
}

/** Vue d'ensemble : sessions, utilisateurs, taux de rebond. */
async function getTrafficOverview(c, propertyId) {
  if (!isConfigured(c)) return { _simulated: true, sessions: 4820, users: 3110, bounceRate: 0.42 };
  const d = await runReport(c, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }] });
  const v = d.rows?.[0]?.metricValues || [];
  return { sessions: Number(v[0]?.value || 0), users: Number(v[1]?.value || 0), bounceRate: Number(v[2]?.value || 0) };
}

/** Pages les plus visitées. */
async function getTopPages(c, propertyId) {
  if (!isConfigured(c)) return tag([{ page: '/', views: 1820 }, { page: '/services', views: 940 }, { page: '/contact', views: 610 }]);
  const d = await runReport(c, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], limit: 10 });
  return (d.rows || []).map((r) => ({ page: r.dimensionValues[0].value, views: Number(r.metricValues[0].value) }));
}

/** Sources de trafic. */
async function getTrafficSources(c, propertyId) {
  if (!isConfigured(c)) return tag([{ source: 'google / organic', sessions: 2600 }, { source: 'direct', sessions: 1200 }, { source: 'facebook', sessions: 700 }]);
  const d = await runReport(c, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }], limit: 10 });
  return (d.rows || []).map((r) => ({ source: r.dimensionValues[0].value, sessions: Number(r.metricValues[0].value) }));
}

/** Objectifs et conversions. */
async function getConversions(c, propertyId) {
  if (!isConfigured(c)) return { _simulated: true, conversions: 86, conversionRate: 0.018 };
  const d = await runReport(c, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], metrics: [{ name: 'conversions' }] });
  return { conversions: Number(d.rows?.[0]?.metricValues?.[0]?.value || 0) };
}

/** Données démographiques (pays, appareils). */
async function getAudienceData(c, propertyId) {
  if (!isConfigured(c)) return tag([{ country: 'France', users: 2700 }, { country: 'Belgique', users: 240 }]);
  const d = await runReport(c, propertyId, { dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }], dimensions: [{ name: 'country' }], metrics: [{ name: 'totalUsers' }], limit: 10 });
  return (d.rows || []).map((r) => ({ country: r.dimensionValues[0].value, users: Number(r.metricValues[0].value) }));
}

function tag(a) { a._simulated = true; return a; }

module.exports = { isConfigured, getTrafficOverview, getTopPages, getTrafficSources, getConversions, getAudienceData };
