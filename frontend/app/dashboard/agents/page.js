'use client';
/** Catalogue des 17 agents disponibles, regroupés par pôle. */
import Link from 'next/link';
import { AGENTS, CATEGORY_LABELS } from '@/lib/agents';

export default function AgentsPage() {
  const grouped = AGENTS.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vos 17 agents</h1>
        <p className="text-slate-500 mt-1">Tous supervisés par Pilot, l'orchestrateur central.</p>
      </div>

      {Object.entries(grouped).map(([cat, agents]) => (
        <div key={cat}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-3">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <div key={a.id} className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{a.avatar}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    <div className="text-sm text-slate-500">{a.role}</div>
                  </div>
                </div>
                <Link href="/dashboard/chat"
                  className="mt-4 text-center text-sm px-3 py-2 rounded-lg bg-brand-50 text-brand-700 font-medium hover:bg-brand-100">
                  Discuter avec {a.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
