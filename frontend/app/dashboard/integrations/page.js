'use client';
/**
 * Page Intégrations Google : connexion OAuth puis utilisation des
 * services Gmail (envoi), Calendar (rendez-vous) et Drive (documents).
 */
import { useEffect, useState } from 'react';
import { api, getToken, API_URL } from '@/lib/api';

const FEEDBACK = {
  connecte: { type: 'ok', text: '✅ Compte Google connecté avec succès.' },
  refus: { type: 'err', text: 'Connexion annulée : vous avez refusé l\'autorisation.' },
  session: { type: 'err', text: 'Session expirée, reconnectez-vous puis réessayez.' },
  erreur: { type: 'err', text: 'Une erreur est survenue lors de la connexion.' },
};

export default function IntegrationsPage() {
  const [status, setStatus] = useState(null);
  const [feedback, setFeedback] = useState(null);

  function loadStatus() {
    api('/api/google/status').then(setStatus).catch(() => {});
  }

  useEffect(() => {
    loadStatus();
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    const s = params.get('social');
    if (g && FEEDBACK[g]) setFeedback(FEEDBACK[g]);
    else if (s) {
      setFeedback(s.endsWith('_connecte')
        ? { type: 'ok', text: '✅ Réseau social connecté avec succès.' }
        : { type: 'err', text: 'La connexion au réseau social a échoué.' });
    }
    if (g || s) window.history.replaceState({}, '', '/dashboard/integrations');
  }, []);

  function connect() {
    const token = getToken();
    window.location.href = `${API_URL}/auth/google?token=${encodeURIComponent(token)}`;
  }

  async function disconnect() {
    if (!confirm('Déconnecter votre compte Google ?')) return;
    await api('/api/google/disconnect', { method: 'POST' });
    loadStatus();
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Intégrations</h1>
        <p className="text-muted mt-1">Connectez vos outils : Google, réseaux sociaux et WordPress.</p>
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gradient">Google Workspace</h2>

      {feedback && (
        <div className={`rounded-xl px-4 py-3 border ${feedback.type === 'ok' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>
          {feedback.text}
        </div>
      )}

      {/* Carte de connexion */}
      <div className="glass-card p-6">
        {status && !status.configured && (
          <p className="text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
            ⚠️ L'intégration Google n'est pas configurée sur le serveur (fichier d'identifiants manquant).
          </p>
        )}

        {status?.configured && !status.connected && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-semibold">Compte Google non connecté</div>
              <div className="text-sm text-muted">Autorisez l'accès pour activer Gmail, Calendar et Drive.</div>
            </div>
            <button onClick={connect} className="btn-secondary">
              <span className="text-lg">🔗</span> Se connecter avec Google
            </button>
          </div>
        )}

        {status?.connected && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xl">✓</div>
              <div>
                <div className="font-semibold">Connecté à Google</div>
                <div className="text-sm text-muted font-mono">{status.email}</div>
              </div>
            </div>
            <button onClick={disconnect} className="btn-secondary">Déconnecter</button>
          </div>
        )}

        {!status && <div className="h-12 skeleton" />}
      </div>

      {/* Services Google (visibles uniquement si connecté) */}
      {status?.connected && (
        <div className="grid lg:grid-cols-3 gap-6">
          <GmailCard />
          <CalendarCard />
          <DriveCard />
        </div>
      )}

      {/* Réseaux sociaux (Créatif) */}
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gradient pt-2">Réseaux sociaux — publication par le Créatif</h2>
      <SocialSection />

      {/* WordPress (Référenceur) */}
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gradient pt-2">WordPress — publication par le Référenceur</h2>
      <WordPressSection />
    </div>
  );
}

/** Section réseaux sociaux : connexion + publication/programmation. */
function SocialSection() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ provider: 'linkedin', content: '', scheduledAt: '' });
  const [posts, setPosts] = useState([]);
  const [msg, setMsg] = useState(null);

  function load() {
    api('/api/social/status').then(setStatus).catch(() => {});
    api('/api/social/posts').then((d) => setPosts(d.posts)).catch(() => {});
  }
  useEffect(load, []);

  function connect(provider) {
    window.location.href = `${API_URL}/auth/${provider}?token=${encodeURIComponent(getToken())}`;
  }
  async function disconnect(provider) {
    await api('/api/social/disconnect', { method: 'POST', body: { provider } });
    load();
  }
  async function publish(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const d = await api('/api/social/publish', { method: 'POST', body: form });
      setMsg({ ok: true, text: d.post.status === 'programme' ? 'Post programmé ✓' : 'Post publié ✓' });
      setForm({ ...form, content: '', scheduledAt: '' });
      load();
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  }

  const connectedAny = status && (status.facebook.connected || status.linkedin.connected);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        {['facebook', 'linkedin'].map((p) => {
          const s = status?.[p];
          const labels = { facebook: 'Facebook / Instagram', linkedin: 'LinkedIn' };
          return (
            <div key={p} className="flex items-center justify-between gap-3 glass rounded-xl p-3">
              <div>
                <div className="font-medium text-sm">{labels[p]}</div>
                <div className="text-xs text-muted">{s?.connected ? s.account_name : (s?.configured ? 'Non connecté' : 'Mode simulation')}</div>
              </div>
              {s?.connected
                ? <button onClick={() => disconnect(p)} className="btn-secondary text-xs py-1.5">Déconnecter</button>
                : <button onClick={() => connect(p)} className="btn-secondary text-xs py-1.5">Connecter</button>}
            </div>
          );
        })}
      </div>

      {connectedAny && (
        <form onSubmit={publish} className="space-y-2 border-t border-white/[0.06] pt-4">
          <div className="flex gap-2">
            <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="input w-48">
              <option className="bg-ink-800" value="linkedin">LinkedIn</option>
              <option className="bg-ink-800" value="facebook">Facebook / Instagram</option>
            </select>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} className="input flex-1" title="Laisser vide pour publier maintenant" />
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={3} className="input" placeholder="Contenu du post…" required />
          <button className="btn-primary">{form.scheduledAt ? 'Programmer' : 'Publier'}</button>
          {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
        </form>
      )}

      {posts.length > 0 && (
        <div className="border-t border-white/[0.06] pt-4 space-y-2 max-h-48 overflow-y-auto">
          {posts.map((p) => (
            <div key={p.id} className="glass rounded-lg p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="chip">{p.provider} · {p.status}</span>
                <span className="text-[11px] text-muted font-mono">👁 {p.stats?.vues} · ❤ {p.stats?.likes}</span>
              </div>
              <div className="text-muted text-xs mt-1 line-clamp-2">{p.content.slice(0, 120)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Section WordPress : statut + publication d'article. */
function WordPressSection() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [msg, setMsg] = useState(null);

  useEffect(() => { api('/api/content/wordpress/status').then(setStatus).catch(() => {}); }, []);

  async function publish(e) {
    e.preventDefault();
    setMsg(null);
    try {
      const d = await api('/api/content/wordpress/publish', { method: 'POST', body: form });
      setMsg({ ok: true, text: d.simulated ? 'Article enregistré (simulation) ✓' : `Publié : ${d.link}` });
      setForm({ title: '', content: '' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        {status && (
          <span className={`chip ${status.configured ? '!text-emerald-300 !border-emerald-500/30 !bg-emerald-500/10' : '!text-amber-300 !border-amber-500/30 !bg-amber-500/10'}`}>
            {status.configured ? 'WordPress connecté' : 'Mode simulation'}
          </span>
        )}
      </div>
      <form onSubmit={publish} className="space-y-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" placeholder="Titre de l'article" required />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} className="input" placeholder="Contenu de l'article (HTML ou texte)…" required />
        <button className="btn-primary">Publier sur WordPress</button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}

/** Carte Gmail — envoi d'email. */
function GmailCard() {
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function send(e) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      await api('/api/google/gmail/send', { method: 'POST', body: form });
      setMsg({ ok: true, text: 'Email envoyé ✅' });
      setForm({ to: '', subject: '', body: '' });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card glass-card-hover p-5">
      <h2 className="font-semibold flex items-center gap-2">📧 Gmail</h2>
      <p className="text-xs text-muted mb-3">Envoyer un email</p>
      <form onSubmit={send} className="space-y-2">
        <input required type="email" value={form.to} onChange={update('to')} placeholder="Destinataire" className="input text-sm py-2" />
        <input required value={form.subject} onChange={update('subject')} placeholder="Objet" className="input text-sm py-2" />
        <textarea value={form.body} onChange={update('body')} placeholder="Message" rows={4} className="input text-sm py-2" />
        <button disabled={sending} className="btn-primary w-full text-sm">{sending ? 'Envoi…' : 'Envoyer'}</button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}

/** Carte Calendar — liste et création de rendez-vous. */
function CalendarCard() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ summary: '', start: '', end: '' });
  const [msg, setMsg] = useState(null);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function load() {
    api('/api/google/calendar/events').then((d) => setEvents(d.events)).catch((e) => setMsg({ ok: false, text: e.message }));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/api/google/calendar/events', { method: 'POST', body: form });
      setMsg({ ok: true, text: 'Rendez-vous créé ✅' });
      setForm({ summary: '', start: '', end: '' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <div className="glass-card glass-card-hover p-5">
      <h2 className="font-semibold flex items-center gap-2">📅 Calendar</h2>
      <p className="text-xs text-muted mb-3">Prochains rendez-vous</p>
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-xs text-muted">Aucun rendez-vous à venir.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="text-xs bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1">
              <span className="font-medium">{ev.summary || '(sans titre)'}</span>
              <span className="text-muted font-mono"> — {(ev.start?.dateTime || ev.start?.date || '').slice(0, 16).replace('T', ' ')}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={create} className="space-y-2">
        <input required value={form.summary} onChange={update('summary')} placeholder="Titre du RDV" className="input text-sm py-2" />
        <label className="block text-xs text-muted">Début</label>
        <input required type="datetime-local" value={form.start} onChange={update('start')} className="input text-sm py-2" />
        <label className="block text-xs text-muted">Fin</label>
        <input required type="datetime-local" value={form.end} onChange={update('end')} className="input text-sm py-2" />
        <button className="btn-primary w-full text-sm">Créer le rendez-vous</button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}

/** Carte Drive — liste et création de documents. */
function DriveCard() {
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ name: '', content: '' });
  const [msg, setMsg] = useState(null);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function load() {
    api('/api/google/drive/files').then((d) => setFiles(d.files)).catch((e) => setMsg({ ok: false, text: e.message }));
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api('/api/google/drive/files', { method: 'POST', body: form });
      setMsg({ ok: true, text: 'Document créé ✅' });
      setForm({ name: '', content: '' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
  }

  return (
    <div className="glass-card glass-card-hover p-5">
      <h2 className="font-semibold flex items-center gap-2">📁 Drive</h2>
      <p className="text-xs text-muted mb-3">Documents (créés par AutoPilote)</p>
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-xs text-muted">Aucun document pour l'instant.</p>
        ) : (
          files.map((f) => (
            <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer"
              className="block text-xs bg-white/[0.04] border border-white/[0.06] rounded px-2 py-1 text-cyan-400 hover:bg-white/[0.06] transition-colors truncate">
              📄 {f.name}
            </a>
          ))
        )}
      </div>
      <form onSubmit={create} className="space-y-2">
        <input required value={form.name} onChange={update('name')} placeholder="Nom du document (.txt)" className="input text-sm py-2" />
        <textarea value={form.content} onChange={update('content')} placeholder="Contenu" rows={4} className="input text-sm py-2" />
        <button className="btn-primary w-full text-sm">Créer le document</button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}
