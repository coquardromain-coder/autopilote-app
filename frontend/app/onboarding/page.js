'use client';
/**
 * Parcours d'onboarding des nouveaux clients (guidé par Léa).
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

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setCompany(user.company || '');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Chargement…</div>;
  }

  async function finish() {
    setSubmitting(true);
    try {
      await api('/api/auth/me', { method: 'PATCH', body: { company, onboarded: true } });
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[26rem] h-[26rem] bg-brand-500/20 -top-10 left-10 animate-float" />
      <div className="blob w-[22rem] h-[22rem] bg-cyan-500/10 bottom-0 right-10 animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-lg glass-card p-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/20 text-2xl animate-pulse-glow">🤝</div>
          <div>
            <div className="font-bold">Léa vous accompagne</div>
            <div className="text-sm text-muted">Configuration de votre espace — étape {step}/3</div>
          </div>
        </div>

        <div className="h-1.5 bg-white/[0.06] rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-brand-gradient transition-all duration-500 shadow-glow" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Bienvenue {user.name} 👋</h2>
            <p className="text-muted mt-2 text-sm">Confirmez le nom de votre entreprise pour personnaliser vos agents.</p>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input mt-4" placeholder="Nom de votre entreprise" />
            <button onClick={() => setStep(2)} className="btn-primary w-full mt-6 py-3">Continuer</button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Votre premier contact</h2>
            <p className="text-muted mt-2 text-sm">Ajoutons un premier client ou prospect à votre CRM (optionnel).</p>
            <div className="mt-4 space-y-3">
              <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} className="input" placeholder="Nom du contact" />
              <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="input" placeholder="Email (optionnel)" />
              <input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} className="input" placeholder="Société (optionnel)" />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Retour</button>
              <button onClick={() => setStep(3)} className="btn-primary flex-1">Continuer</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Tout est prêt ! 🎉</h2>
            <p className="text-muted mt-2 text-sm">
              Vos 17 agents sont à votre disposition. Pilot vous orientera vers le bon agent à chaque demande.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> Espace personnalisé pour {company || user.name}</li>
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> CRM initialisé</li>
              <li className="flex gap-2"><span className="text-cyan-400">✓</span> Pilot et ses 17 agents activés</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary flex-1">Retour</button>
              <button onClick={finish} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Finalisation…' : 'Accéder à mon espace'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
