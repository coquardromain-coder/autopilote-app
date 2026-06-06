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
  erreur: { type: 'err', text: 'Une erreur est survenue lors de la connexion à Google.' },
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
    if (g && FEEDBACK[g]) {
      setFeedback(FEEDBACK[g]);
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
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
        <h1 className="text-3xl font-bold">Intégrations <span className="text-gradient">Google</span></h1>
        <p className="text-muted mt-1">Connectez Gmail, Google Calendar et Google Drive à vos agents.</p>
      </div>

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

      {/* Services (visibles uniquement si connecté) */}
      {status?.connected && (
        <div className="grid lg:grid-cols-3 gap-6">
          <GmailCard />
          <CalendarCard />
          <DriveCard />
        </div>
      )}
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
