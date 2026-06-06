/**
 * Publication WordPress via l'API REST (Application Password / Basic Auth).
 * Accepte une config par client { url, username, password } ; à défaut,
 * utilise les variables d'environnement. Mode simulation sinon.
 */
const ENV = {
  url: process.env.WORDPRESS_URL,
  username: process.env.WORDPRESS_USER,
  password: process.env.WORDPRESS_PASSWORD,
};

function resolve(config) {
  const c = config && (config.url || config.username) ? config : ENV;
  return { url: c.url, username: c.username || c.user, password: c.password };
}
function isConfigured(config) {
  const c = resolve(config);
  return Boolean(c.url && c.username && c.password);
}
function base(c) { return c.url.replace(/\/$/, '') + '/wp-json/wp/v2'; }
function authHeader(c) { return 'Basic ' + Buffer.from(`${c.username}:${c.password}`).toString('base64'); }

async function wp(config, method, path, body) {
  const c = resolve(config);
  const res = await fetch(base(c) + path, {
    method, headers: { Authorization: authHeader(c), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.message || `Erreur WordPress ${res.status}`);
  return d;
}

/** Publie un article. */
async function publishArticle(config, { title, content, status = 'publish' } = {}) {
  // Compat : ancienne signature publishArticle({title,content})
  if (config && config.title && content === undefined) { ({ title, content, status = 'publish' } = config); config = null; }
  if (!isConfigured(config)) return { simulated: true, id: 'SIM-' + Date.now().toString(36), link: '(simulation) configurez WordPress pour publier.' };
  const d = await wp(config, 'POST', '/posts', { title, content, status });
  return { simulated: false, id: d.id, link: d.link };
}

/** Liste les catégories du blog. */
async function getCategories(config) {
  if (!isConfigured(config)) return tag([{ id: 1, name: 'Actualités' }, { id: 2, name: 'Conseils' }]);
  return wp(config, 'GET', '/categories?per_page=100');
}
/** Liste les tags. */
async function getTags(config) {
  if (!isConfigured(config)) return tag([{ id: 1, name: 'plomberie' }, { id: 2, name: 'dépannage' }]);
  return wp(config, 'GET', '/tags?per_page=100');
}
/** Bibliothèque de médias. */
async function getMediaLibrary(config) {
  if (!isConfigured(config)) return tag([{ id: 1, title: 'photo-chantier.jpg', source_url: '(simulation)' }]);
  return wp(config, 'GET', '/media?per_page=50');
}
/** Programme un article à une date. */
async function schedulePost(config, content, date) {
  if (!isConfigured(config)) return { simulated: true, id: 'SIM-SCHED-' + Date.now().toString(36) };
  const d = await wp(config, 'POST', '/posts', { title: content.title, content: content.body, status: 'future', date });
  return { simulated: false, id: d.id, link: d.link };
}
/** Met à jour un article existant. */
async function updatePost(config, postId, content) {
  if (!isConfigured(config)) return { simulated: true, id: postId };
  const d = await wp(config, 'POST', `/posts/${postId}`, content);
  return { simulated: false, id: d.id, link: d.link };
}
/** Vues d'un article (si un plugin de stats expose une meta). */
async function getPostStats(config, postId) {
  if (!isConfigured(config)) return { _simulated: true, views: 137 };
  const d = await wp(config, 'GET', `/posts/${postId}`);
  return { views: d?.meta?.views ?? null };
}

function tag(a) { a._simulated = true; return a; }

module.exports = {
  isConfigured, publishArticle,
  getCategories, getTags, getMediaLibrary, schedulePost, updatePost, getPostStats,
};
