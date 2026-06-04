/**
 * Petit client HTTP pour communiquer avec l'API backend.
 * Ajoute automatiquement le jeton JWT stocké en localStorage.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Récupère le jeton stocké côté navigateur. */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ap_token');
}

/** Stocke ou supprime le jeton. */
export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('ap_token', token);
  else localStorage.removeItem('ap_token');
}

/**
 * Effectue une requête vers l'API.
 * @param {string} path - ex: '/api/auth/login'
 * @param {object} options - { method, body, auth }
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}
