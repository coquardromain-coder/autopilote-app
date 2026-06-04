'use client';
/** Paramètres : profil, abonnement et gestion multi-utilisateurs. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PLANS } from '@/lib/agents';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCompany(user.company || '');
    }
    api('/api/billing/subscription').then((d) => setSubscription(d.subscription)).catch(() => {});
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api('/api/auth/me', { method: 'PATCH', body: { name, company } });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  const currentPlan = PLANS.find((p) => p.id === user?.plan);

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>

      {/* Profil */}
      <section className="bg-white border border-slate-100 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Profil</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input value={user?.email || ''} disabled
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">✓ Profil mis à jour.</p>}
          <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
            Enregistrer
          </button>
        </form>
      </section>

      {/* Abonnement */}
      <section className="bg-white border border-slate-100 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Abonnement</h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-lg font-bold text-slate-900">{currentPlan?.label || 'Pack ' + user?.plan}</div>
            {subscription ? (
              <div className="text-sm text-slate-500">
                {subscription.price}€ / mois — actif depuis le {subscription.started_at?.slice(0, 10)}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Aucun abonnement payant actif (paiement simulé).</div>
            )}
          </div>
          <Link href="/pricing" className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">
            Changer de pack
          </Link>
        </div>
      </section>

      {/* Multi-utilisateurs */}
      <section className="bg-white border border-slate-100 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Équipe & utilisateurs</h2>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-brand-100 text-brand-700 capitalize">{user?.role}</span>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          La gestion multi-utilisateurs (rôles propriétaire / membre / admin) est disponible à partir du
          Pack Elite. L'invitation de collaborateurs sera activée prochainement.
        </p>
      </section>
    </div>
  );
}
