'use client';
/** Page tarifs : présentation des 4 packs + souscription (paiement simulé). */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import Reveal from '@/components/Reveal';
import { PLANS } from '@/lib/agents';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(null);

  async function choosePlan(planId) {
    if (!user) {
      router.push('/register');
      return;
    }
    setLoadingPlan(planId);
    setMessage('');
    try {
      const d = await api('/api/billing/subscribe', { method: 'POST', body: { plan: planId } });
      setMessage(d.message);
    } catch (err) {
      setMessage('Erreur : ' + err.message);
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicNav />
      <section className="relative max-w-6xl mx-auto px-4 py-20">
        <div className="absolute inset-0 bg-grid" />
        <div className="relative text-center">
          <Reveal>
            <h1 className="text-4xl sm:text-5xl font-extrabold">Des tarifs <span className="text-gradient">simples et transparents</span></h1>
            <p className="mt-4 text-muted">Choisissez le pack adapté à votre rythme de croissance.</p>
            <p className="mt-2 text-xs text-muted">💡 Paiement simulé en environnement de démonstration — aucune carte requise.</p>
          </Reveal>
        </div>

        {message && (
          <div className="relative mt-8 max-w-2xl mx-auto bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-xl px-4 py-3 text-center">
            {message}
          </div>
        )}

        <div className="relative mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
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
                <button onClick={() => choosePlan(plan.id)} disabled={loadingPlan === plan.id}
                  className={`mt-6 w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}>
                  {loadingPlan === plan.id ? 'Activation…' : user ? 'Choisir ce pack' : 'Commencer'}
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
