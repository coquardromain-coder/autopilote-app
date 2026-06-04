'use client';
/**
 * Contexte d'authentification côté client.
 * Gère l'état de l'utilisateur connecté, la connexion, l'inscription
 * et la déconnexion, en s'appuyant sur le jeton JWT en localStorage.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Au montage : tente de restaurer la session depuis le jeton
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const register = useCallback(async (payload) => {
    const d = await api('/api/auth/register', {
      method: 'POST',
      auth: false,
      body: payload,
    });
    setToken(d.token);
    setUser(d.user);
    return d.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Permet de rafraîchir l'utilisateur après une mise à jour (onboarding…)
  const refresh = useCallback(async () => {
    const d = await api('/api/auth/me');
    setUser(d.user);
    return d.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
