'use client';
/** Tableau de bord — vue d'ensemble et indicateurs clés (agent Vox). */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AGENTS } from '@/lib/agents';

export default function DashboardHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/analytics/overview').then(setData).catch((e) => setError(e.message));
  }, []);

  const k = data?.kpis;

  const cards = [
    { label: 'Contacts', value: k?.contacts, icon: '🤝', tint: 'from-brand-500/20 to-brand-500/0', ring: 'text-brand-300' },
    { label: 'Clients', value: k?.clients, icon: '⭐', tint: 'from-amber-500/20 to-amber-500/0', ring: 'text-amber-300' },
    { label: 'Conversations', value: k?.conversations, icon: '💬', tint: 'from-cyan-500/20 to-cyan-500/0', ring: 'text-cyan-300' },
    { label: 'Factures', value: k?.invoices, icon: '🧾', tint: 'from-emerald-500/20 to-emerald-500/0', ring: 'text-emerald-300' },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Bonjour <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋</h1>
        <p className="text-muted mt-1">Voici l'état de votre activité, synthétisé par Vox.</p>
      </div>

      {error && <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="relative glass-card glass-card-hover p-5 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${c.tint} opacity-60`} />
            <div className="relative">
              <div className={`grid place-items-center w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl ${c.ring}`}>{c.icon}</div>
              {data ? (
                <div className="mt-3 text-3xl font-bold font-mono">{c.value ?? 0}</div>
              ) : (
                <div className="mt-3 h-9 w-16 skeleton" />
              )}
              <div className="text-sm text-muted">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chiffre d'affaires */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="relative glass-card p-6 overflow-hidden">
          <div className="absolute inset-0 bg-brand-gradient opacity-90" />
          <div className="relative">
            <div className="text-sm text-white/80">Chiffre d'affaires encaissé</div>
            {data ? (
              <div className="text-4xl font-bold font-mono mt-2">{(k?.revenue ?? 0).toLocaleString('fr-FR')} €</div>
            ) : <div className="mt-2 h-10 w-40 skeleton" />}
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted">En attente de paiement</div>
          {data ? (
            <div className="text-4xl font-bold font-mono mt-2">{(k?.pendingRevenue ?? 0).toLocaleString('fr-FR')} €</div>
          ) : <div className="mt-2 h-10 w-40 skeleton" />}
        </div>
      </div>

      {/* Activité par agent */}
      <div className="glass-card p-6">
        <h2 className="font-semibold">Agents les plus sollicités</h2>
        {!data ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-4 w-full skeleton" />)}
          </div>
        ) : data.activityByAgent?.length ? (
          <div className="mt-4 space-y-3">
            {data.activityByAgent.map((row) => {
              const agent = AGENTS.find((a) => a.id === row.agent_id);
              const max = data.activityByAgent[0].n || 1;
              return (
                <div key={row.agent_id} className="flex items-center gap-3">
                  <span className="text-xl w-7">{agent?.avatar || '🤖'}</span>
                  <span className="w-24 text-sm text-white/80">{agent?.name || row.agent_id}</span>
                  <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gradient shadow-glow transition-all duration-700" style={{ width: `${(row.n / max) * 100}%` }} />
                  </div>
                  <span className="text-sm text-muted w-8 text-right font-mono">{row.n}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted mt-3">
            Aucune activité pour l'instant.{' '}
            <Link href="/dashboard/chat" className="text-cyan-400 hover:underline">Discutez avec un agent</Link> pour démarrer.
          </p>
        )}
      </div>

      {/* Accès rapide */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/chat', icon: '💬', title: 'Parler à Pilot', text: 'Posez votre question, il délègue.' },
          { href: '/dashboard/crm', icon: '🤝', title: 'Gérer mes contacts', text: 'CRM avec Léa.' },
          { href: '/dashboard/billing', icon: '🧾', title: 'Factures & devis', text: 'Avec Manon.' },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="glass-card glass-card-hover p-5 group">
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110">{q.icon}</div>
            <div className="font-semibold mt-2">{q.title}</div>
            <div className="text-sm text-muted">{q.text}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
