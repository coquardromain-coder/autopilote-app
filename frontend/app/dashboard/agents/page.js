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
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Vos <span className="text-gradient">17 agents</span></h1>
        <p className="text-muted mt-1">Tous supervisés par le Directeur, l'orchestrateur central.</p>
      </div>

      {Object.entries(grouped).map(([cat, agents]) => (
        <div key={cat}>
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gradient mb-3">
            {CATEGORY_LABELS[cat]}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((a) => (
              <div key={a.id} className="glass-card glass-card-hover p-5 flex flex-col group">
                <div className="flex items-center gap-3">
                  <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-2xl transition-transform duration-300 group-hover:scale-110">{a.avatar}</div>
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-sm text-muted">{a.role}</div>
                  </div>
                </div>
                <Link href="/dashboard/chat" className="mt-4 text-center text-sm rounded-lg px-3 py-2 bg-brand-500/10 text-brand-200 border border-brand-500/20 font-medium transition-all duration-300 hover:bg-brand-500/20 hover:shadow-glow">
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
