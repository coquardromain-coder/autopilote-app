'use client';
/**
 * Parcours d'onboarding premium en 5 étapes (guidé par Commercial) :
 * 1. Infos entreprise  2. Secteur  3. Prestations & tarifs
 * 4. Brief agents  5. Google Workspace (optionnel).
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, getToken, API_URL } from '@/lib/api';
import { SECTOR_CONNECTORS } from '@/lib/agents';

const STEPS = ['Entreprise', 'Secteur', 'Prestations', 'Brief agents', 'Google'];

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sectors, setSectors] = useState([]);
  const [allConnectors, setAllConnectors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Données collectées
  const [company, setCompany] = useState('');
  const [siret, setSiret] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');
  const [sector, setSector] = useState('');
  const [vatRate, setVatRate] = useState(20);
  const [prestations, setPrestations] = useState([{ label: '', price: '', unit: '' }]);
  const [brief, setBrief] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) {
      setCompany(user.company || '');
      setSiret(user.siret || '');
      setAddress(user.address || '');
      if (user.sector) setSector(user.sector);
    }
  }, [user, loading, router]);

  useEffect(() => {
    api('/api/config/sectors').then((d) => setSectors(d.sectors)).catch(() => {});
    api('/api/connectors').then((d) => setAllConnectors(d.connectors)).catch(() => {});
  }, []);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Chargement…</div>;
  }

  // Gestion des lignes de prestations
  const setPresta = (i, k, v) => setPrestations((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addPresta = () => setPrestations((p) => [...p, { label: '', price: '', unit: '' }]);
  const removePresta = (i) => setPrestations((p) => p.filter((_, idx) => idx !== i));

  async function saveAll(goDashboard = true) {
    setSubmitting(true);
    try {
      const cleanPresta = prestations.filter((p) => p.label.trim());
      await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          company, siret, address, logo, sector,
          vat_rate: Number(vatRate),
          prestations: cleanPresta,
          brief,
          onboarded: true,
        },
      });
      await refresh();
      if (goDashboard) router.push('/dashboard');
    } catch (err) {
      alert('Erreur : ' + err.message);
      setSubmitting(false);
    }
  }

  function connectGoogle() {
    // Sauvegarde d'abord, puis lance OAuth (retour géré par la page intégrations)
    saveAll(false).then(() => {
      const token = getToken();
      window.location.href = `${API_URL}/auth/google?token=${encodeURIComponent(token)}`;
    });
  }

  const next = () => setStep((s) => Math.min(5, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[28rem] h-[28rem] bg-brand-500/20 -top-10 left-10 animate-float" />
      <div className="blob w-[22rem] h-[22rem] bg-cyan-500/10 bottom-0 right-10 animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-xl glass-card p-8 animate-fade-in-up">
        {/* En-tête Commercial */}
        <div className="flex items-center gap-3 mb-5">
          <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/20 text-2xl animate-pulse-glow">🤝</div>
          <div>
            <div className="font-bold">Commercial configure votre espace</div>
            <div className="text-sm text-muted">Étape {step}/5 — {STEPS[step - 1]}</div>
          </div>
        </div>

        {/* Progression */}
        <div className="flex gap-1.5 mb-7">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < step ? 'bg-brand-gradient shadow-glow' : 'bg-white/[0.08]'}`} />
          ))}
        </div>

        {/* Étape 1 — Entreprise */}
        {step === 1 && (
          <div className="animate-fade-in-up space-y-3">
            <h2 className="text-lg font-semibold">Informations de votre entreprise</h2>
            <p className="text-muted text-sm">Ces informations apparaîtront sur vos devis et factures.</p>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" placeholder="Nom de l'entreprise *" />
            <input value={siret} onChange={(e) => setSiret(e.target.value)} className="input" placeholder="SIRET (14 chiffres)" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="Adresse postale" />
            <input value={logo} onChange={(e) => setLogo(e.target.value)} className="input" placeholder="URL du logo (optionnel)" />
            <button onClick={next} disabled={!company.trim()} className="btn-primary w-full py-3 mt-2">Continuer</button>
          </div>
        )}

        {/* Étape 2 — Secteur */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Votre secteur d'activité</h2>
            <p className="text-muted text-sm mb-4">Vos agents s'adapteront automatiquement à votre métier.</p>
            <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {sectors.map((s) => (
                <button key={s.id} onClick={() => setSector(s.id)}
                  className={`text-left p-3 rounded-xl border transition-all duration-300 ${
                    sector === s.id ? 'border-brand-500/60 bg-brand-500/10 shadow-glow' : 'border-white/[0.08] bg-white/[0.03] hover:border-brand-500/30'
                  }`}>
                  <div className="flex items-center gap-2 font-medium"><span className="text-xl">{s.emoji}</span> {s.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={prev} className="btn-secondary flex-1">Retour</button>
              <button onClick={next} disabled={!sector} className="btn-primary flex-1">Continuer</button>
            </div>
          </div>
        )}

        {/* Étape 3 — Prestations */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Vos prestations et tarifs</h2>
            <p className="text-muted text-sm mb-4">Vos agents les utiliseront pour vos devis et chiffrages.</p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {prestations.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p.label} onChange={(e) => setPresta(i, 'label', e.target.value)} className="input flex-1 py-2 text-sm" placeholder="Prestation" />
                  <input value={p.price} onChange={(e) => setPresta(i, 'price', e.target.value)} type="number" className="input w-24 py-2 text-sm" placeholder="Prix €" />
                  <input value={p.unit} onChange={(e) => setPresta(i, 'unit', e.target.value)} className="input w-24 py-2 text-sm" placeholder="Unité" />
                  <button onClick={() => removePresta(i)} className="px-2 text-muted hover:text-red-400 transition-colors">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addPresta} className="btn-ghost mt-2">+ Ajouter une prestation</button>
            <div className="mt-3">
              <label className="label">Taux de TVA applicable (%)</label>
              <input value={vatRate} onChange={(e) => setVatRate(e.target.value)} type="number" className="input w-32" />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={prev} className="btn-secondary flex-1">Retour</button>
              <button onClick={next} className="btn-primary flex-1">Continuer</button>
            </div>
          </div>
        )}

        {/* Étape 4 — Brief agents */}
        {step === 4 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Briefez vos agents</h2>
            <p className="text-muted text-sm mb-4">Décrivez votre activité en 3 à 5 phrases. Vos agents s'en serviront pour personnaliser chaque réponse.</p>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={6} className="input"
              placeholder="Ex : Nous sommes un salon de coiffure haut de gamme dans le centre-ville. Notre clientèle est plutôt féminine, 30-55 ans. Nous proposons coupe, coloration et soins. Notre positionnement est premium et nous misons sur la fidélisation." />
            <div className="mt-6 flex gap-3">
              <button onClick={prev} className="btn-secondary flex-1">Retour</button>
              <button onClick={next} className="btn-primary flex-1">Continuer</button>
            </div>
          </div>
        )}

        {/* Étape 5 — Connectez vos outils */}
        {step === 5 && (
          <div className="animate-fade-in-up">
            <h2 className="text-lg font-semibold">Connectez vos outils</h2>
            <p className="text-muted text-sm mb-4">Recommandés pour votre secteur — <span className="italic">optionnel, configurable plus tard</span> dans « Intégrations ».</p>

            {/* Google Workspace */}
            <button onClick={connectGoogle} disabled={submitting} className="btn-secondary w-full mb-3">
              <span className="text-lg">🔗</span> Connecter Google Workspace
            </button>

            {/* 3 connecteurs recommandés selon le secteur */}
            <div className="grid sm:grid-cols-3 gap-2">
              {(SECTOR_CONNECTORS[sector] || SECTOR_CONNECTORS.generique).map((cid) => {
                const c = allConnectors.find((x) => x.id === cid);
                if (!c) return null;
                return (
                  <div key={cid} className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl">{c.icon}</div>
                    <div className="text-sm font-medium mt-1">{c.name}</div>
                    <div className="text-[11px] text-muted">{c.description}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-2 text-center">Vous les configurerez en 2 minutes depuis « Intégrations ».</p>

            <div className="mt-6 flex gap-3">
              <button onClick={prev} className="btn-secondary flex-1">Retour</button>
              <button onClick={() => saveAll(true)} disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Finalisation…' : 'Terminer & accéder au dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
