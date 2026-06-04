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
    api('/api/analytics/overview')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const k = data?.kpis;

  const cards = [
    { label: 'Contacts', value: k?.contacts, icon: '🤝', color: 'bg-blue-50 text-blue-600' },
    { label: 'Clients', value: k?.clients, icon: '⭐', color: 'bg-amber-50 text-amber-600' },
    { label: 'Conversations', value: k?.conversations, icon: '💬', color: 'bg-violet-50 text-violet-600' },
    { label: 'Factures', value: k?.invoices, icon: '🧾', color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bonjour {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-1">Voici l'état de votre activité, synthétisé par Vox.</p>
      </div>

      {error && <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c.color}`}>{c.icon}</div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{c.value ?? '—'}</div>
            <div className="text-sm text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Chiffre d'affaires */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
          <div className="text-sm opacity-80">Chiffre d'affaires encaissé</div>
          <div className="text-4xl font-bold mt-2">{(k?.revenue ?? 0).toLocaleString('fr-FR')} €</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <div className="text-sm text-slate-500">En attente de paiement</div>
          <div className="text-4xl font-bold mt-2 text-slate-900">{(k?.pendingRevenue ?? 0).toLocaleString('fr-FR')} €</div>
        </div>
      </div>

      {/* Activité par agent */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <h2 className="font-semibold text-slate-900">Agents les plus sollicités</h2>
        {data?.activityByAgent?.length ? (
          <div className="mt-4 space-y-3">
            {data.activityByAgent.map((row) => {
              const agent = AGENTS.find((a) => a.id === row.agent_id);
              const max = data.activityByAgent[0].n || 1;
              return (
                <div key={row.agent_id} className="flex items-center gap-3">
                  <span className="text-xl w-7">{agent?.avatar || '🤖'}</span>
                  <span className="w-24 text-sm text-slate-700">{agent?.name || row.agent_id}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${(row.n / max) * 100}%` }} />
                  </div>
                  <span className="text-sm text-slate-500 w-8 text-right">{row.n}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500 mt-3">
            Aucune activité pour l'instant.{' '}
            <Link href="/dashboard/chat" className="text-brand-600 hover:underline">Discutez avec un agent</Link> pour démarrer.
          </p>
        )}
      </div>

      {/* Accès rapide */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/dashboard/chat" className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition">
          <div className="text-2xl">💬</div>
          <div className="font-semibold text-slate-900 mt-2">Parler à Pilot</div>
          <div className="text-sm text-slate-500">Posez votre question, il délègue.</div>
        </Link>
        <Link href="/dashboard/crm" className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition">
          <div className="text-2xl">🤝</div>
          <div className="font-semibold text-slate-900 mt-2">Gérer mes contacts</div>
          <div className="text-sm text-slate-500">CRM avec Léa.</div>
        </Link>
        <Link href="/dashboard/billing" className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-brand-200 hover:shadow-sm transition">
          <div className="text-2xl">🧾</div>
          <div className="font-semibold text-slate-900 mt-2">Factures & devis</div>
          <div className="text-sm text-slate-500">Avec Manon.</div>
        </Link>
      </div>
    </div>
  );
}
