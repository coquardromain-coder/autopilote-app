'use client';
/**
 * Onboarding intelligent AutoPilote — adapté au pack du client.
 * Phases : 1) Entreprise + équipe IA  2) Connexion des outils (selon pack)
 * 3) Personnalisation (brief, prestations, ton)  4) Dolibarr  5) Premier contact.
 * Progression sauvegardée en base (reprise possible), design dark premium responsive.
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth';
import { api, getToken, API_URL } from '@/lib/api';

const STEPS = ['Entreprise', 'Votre équipe IA', 'Connexion des outils', 'Personnalisation', 'Espace Dolibarr', 'Premier contact'];

// Suggestion de première demande selon le secteur
const FIRST_PROMPTS = {
  traiteur: 'Génère un devis pour un mariage de 80 personnes avec menu 3 services',
  restaurant: 'Rédige un post Instagram pour annoncer notre menu du jour',
  artisan: 'Rédige un devis pour un dépannage plomberie de 2h',
  commerce: 'Rédige un post pour annoncer une promotion -20% ce week-end',
  liberal: 'Rédige un email de prospection pour proposer un audit gratuit',
  immobilier: 'Rédige une annonce attractive pour un appartement T3 lumineux',
  beaute: 'Propose un calendrier de publications Instagram pour la semaine',
  generique: 'Présente-moi ce que tu peux faire pour mon entreprise',
};

const STATUS_DOT = {
  non_configure: '⬜', en_cours: '🔄', connecte: '✅', erreur: '⚠️',
};

export default function OnboardingPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);   // état serveur (/api/onboarding)
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Formulaire (miroir des champs utilisateur)
  const [form, setForm] = useState({
    company: '', siret: '', address: '', phone: '', logo: '', sector: '',
    billing_email: '', brief: '', tone: 'semi', email_signature: '',
    vat_rate: 20, prestations: [],
  });

  const load = useCallback(() => {
    api('/api/onboarding').then((d) => {
      setData(d);
      setForm((f) => ({
        ...f,
        company: d.user.company || '', siret: d.user.siret || '', address: d.user.address || '',
        phone: d.user.phone || '', logo: d.user.logo || '', sector: d.user.sector || '',
        billing_email: d.user.billing_email || '', brief: d.user.brief || '',
        tone: d.user.tone || 'semi', email_signature: d.user.email_signature || '',
        vat_rate: d.user.vat_rate ?? 20,
        prestations: d.user.prestations?.length ? d.user.prestations : [],
      }));
      if (typeof d.step === 'number' && d.step > 0) setStep(d.step);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (loading || !user || !data) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Chargement…</div>;
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(extra = {}) {
    setSaving(true);
    try { await api('/api/onboarding', { method: 'PATCH', body: { ...form, ...extra } }); }
    finally { setSaving(false); }
  }
  async function next() { await save({ step: Math.min(STEPS.length - 1, step + 1) }); setStep((s) => s + 1); }
  function prev() { setStep((s) => Math.max(0, s - 1)); }

  // Upload logo → data URL (limité en taille)
  function onLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) { alert('Logo trop lourd (max 300 Ko).'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative min-h-screen px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[30rem] h-[30rem] bg-brand-500/15 -top-20 left-0 animate-float" />
      <div className="blob w-[24rem] h-[24rem] bg-cyan-500/10 bottom-0 right-0 animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative max-w-2xl mx-auto">
        {/* En-tête + progression */}
        <div className="flex items-center gap-3 mb-4">
          <div className="grid place-items-center w-11 h-11 rounded-2xl bg-brand-gradient shadow-glow text-xl animate-pulse-glow">🎯</div>
          <div>
            <div className="font-bold">Bienvenue sur AutoPilote</div>
            <div className="text-sm text-muted">Pack <span className="capitalize text-cyan-400">{data.plan}</span> · Étape {step + 1}/{STEPS.length} — {STEPS[step]}</div>
          </div>
        </div>
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-brand-gradient shadow-glow' : 'bg-white/[0.08]'}`} />
          ))}
        </div>

        <div className="glass-card p-6 animate-fade-in-up">
          {step === 0 && <StepCompany form={form} set={set} onLogo={onLogo} sectors={data.sectorsList} setForm={setForm} />}
          {step === 1 && <StepTeam data={data} />}
          {step === 2 && <StepTools data={data} reload={load} />}
          {step === 3 && <StepPerso form={form} set={set} setForm={setForm} examples={data.sectorExamples} />}
          {step === 4 && <StepDolibarr data={data} reload={load} />}
          {step === 5 && <StepFirstContact form={form} refresh={refresh} router={router} save={save} />}

          {/* Navigation */}
          {step < 5 && (
            <div className="mt-6 flex gap-3">
              {step > 0 && <button onClick={prev} className="btn-secondary flex-1">Retour</button>}
              <button onClick={next} disabled={saving || (step === 0 && !form.company.trim())} className="btn-primary flex-1">
                {saving ? 'Enregistrement…' : 'Continuer'}
              </button>
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-muted mt-3">💾 Votre progression est sauvegardée automatiquement.</p>
      </div>
    </div>
  );
}

/* ─────────── Étape 1 : Entreprise ─────────── */
function StepCompany({ form, set, onLogo, setForm }) {
  const [sectors, setSectors] = useState([]);
  useEffect(() => { api('/api/config/sectors').then((d) => setSectors(d.sectors)).catch(() => {}); }, []);
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Informations de votre entreprise</h2>
      <p className="text-muted text-sm">Elles apparaîtront sur vos devis et factures.</p>
      <input value={form.company} onChange={set('company')} className="input" placeholder="Nom de la société *" />
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={form.siret} onChange={set('siret')} className="input" placeholder="SIRET" />
        <input value={form.phone} onChange={set('phone')} className="input" placeholder="Téléphone" />
      </div>
      <input value={form.address} onChange={set('address')} className="input" placeholder="Adresse" />
      <input type="email" value={form.billing_email} onChange={set('billing_email')} className="input" placeholder="Email de facturation" />
      <div>
        <label className="label">Secteur d'activité</label>
        <select value={form.sector} onChange={set('sector')} className="input">
          <option className="bg-ink-800" value="">— Choisir —</option>
          {sectors.map((s) => <option key={s.id} className="bg-ink-800" value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Logo (max 300 Ko)</label>
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={onLogo} className="text-sm text-muted" />
          {form.logo && <img src={form.logo} alt="logo" className="h-10 rounded-lg border border-white/[0.08]" />}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Étape 2 : Présentation de l'équipe ─────────── */
function StepTeam({ data }) {
  // Agents activables par le pack = union des "activates" des outils + Directeur
  const names = new Set(['Directeur']);
  data.tools.forEach((t) => (t.activates || []).forEach((n) => names.add(n)));
  const team = data.agents.filter((a) => names.has(a.name));
  return (
    <div>
      <h2 className="text-lg font-semibold">Votre équipe IA, pilotée par le Directeur 🎯</h2>
      <p className="text-muted text-sm mb-4">Voici les agents inclus dans votre pack <span className="capitalize">{data.plan}</span> et ce qu'ils font pour vous.</p>
      <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
        {team.map((a) => (
          <div key={a.id} className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="text-2xl">{a.avatar}</div>
            <div>
              <div className="font-medium text-sm">{a.name}</div>
              <div className="text-xs text-muted">{a.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Étape 3 : Connexion des outils ─────────── */
function StepTools({ data, reload }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Connectez vos outils</h2>
      <p className="text-muted text-sm mb-4">Selon votre pack. Vous pouvez passer un outil et le configurer plus tard.</p>
      <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
        {data.tools.map((t) => <ToolCard key={t.id} tool={t} reload={reload} />)}
      </div>
      <button onClick={reload} className="btn-ghost mt-3">🔄 Rafraîchir les statuts</button>
    </div>
  );
}

function ToolCard({ tool, reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const connected = tool.status === 'connecte';

  function connectGoogle() { window.open(`${API_URL}/auth/google?token=${encodeURIComponent(getToken())}`, '_blank'); }
  function connectSocial(p) { window.open(`${API_URL}/auth/${p}?token=${encodeURIComponent(getToken())}`, '_blank'); }

  async function saveFields() {
    setBusy(true); setMsg(null);
    try {
      const d = await api(`/api/connectors/${tool.id}`, { method: 'POST', body: form });
      setMsg(d.success ? { ok: true, text: 'Connecté ✓' } : { ok: false, text: d.error || 'Échec' });
      reload();
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <div className={`glass rounded-xl p-3 ${connected ? 'border border-emerald-500/30' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{tool.icon}</span>
          <div>
            <div className="font-medium text-sm">{tool.name}</div>
            <div className="text-[11px] text-brand-200">{(tool.activates || []).join(' • ')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span>{STATUS_DOT[tool.status] || '⬜'}</span>
          {!connected && tool.kind === 'google' && <button onClick={connectGoogle} className="btn-secondary text-xs py-1.5">Connecter Google</button>}
          {!connected && tool.kind === 'social' && <button onClick={() => connectSocial(tool.provider)} className="btn-secondary text-xs py-1.5">Connecter</button>}
          {!connected && (tool.kind === 'connector' || tool.kind === 'google_field') && (
            <button onClick={() => setOpen((o) => !o)} className="btn-secondary text-xs py-1.5">Configurer</button>
          )}
          {connected && <span className="text-emerald-400">Connecté</span>}
        </div>
      </div>

      {open && !connected && (tool.kind === 'connector' || tool.kind === 'google_field') && (
        <div className="mt-3 space-y-2">
          {tool.kind === 'google_field' && <p className="text-[11px] text-amber-300">Nécessite Google connecté.</p>}
          {(tool.fields || []).map((f) => (
            <input key={f} type={/key|token|password|secret/i.test(f) ? 'password' : 'text'} value={form[f] || ''}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="input text-sm py-2" placeholder={f} />
          ))}
          {tool.help && <a href={tool.help} target="_blank" rel="noreferrer" className="text-[11px] text-cyan-400 hover:underline">Obtenir mes identifiants →</a>}
          <button onClick={saveFields} disabled={busy} className="btn-primary text-sm w-full">{busy ? 'Test…' : 'Enregistrer & tester'}</button>
          {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
        </div>
      )}
    </div>
  );
}

/* ─────────── Étape 4 : Personnalisation ─────────── */
function StepPerso({ form, set, setForm, examples }) {
  const setPresta = (i, k, v) => setForm((f) => ({ ...f, prestations: f.prestations.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const addPresta = () => setForm((f) => ({ ...f, prestations: [...f.prestations, { label: '', price: '', unit: '' }] }));
  const removePresta = (i) => setForm((f) => ({ ...f, prestations: f.prestations.filter((_, idx) => idx !== i) }));
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Décrivez votre activité</h2>
          <button onClick={() => setForm((f) => ({ ...f, brief: examples.brief }))} className="btn-ghost text-xs">Utiliser l'exemple</button>
        </div>
        <textarea value={form.brief} onChange={set('brief')} rows={4} className="input mt-2" placeholder={examples.brief} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Vos prestations & tarifs</h3>
          <button onClick={() => setForm((f) => ({ ...f, prestations: examples.prestations }))} className="btn-ghost text-xs">Pré-remplir l'exemple</button>
        </div>
        <div className="space-y-2 mt-2 max-h-44 overflow-y-auto pr-1">
          {form.prestations.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.label} onChange={(e) => setPresta(i, 'label', e.target.value)} className="input flex-1 py-2 text-sm" placeholder="Prestation" />
              <input value={p.price} onChange={(e) => setPresta(i, 'price', e.target.value)} type="number" className="input w-20 py-2 text-sm" placeholder="Prix" />
              <input value={p.unit} onChange={(e) => setPresta(i, 'unit', e.target.value)} className="input w-20 py-2 text-sm" placeholder="Unité" />
              <button onClick={() => removePresta(i)} className="px-2 text-muted hover:text-red-400">✕</button>
            </div>
          ))}
        </div>
        <button onClick={addPresta} className="btn-ghost mt-1">+ Ajouter</button>
      </div>

      <div>
        <label className="label">Ton de communication des agents</label>
        <div className="flex gap-2">
          {[['formel', 'Formel'], ['semi', 'Semi-formel'], ['decontracte', 'Décontracté']].map(([v, l]) => (
            <button key={v} onClick={() => setForm((f) => ({ ...f, tone: v }))}
              className={`flex-1 py-2 rounded-lg text-sm border transition ${form.tone === v ? 'bg-brand-gradient border-transparent shadow-glow' : 'glass text-muted'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Signature email automatique</label>
        <textarea value={form.email_signature} onChange={set('email_signature')} rows={3} className="input" placeholder={`${form.company || 'Votre société'}\nTél : …`} />
      </div>
    </div>
  );
}

/* ─────────── Étape 5 : Dolibarr ─────────── */
function StepDolibarr({ data, reload }) {
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function provision() {
    setBusy(true); setMsg(null);
    try { const d = await api('/api/onboarding/dolibarr', { method: 'POST' }); setMsg(d.message); reload(); }
    catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  return (
    <div>
      <h2 className="text-lg font-semibold">Votre espace Dolibarr 📒</h2>
      <p className="text-muted text-sm mb-4">Dolibarr gère vos devis, factures et votre comptabilité. Activez votre espace mutualisé en un clic.</p>
      <div className="glass rounded-xl p-4">
        {data.dolibarrProvisioned
          ? <p className="text-emerald-400 text-sm">✅ Espace Dolibarr activé.</p>
          : <button onClick={provision} disabled={busy} className="btn-primary w-full">{busy ? 'Activation…' : 'Activer mon espace Dolibarr'}</button>}
        {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
      </div>
      <p className="text-[11px] text-muted mt-2">Vous pourrez aussi connecter votre propre instance dans Intégrations.</p>
    </div>
  );
}

/* ─────────── Étape 6 : Premier contact ─────────── */
function StepFirstContact({ form, refresh, router, save }) {
  const suggestion = FIRST_PROMPTS[form.sector] || FIRST_PROMPTS.generique;
  const [input, setInput] = useState(suggestion);
  const [reply, setReply] = useState(null);
  const [busy, setBusy] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  async function send() {
    if (!input.trim()) return;
    setBusy(true); setReply(null);
    try {
      const d = await api('/api/chat/message', { method: 'POST', body: { message: input } });
      setReply(d.reply); setCelebrate(true);
    } catch (e) { setReply({ agentName: 'Erreur', content: e.message }); }
    finally { setBusy(false); }
  }
  async function finish() { await save({ onboarded: true, step: 5 }); await refresh(); router.push('/dashboard'); }

  return (
    <div>
      <h2 className="text-lg font-semibold">Premier contact avec le Directeur 🎯</h2>
      <p className="text-muted text-sm mb-3">Essayez une première demande — le Directeur la confiera au bon agent.</p>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} className="input" />
      <button onClick={send} disabled={busy} className="btn-primary w-full mt-2">{busy ? 'Le Directeur réfléchit…' : 'Envoyer au Directeur'}</button>

      {reply && (
        <div className={`mt-4 glass rounded-xl p-4 ${celebrate ? 'animate-fade-in-up border border-emerald-500/30 shadow-glow' : ''}`}>
          {celebrate && <div className="text-center text-2xl mb-2">🎉 Bravo, votre équipe IA est opérationnelle !</div>}
          <div className="text-xs font-semibold text-cyan-400 mb-1">{reply.agentName}</div>
          <div className="prose-chat max-h-60 overflow-y-auto"><ReactMarkdown remarkPlugins={[remarkGfm]}>{reply.content}</ReactMarkdown></div>
        </div>
      )}

      <button onClick={finish} className="btn-primary w-full mt-4">Terminer & accéder à mon dashboard</button>
    </div>
  );
}
