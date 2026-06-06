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
      <h1 className="text-3xl font-bold animate-fade-in-up">Paramètres</h1>

      {/* Profil */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Profil</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled className="input opacity-60 cursor-not-allowed" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && <p className="text-sm text-emerald-400">✓ Profil mis à jour.</p>}
          <button type="submit" className="btn-primary">Enregistrer</button>
        </form>
      </section>

      {/* Abonnement */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Abonnement</h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-lg font-bold text-gradient">{currentPlan?.label || 'Pack ' + user?.plan}</div>
            {subscription ? (
              <div className="text-sm text-muted">
                {subscription.price}€ / mois — actif depuis le <span className="font-mono">{subscription.started_at?.slice(0, 10)}</span>
              </div>
            ) : (
              <div className="text-sm text-muted">Aucun abonnement payant actif (paiement simulé).</div>
            )}
          </div>
          <Link href="/pricing" className="btn-secondary">Changer de pack</Link>
        </div>
      </section>

      {/* Multi-utilisateurs */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Équipe & utilisateurs</h2>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-brand-gradient text-white font-semibold shadow-glow">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted">{user?.email}</div>
          </div>
          <span className="chip !text-brand-200 !border-brand-500/30 !bg-brand-500/10 capitalize">{user?.role}</span>
        </div>
        <p className="text-xs text-muted mt-3">
          La gestion multi-utilisateurs (rôles propriétaire / membre / admin) est disponible à partir du
          Pack Elite. L'invitation de collaborateurs sera activée prochainement.
        </p>
      </section>
    </div>
  );
}
