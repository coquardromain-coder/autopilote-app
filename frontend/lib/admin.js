'use client';
/** Client API pour l'espace ADMIN (session séparée des clients). */
import { API_URL } from './api';

const KEY = 'ap_admin_token';

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}
export function setAdminToken(t) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY);
}

export async function adminApi(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = getAdminToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export async function adminLogin(email, password) {
  const d = await adminApi('/api/admin/login', { method: 'POST', body: { email, password } });
  setAdminToken(d.token);
  return d;
}
