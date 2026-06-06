'use client';
/**
 * Paramètres enrichis : profil, entreprise (infos légales), prestations,
 * contexte agents (brief + secteur), modèles de documents, abonnement, équipe.
 * Toutes ces données sont injectées automatiquement dans le contexte des agents.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { PLANS } from '@/lib/agents';

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [sectors, setSectors] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [toast, setToast] = useState(null);

  // Champs entreprise
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [siret, setSiret] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState('');
  const [vatRate, setVatRate] = useState(20);
  const [sector, setSector] = useState('');
  const [brief, setBrief] = useState('');
  const [prestations, setPrestations] = useState([]);

  // Prévisualisation de modèle
  const [preview, setPreview] = useState(null);
  const [previewLabel, setPreviewLabel] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCompany(user.company || '');
      setSiret(user.siret || '');
      setAddress(user.address || '');
      setLogo(user.logo || '');
      setVatRate(user.vat_rate ?? 20);
      setSector(user.sector || '');
      setBrief(user.brief || '');
      setPrestations(user.prestations?.length ? user.prestations : []);
    }
  }, [user]);

  useEffect(() => {
    api('/api/config/sectors').then((d) => setSectors(d.sectors)).catch(() => {});
    api('/api/config/templates').then((d) => setTemplates(d.templates)).catch(() => {});
    api('/api/billing/subscription').then((d) => setSubscription(d.subscription)).catch(() => {});
  }, []);

  function showToast(text, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 2500);
  }

  async function save(payload, msg) {
    try {
      await api('/api/auth/me', { method: 'PATCH', body: payload });
      await refresh();
      showToast(msg);
    } catch (err) {
      showToast(err.message, false);
    }
  }

  // Prestations
  const setPresta = (i, k, v) => setPrestations((p) => p.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  const addPresta = () => setPrestations((p) => [...p, { label: '', price: '', unit: '' }]);
  const removePresta = (i) => setPrestations((p) => p.filter((_, idx) => idx !== i));

  async function openPreview(type, label) {
    setPreviewLabel(label);
    setPreview('Chargement…');
    try {
      const d = await api(`/api/config/templates/${type}`);
      setPreview(d.content);
    } catch (err) {
      setPreview('Erreur : ' + err.message);
    }
  }

  const currentPlan = PLANS.find((p) => p.id === user?.plan);

  return (
    <div className="space-y-8 max-w-3xl">
      <h1 className="text-3xl font-bold animate-fade-in-up">Paramètres</h1>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 border shadow-card ${toast.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
          {toast.text}
        </div>
      )}

      {/* Profil */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Profil</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email || ''} disabled className="input opacity-60 cursor-not-allowed" />
          </div>
          <button onClick={() => save({ name }, 'Profil mis à jour ✓')} className="btn-primary">Enregistrer</button>
        </div>
      </section>

      {/* Mon entreprise */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-1">Mon entreprise</h2>
        <p className="text-sm text-muted mb-4">Apparaît sur vos devis et factures (mentions légales).</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Raison sociale</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">SIRET</label>
            <input value={siret} onChange={(e) => setSiret(e.target.value)} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">URL du logo</label>
            <input value={logo} onChange={(e) => setLogo(e.target.value)} className="input" placeholder="https://…" />
          </div>
          <div>
            <label className="label">Taux de TVA (%)</label>
            <input value={vatRate} onChange={(e) => setVatRate(e.target.value)} type="number" className="input" />
          </div>
        </div>
        {logo && (
          <img src={logo} alt="logo" className="mt-4 h-12 rounded-lg border border-white/[0.08]" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <button onClick={() => save({ company, siret, address, logo, vat_rate: Number(vatRate) }, 'Entreprise mise à jour ✓')} className="btn-primary mt-4">Enregistrer</button>
      </section>

      {/* Mes prestations */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-1">Mes prestations</h2>
        <p className="text-sm text-muted mb-4">Vos agents les utilisent pour vos devis et chiffrages.</p>
        <div className="space-y-2">
          {prestations.length === 0 && <p className="text-sm text-muted">Aucune prestation. Ajoutez-en une.</p>}
          {prestations.map((p, i) => (
            <div key={i} className="flex gap-2">
              <input value={p.label} onChange={(e) => setPresta(i, 'label', e.target.value)} className="input flex-1 py-2 text-sm" placeholder="Prestation" />
              <input value={p.price} onChange={(e) => setPresta(i, 'price', e.target.value)} type="number" className="input w-24 py-2 text-sm" placeholder="Prix €" />
              <input value={p.unit} onChange={(e) => setPresta(i, 'unit', e.target.value)} className="input w-24 py-2 text-sm" placeholder="Unité" />
              <button onClick={() => removePresta(i)} className="px-2 text-muted hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={addPresta} className="btn-ghost">+ Ajouter</button>
          <button onClick={() => save({ prestations: prestations.filter((p) => p.label.trim()) }, 'Prestations enregistrées ✓')} className="btn-primary">Enregistrer</button>
        </div>
      </section>

      {/* Contexte agents */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-1">Contexte des agents</h2>
        <p className="text-sm text-muted mb-4">Secteur et description injectés automatiquement dans chaque réponse d'agent.</p>
        <label className="label">Secteur d'activité</label>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="input mb-4">
          <option className="bg-ink-800" value="">— Choisir —</option>
          {sectors.map((s) => <option key={s.id} className="bg-ink-800" value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
        <label className="label">Brief de votre activité</label>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} className="input"
          placeholder="Décrivez votre activité, votre clientèle et votre positionnement en quelques phrases." />
        <button onClick={() => save({ sector, brief }, 'Contexte enregistré ✓')} className="btn-primary mt-4">Enregistrer</button>
      </section>

      {/* Modèles de documents */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-1">Modèles de documents</h2>
        <p className="text-sm text-muted mb-4">Prévisualisez vos modèles, pré-remplis avec vos informations.</p>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button key={t.id} onClick={() => openPreview(t.id, t.label)} className="btn-secondary text-sm">{t.label}</button>
          ))}
        </div>
        {preview && (
          <div className="mt-4 glass rounded-xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wide text-gradient font-semibold">{previewLabel}</span>
              <button onClick={() => setPreview(null)} className="text-muted hover:text-white text-sm">✕</button>
            </div>
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>
            </div>
          </div>
        )}
      </section>

      {/* Abonnement */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Abonnement</h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-lg font-bold text-gradient">{currentPlan?.label || 'Pack ' + user?.plan}</div>
            {subscription ? (
              <div className="text-sm text-muted">{subscription.price}€ / mois — actif depuis le <span className="font-mono">{subscription.started_at?.slice(0, 10)}</span></div>
            ) : (
              <div className="text-sm text-muted">Aucun abonnement payant actif (paiement simulé).</div>
            )}
          </div>
          <Link href="/pricing" className="btn-secondary">Changer de pack</Link>
        </div>
      </section>

      {/* Équipe */}
      <section className="glass-card p-6">
        <h2 className="font-semibold mb-4">Équipe & utilisateurs</h2>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="grid place-items-center w-9 h-9 rounded-full bg-brand-gradient text-white font-semibold shadow-glow">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted">{user?.email}</div>
          </div>
          <span className="chip !text-brand-200 !border-brand-500/30 !bg-brand-500/10 capitalize">{user?.role}</span>
        </div>
        <p className="text-xs text-muted mt-3">
          La gestion multi-utilisateurs (propriétaire / membre / admin) est disponible à partir du
          Pack Elite. L'invitation de collaborateurs sera activée prochainement.
        </p>
      </section>
    </div>
  );
}
