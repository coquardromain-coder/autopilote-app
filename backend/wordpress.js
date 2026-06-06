/**
 * Publication d'articles sur WordPress via l'API REST.
 * Authentification par "Application Password" (Basic Auth).
 * Mode simulation si WordPress n'est pas configuré.
 */
const WP_URL = process.env.WORDPRESS_URL;
const WP_USER = process.env.WORDPRESS_USER;
const WP_PASSWORD = process.env.WORDPRESS_PASSWORD;

function isConfigured() {
  return Boolean(WP_URL && WP_USER && WP_PASSWORD);
}

/**
 * Publie un article. En simulation, renvoie une URL fictive.
 * @param {{title:string, content:string, status?:string}} article
 */
async function publishArticle({ title, content, status = 'publish' }) {
  if (!isConfigured()) {
    return {
      simulated: true,
      id: 'SIM-' + Date.now().toString(36),
      link: '(simulation) article non publié — configurez WordPress pour publier réellement.',
    };
  }
  const url = WP_URL.replace(/\/$/, '') + '/wp-json/wp/v2/posts';
  const auth = Buffer.from(`${WP_USER}:${WP_PASSWORD}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Erreur WordPress');
  return { simulated: false, id: data.id, link: data.link };
}

module.exports = { isConfigured, publishArticle };
