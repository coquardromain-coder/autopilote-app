'use client';
/**
 * Page Intégrations — grille unifiée de connecteurs (dark premium).
 * Chaque card : icône, nom, description, agents activés, statut et
 * configuration en modal avec test automatique à la sauvegarde.
 */
import { useEffect, useState } from 'react';
import { api, getToken, API_URL } from '@/lib/api';

const STATUS = {
  non_configure: { dot: 'bg-white/30', label: 'Non configuré' },
  en_cours: { dot: 'bg-amber-400', label: 'En cours' },
  connecte: { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]', label: 'Connecté' },
  erreur: { dot: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]', label: 'Erreur' },
};

// Libellés lisibles des champs
const FIELD_LABELS = {
  url: 'URL', apikey: 'Clé API', senderEmail: 'Email expéditeur',
  phoneNumberId: 'Phone Number ID (Meta)', accessToken: 'Access Token permanent', verifyToken: 'Verify Token',
  accessKeyId: 'Access Key ID', accessKeySecret: 'Access Key Secret', phoneNumber: 'Numéro de téléphone',
  username: 'Identifiant', password: 'Mot de passe', publicKey: 'Clé publique', secretKey: 'Clé secrète',
  siteUrl: 'URL du site', propertyId: 'ID propriété GA4', locationId: 'ID établissement',
  email_compta: 'Email export comptable',
};
const isSecret = (f) => /key|token|password|secret/i.test(f);

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState([]);
  const [google, setGoogle] = useState(null);
  const [modal, setModal] = useState(null); // connecteur en cours d'édition
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api('/api/connectors').then((d) => setConnectors(d.connectors)).catch(() => {});
    api('/api/google/status').then(setGoogle).catch(() => {});
  }
  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get('google') || p.get('social')) window.history.replaceState({}, '', '/dashboard/integrations');
  }, []);

  function openModal(c) { setModal(c); setForm({}); setResult(null); }

  function connectGoogle() { window.location.href = `${API_URL}/api/auth/google?token=${encodeURIComponent(getToken())}`; }
  function connectOauth(provider) { window.location.href = `${API_URL}/api/auth/${provider}?token=${encodeURIComponent(getToken())}`; }

  async function save() {
    setSaving(true); setResult(null);
    try {
      const d = await api(`/api/connectors/${modal.id}`, { method: 'POST', body: form });
      setResult(d.success ? { ok: true, text: `Connecté ✓${d.version ? ' (v' + d.version + ')' : ''}` } : { ok: false, text: d.error || 'Échec du test' });
      load();
    } catch (err) { setResult({ ok: false, text: err.message }); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Intégrations</h1>
        <p className="text-muted mt-1">Connectez vos outils — vos agents s'en servent automatiquement.</p>
      </div>

      {/* Google Workspace (socle OAuth pour Search Console / Analytics / Business) */}
      <div className="glass-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl">🔗</div>
          <div>
            <div className="font-semibold">Google Workspace</div>
            <div className="text-sm text-muted">{google?.connected ? `Connecté — ${google.email}` : 'Gmail, Calendar, Drive (requis pour Search Console, Analytics, Business)'}</div>
          </div>
        </div>
        {google?.connected
          ? <span className="chip !text-emerald-300 !border-emerald-500/30 !bg-emerald-500/10">🟢 Connecté</span>
          : <button onClick={connectGoogle} className="btn-secondary">Se connecter avec Google</button>}
      </div>

      {/* Grille de connecteurs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((c) => {
          const st = STATUS[c.status] || STATUS.non_configure;
          return (
            <div key={c.id} className={`glass-card p-5 flex flex-col transition-all duration-300 ${c.status === 'connecte' ? 'border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.15)]' : 'glass-card-hover'}`}>
              <div className="flex items-start justify-between">
                <div className="grid place-items-center w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl">{c.icon}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} /> {st.label}
                </div>
              </div>
              <div className="font-semibold mt-3">{c.name}</div>
              <div className="text-sm text-muted">{c.description}</div>
              <div className="mt-2 text-[11px] text-brand-200">{c.agents.join(' • ')}</div>
              <div className="mt-4">
                {c.oauth === 'meta' || c.oauth === 'linkedin' ? (
                  c.status === 'connecte'
                    ? <span className="text-xs text-emerald-400">Connecté ✓</span>
                    : <button onClick={() => connectOauth(c.oauth === 'meta' ? 'facebook' : 'linkedin')} className="btn-secondary text-sm w-full">Connecter</button>
                ) : (
                  <button onClick={() => openModal(c)} className="btn-secondary text-sm w-full">Configurer</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de configuration */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="glass-card p-6 w-full max-w-md animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">{modal.icon}</span>
              <h2 className="font-bold text-lg">{modal.name}</h2>
            </div>
            <p className="text-sm text-muted mb-4">{modal.description} — {modal.agents.join(' • ')}</p>

            {modal.oauth === 'google' && !google?.connected && (
              <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
                Connectez d'abord Google Workspace (ci-dessus).
              </p>
            )}

            <div className="space-y-3">
              {(modal.fields || []).map((f) => (
                <div key={f}>
                  <label className="label">{FIELD_LABELS[f] || f}</label>
                  <input type={isSecret(f) ? 'password' : 'text'} value={form[f] || ''}
                    onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="input"
                    placeholder={FIELD_LABELS[f] || f} />
                </div>
              ))}
              {(!modal.fields || modal.fields.length === 0) && (
                <p className="text-sm text-muted">Cette intégration se connecte via OAuth (aucun champ à saisir).</p>
              )}
            </div>

            {result && <p className={`mt-3 text-sm ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.ok ? '✅ ' : '⚠️ '}{result.text}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Fermer</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Test…' : 'Sauvegarder & tester'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
