'use client';
/**
 * Parcours d'onboarding des nouveaux clients (guidé par Léa).
 * En quelques étapes : confirmation entreprise, premier contact CRM,
 * choix d'un agent à découvrir, puis accès au dashboard.
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState({ name: '', email: '', company: '' });
  const [submitting, setSubmitting] = useState(false);

  // Protection : redirige vers la connexion si non authentifié
  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setCompany(user.company || '');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement…</div>;
  }

  async function finish() {
    setSubmitting(true);
    try {
      // Enregistre l'entreprise et marque l'onboarding terminé
      await api('/api/auth/me', { method: 'PATCH', body: { company, onboarded: true } });
      // Crée le premier contact si renseigné
      if (contact.name.trim()) {
        await api('/api/crm/contacts', { method: 'POST', body: contact });
      }
      await refresh();
      router.push('/dashboard');
    } catch (err) {
      alert('Erreur : ' + err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8">
        {/* En-tête avec Léa */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">🤝</div>
          <div>
            <div className="font-bold text-slate-900">Léa vous accompagne</div>
            <div className="text-sm text-slate-500">Configuration de votre espace — étape {step}/3</div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-slate-900">Bienvenue {user.name} 👋</h2>
            <p className="text-slate-600 mt-2 text-sm">Confirmez le nom de votre entreprise pour personnaliser vos agents.</p>
            <input value={company} onChange={(e) => setCompany(e.target.value)}
              className="mt-4 w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Nom de votre entreprise" />
            <button onClick={() => setStep(2)}
              className="mt-6 w-full py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-slate-900">Votre premier contact</h2>
            <p className="text-slate-600 mt-2 text-sm">Ajoutons un premier client ou prospect à votre CRM (optionnel).</p>
            <div className="mt-4 space-y-3">
              <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Nom du contact" />
              <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Email (optionnel)" />
              <input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Société (optionnel)" />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">Retour</button>
              <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">Continuer</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold text-slate-900">Tout est prêt ! 🎉</h2>
            <p className="text-slate-600 mt-2 text-sm">
              Vos 17 agents sont à votre disposition. Pilot vous orientera vers le bon agent à chaque demande.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>✓ Espace personnalisé pour {company || user.name}</li>
              <li>✓ CRM initialisé</li>
              <li>✓ Pilot et ses 17 agents activés</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200">Retour</button>
              <button onClick={finish} disabled={submitting}
                className="flex-1 py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60">
                {submitting ? 'Finalisation…' : 'Accéder à mon espace'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
