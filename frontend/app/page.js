'use client';
/** Page d'accueil (landing) présentant AutoPilote et ses 17 agents. */
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import { AGENTS, CATEGORY_LABELS } from '@/lib/agents';

export default function HomePage() {
  // Regroupe les agents par catégorie pour l'affichage
  const grouped = AGENTS.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* Section héro */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-slate-50" />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-6">
            17 agents IA • 1 orchestrateur • 100% pour les TPE/PME
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
            Votre entreprise en <span className="text-brand-600">pilote automatique</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
            AutoPilote met à votre service une équipe complète d'agents IA spécialisés —
            CRM, prospection, support, comptabilité, devis et bien plus — tous orchestrés
            par <strong>Pilot</strong>, votre chef d'orchestre intelligent.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-lg shadow-brand-600/20">
              Démarrer gratuitement
            </Link>
            <Link href="/pricing" className="px-6 py-3 rounded-lg bg-white text-slate-700 font-semibold border border-slate-200 hover:border-brand-300">
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-900">Comment ça marche ?</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { icon: '💬', title: 'Vous demandez', text: 'Exprimez votre besoin en langage naturel à Pilot.' },
            { icon: '🎯', title: 'Pilot délègue', text: 'Il analyse l\'intention et confie la tâche au bon agent spécialisé.' },
            { icon: '✅', title: 'Vous recevez', text: 'L\'agent traite la demande et vous restitue un résultat actionnable.' },
          ].map((s) => (
            <div key={s.title} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
              <div className="text-4xl mb-4">{s.icon}</div>
              <h3 className="font-semibold text-lg text-slate-900">{s.title}</h3>
              <p className="mt-2 text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Catalogue des agents */}
      <section id="agents" className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-center text-slate-900">Vos 17 agents spécialisés</h2>
          <p className="text-center text-slate-600 mt-3">Tous supervisés par Pilot, l'orchestrateur central.</p>

          <div className="mt-12 space-y-10">
            {Object.entries(grouped).map(([cat, agents]) => (
              <div key={cat}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-600 mb-4">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {agents.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-brand-200 hover:shadow-sm transition">
                      <div className="text-3xl">{a.avatar}</div>
                      <div>
                        <div className="font-semibold text-slate-900">{a.name}</div>
                        <div className="text-sm text-slate-500">{a.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Appel à l'action final */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Prêt à passer en pilote automatique ?</h2>
        <p className="mt-4 text-slate-600">Créez votre compte en moins d'une minute.</p>
        <Link href="/register" className="inline-block mt-8 px-8 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
          Créer mon compte
        </Link>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © 2026 AutoPilote — Plateforme multi-agents IA pour TPE/PME.
      </footer>
    </div>
  );
}
