'use client';
/** Page tarifs : présentation des 4 packs + souscription (paiement simulé). */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import { PLANS } from '@/lib/agents';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(null);

  async function choosePlan(planId) {
    // Si non connecté, on redirige vers l'inscription
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
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-slate-900">Des tarifs simples et transparents</h1>
          <p className="mt-4 text-slate-600">Choisissez le pack adapté à votre rythme de croissance.</p>
          <p className="mt-2 text-xs text-slate-400">💡 Paiement simulé en environnement de démonstration — aucune carte requise.</p>
        </div>

        {message && (
          <div className="mt-8 max-w-2xl mx-auto bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-3 text-center">
            {message}
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.popular ? 'border-brand-500 shadow-xl shadow-brand-600/10 ring-1 ring-brand-500' : 'border-slate-200 bg-white'
              }`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-semibold">
                  Le plus choisi
                </span>
              )}
              <h3 className="font-bold text-lg text-slate-900">{plan.label}</h3>
              <p className="text-sm text-slate-500 mt-1 h-10">{plan.tagline}</p>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-slate-900">{plan.price}€</span>
                <span className="text-slate-500"> /mois</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-brand-600 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => choosePlan(plan.id)} disabled={loadingPlan === plan.id}
                className={`mt-6 w-full py-2.5 rounded-lg font-semibold disabled:opacity-60 ${
                  plan.popular ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}>
                {loadingPlan === plan.id ? 'Activation…' : user ? 'Choisir ce pack' : 'Commencer'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
