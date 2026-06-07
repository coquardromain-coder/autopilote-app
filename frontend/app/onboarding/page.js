'use client';
/**
 * Onboarding SIMPLIFIÉ — le client ne fait que 3 choses :
 * 1) infos entreprise  2) connecter Gmail  3) décrire son activité.
 * Le reste (WhatsApp, Dolibarr, réseaux sociaux…) est configuré par le
 * conseiller AutoPilote lors de la session de démarrage (sous 24h).
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, getToken, API_URL } from '@/lib/api';

const STEPS = ['Votre entreprise', 'Connecter Gmail', 'Votre activité', 'C\'est parti !'];
const ADVISOR_TOOLS = ['WhatsApp Business', 'Dolibarr (ERP & compta)', 'Réseaux sociaux', 'Signature électronique', 'Téléphonie', 'SEO & WordPress'];

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company: '', siret: '', address: '', phone: '', logo: '', sector: '', billing_email: '', brief: '' });

  const load = useCallback(() => {
    api('/api/onboarding').then((d) => {
      setData(d);
      setForm((f) => ({
        ...f,
        company: d.user.company || '', siret: d.user.siret || '', address: d.user.address || '',
        phone: d.user.phone || '', logo: d.user.logo || '', sector: d.user.sector || '',
        billing_email: d.user.billing_email || '', brief: d.user.brief || '',
      }));
    }).catch(() => {});
  }, []);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  useEffect(() => { if (user) { load(); api('/api/config/sectors').then((d) => setSectors(d.sectors)).catch(() => {}); } }, [user, load]);

  if (loading || !user || !data) return <div className="min-h-screen flex items-center justify-center text-muted">Chargement…</div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const gmailConnected = data.tools?.find((t) => t.id === 'gmail')?.status === 'connecte';

  async function save(extra = {}) {
    setSaving(true);
    try { await api('/api/onboarding', { method: 'PATCH', body: { ...form, ...extra } }); } finally { setSaving(false); }
  }
  async function next() { await save({ step: step + 1 }); setStep((s) => s + 1); }
  function prev() { setStep((s) => Math.max(0, s - 1)); }
  function connectGmail() { window.open(`${API_URL}/auth/google?token=${encodeURIComponent(getToken())}`, '_blank'); }
  function onLogo(e) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 300 * 1024) { alert('Logo trop lourd (max 300 Ko).'); return; }
    const r = new FileReader(); r.onload = () => setForm((f) => ({ ...f, logo: r.result })); r.readAsDataURL(file);
  }
  async function finish() { await save({ onboarded: true }); await refresh(); router.push('/dashboard'); }

  const example = data.sectorExamples?.brief || '';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[28rem] h-[28rem] bg-brand-500/15 -top-20 left-0 animate-float" />
      <div className="blob w-[22rem] h-[22rem] bg-cyan-500/10 bottom-0 right-0 animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative w-full max-w-lg">
        {/* En-tête + progression */}
        <div className="flex items-center gap-3 mb-4">
          <div className="grid place-items-center w-11 h-11 rounded-2xl bg-brand-gradient shadow-glow text-xl animate-pulse-glow">🎯</div>
          <div>
            <div className="font-bold">Bienvenue sur AutoPilote</div>
            <div className="text-sm text-muted">Étape {step + 1}/{STEPS.length} — {STEPS[step]}</div>
          </div>
        </div>
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-brand-gradient shadow-glow' : 'bg-white/[0.08]'}`} />)}
        </div>

        {/* Bandeau conseiller */}
        <div className="glass rounded-xl px-4 py-3 mb-4 text-sm text-muted flex items-start gap-2">
          <span className="text-lg">🗓️</span>
          <span>Après votre inscription, <strong className="text-white">votre conseiller AutoPilote vous contactera dans les 24h</strong> pour configurer votre espace et vous former à l'utilisation.</span>
        </div>

        <div className="glass-card p-6 animate-fade-in-up">
          {/* Étape 1 — Entreprise */}
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Vos informations</h2>
              <p className="text-muted text-sm">L'essentiel pour personnaliser vos agents.</p>
              <input value={form.company} onChange={set('company')} className="input" placeholder="Nom de la société *" />
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.siret} onChange={set('siret')} className="input" placeholder="SIRET (optionnel)" />
                <input value={form.phone} onChange={set('phone')} className="input" placeholder="Téléphone (optionnel)" />
              </div>
              <input value={form.address} onChange={set('address')} className="input" placeholder="Adresse (optionnel)" />
              <input type="email" value={form.billing_email} onChange={set('billing_email')} className="input" placeholder="Email de facturation (optionnel)" />
              <select value={form.sector} onChange={set('sector')} className="input">
                <option className="bg-ink-800" value="">Secteur d'activité…</option>
                {sectors.map((s) => <option key={s.id} className="bg-ink-800" value={s.id}>{s.emoji} {s.label}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/*" onChange={onLogo} className="text-sm text-muted" />
                {form.logo && <img src={form.logo} alt="logo" className="h-10 rounded-lg border border-white/[0.08]" />}
              </div>
            </div>
          )}

          {/* Étape 2 — Gmail */}
          {step === 1 && (
            <div className="text-center">
              <div className="text-4xl mb-3">📧</div>
              <h2 className="text-lg font-semibold">Connectez Gmail</h2>
              <p className="text-muted text-sm mt-1 mb-4">En 1 clic — vos agents pourront lire et envoyer vos emails (Directeur, Assistance, Relance).</p>
              {gmailConnected ? (
                <div className="glass rounded-xl p-4 text-emerald-400">✅ Gmail connecté</div>
              ) : (
                <>
                  <button onClick={connectGmail} className="btn-secondary w-full"><span className="text-lg">🔗</span> Connecter Gmail (Google)</button>
                  <button onClick={load} className="btn-ghost mt-2">🔄 J'ai connecté → vérifier</button>
                  <p className="text-[11px] text-muted mt-2">Optionnel — vous pourrez le faire plus tard.</p>
                </>
              )}
            </div>
          )}

          {/* Étape 3 — Activité */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Décrivez votre activité</h2>
                {example && <button onClick={() => setForm((f) => ({ ...f, brief: example }))} className="btn-ghost text-xs">Exemple</button>}
              </div>
              <p className="text-muted text-sm mt-1 mb-3">En 3 phrases : ce que vous faites, votre clientèle, votre positionnement.</p>
              <textarea value={form.brief} onChange={set('brief')} rows={5} className="input" placeholder={example} />
            </div>
          )}

          {/* Étape 4 — Récap / conseiller */}
          {step === 3 && (
            <div>
              <div className="text-center text-3xl mb-2">🎉</div>
              <h2 className="text-lg font-semibold text-center">Votre espace est prêt !</h2>
              <p className="text-muted text-sm text-center mt-1 mb-4">Le Directeur et vos agents de base sont actifs.</p>
              <div className="glass rounded-xl p-4">
                <div className="text-sm font-medium mb-2">🤝 Votre conseiller configure pour vous :</div>
                <div className="grid grid-cols-2 gap-2">
                  {ADVISOR_TOOLS.map((t) => (
                    <div key={t} className="text-xs text-muted flex items-center gap-1.5"><span className="text-cyan-400">•</span> {t}</div>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-3">🗓️ Vous serez contacté sous 24h pour la session de démarrage.</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 0 && <button onClick={prev} className="btn-secondary flex-1">Retour</button>}
            {step < 3
              ? <button onClick={next} disabled={saving || (step === 0 && !form.company.trim())} className="btn-primary flex-1">{saving ? '…' : 'Continuer'}</button>
              : <button onClick={finish} disabled={saving} className="btn-primary flex-1">Accéder à mon dashboard</button>}
          </div>
        </div>
        <p className="text-center text-[11px] text-muted mt-3">💾 Progression sauvegardée automatiquement.</p>
      </div>
    </div>
  );
}
