'use client';
/** Page d'accueil (landing) présentant AutoPilote et ses 17 agents. */
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import Reveal from '@/components/Reveal';
import { AGENTS, CATEGORY_LABELS, PLANS } from '@/lib/agents';

export default function HomePage() {
  // Regroupe les agents par catégorie pour l'affichage
  const grouped = AGENTS.reduce((acc, a) => {
    (acc[a.category] = acc[a.category] || []).push(a);
    return acc;
  }, {});

  return (
    <div className="min-h-screen">
      <PublicNav />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        {/* Fonds animés : grille + halos flottants */}
        <div className="absolute inset-0 bg-grid" />
        <div className="blob w-[40rem] h-[40rem] bg-brand-500/20 -top-40 -left-20 animate-float" />
        <div className="blob w-[32rem] h-[32rem] bg-cyan-500/10 top-10 right-0 animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32 text-center">
          <Reveal>
            <span className="chip animate-pulse-glow !text-white/90 !border-brand-500/30 !bg-brand-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-glow-cyan" />
              17 agents IA • 1 orchestrateur • 100% pour les TPE/PME
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-8 text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Votre entreprise en<br />
              <span className="text-gradient">pilote automatique</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-2xl mx-auto text-lg text-muted">
              AutoPilote met à votre service une équipe complète d'agents IA spécialisés —
              CRM, prospection, support, comptabilité, devis et bien plus — tous orchestrés
              par <strong className="text-white">le Directeur</strong>, votre chef d'orchestre intelligent.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="btn-primary px-7 py-3 text-base">Démarrer gratuitement</Link>
              <Link href="/pricing" className="btn-secondary px-7 py-3 text-base">Voir les tarifs</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────── Comment ça marche ───────── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center">Comment ça marche ?</h2>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {[
            { icon: '💬', title: 'Vous demandez', text: 'Exprimez votre besoin en langage naturel au Directeur.' },
            { icon: '🎯', title: 'Le Directeur délègue', text: 'Il analyse l\'intention et confie la tâche au bon agent spécialisé.' },
            { icon: '✅', title: 'Vous recevez', text: 'L\'agent traite la demande et vous restitue un résultat actionnable.' },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 100}>
              <div className="glass-card glass-card-hover p-8 text-center h-full">
                <div className="mx-auto mb-5 grid place-items-center w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/20 text-2xl">{s.icon}</div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-muted text-sm">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── Catalogue des agents ───────── */}
      <section id="agents" className="relative py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold text-center">Vos 17 agents spécialisés</h2>
            <p className="text-center text-muted mt-3">Tous supervisés par le Directeur, l'orchestrateur central.</p>
          </Reveal>

          <div className="mt-14 space-y-12">
            {Object.entries(grouped).map(([cat, agents]) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gradient mb-5">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {agents.map((a, i) => (
                    <Reveal key={a.id} delay={i * 40}>
                      <div className="glass-card glass-card-hover p-4 flex items-center gap-3 group h-full">
                        <div className="grid place-items-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] text-2xl transition-transform duration-300 group-hover:scale-110">{a.avatar}</div>
                        <div>
                          <div className="font-semibold">{a.name}</div>
                          <div className="text-sm text-muted">{a.role}</div>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Tarifs ───────── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-bold text-center">Des tarifs simples et premium</h2>
          <p className="text-center text-muted mt-3">Choisissez le pack adapté à votre croissance.</p>
        </Reveal>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 80}>
              <div className={`relative glass-card p-6 flex flex-col h-full ${plan.popular ? 'border-brand-500/50 shadow-glow' : 'glass-card-hover'}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold shadow-glow">
                    Le plus choisi
                  </span>
                )}
                <h3 className="font-bold text-lg">{plan.label}</h3>
                <p className="text-sm text-muted mt-1 h-10">{plan.tagline}</p>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold">{plan.price}€</span>
                  <span className="text-muted"> /mois</span>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <span className="text-cyan-400 mt-0.5">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`mt-6 text-center ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                  Commencer
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── CTA final ───────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <Reveal>
          <div className="relative glass-card overflow-hidden p-12 text-center">
            <div className="absolute inset-0 bg-brand-radial" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold">Prêt à passer en pilote automatique ?</h2>
              <p className="mt-4 text-muted">Créez votre compte en moins d'une minute.</p>
              <Link href="/register" className="btn-primary mt-8 px-8 py-3 text-base">Créer mon compte</Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/[0.06] py-8 text-center text-sm text-muted">
        © 2026 AutoPilote — Plateforme multi-agents IA pour TPE/PME.
      </footer>
    </div>
  );
}
