'use client';
/**
 * Page Intégrations Google : connexion OAuth puis utilisation des
 * services Gmail (envoi), Calendar (rendez-vous) et Drive (documents).
 */
import { useEffect, useState } from 'react';
import { api, getToken, API_URL } from '@/lib/api';

// Messages de retour après la redirection OAuth
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
    // Lit le paramètre ?google= renvoyé par le callback OAuth
    const params = new URLSearchParams(window.location.search);
    const g = params.get('google');
    if (g && FEEDBACK[g]) {
      setFeedback(FEEDBACK[g]);
      // Nettoie l'URL
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, []);

  function connect() {
    const token = getToken();
    // Redirige vers le flux OAuth backend (le JWT est passé en paramètre)
    window.location.href = `${API_URL}/auth/google?token=${encodeURIComponent(token)}`;
  }

  async function disconnect() {
    if (!confirm('Déconnecter votre compte Google ?')) return;
    await api('/api/google/disconnect', { method: 'POST' });
    loadStatus();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Intégrations Google</h1>
        <p className="text-slate-500 mt-1">Connectez Gmail, Google Calendar et Google Drive à vos agents.</p>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 ${feedback.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.text}
        </div>
      )}

      {/* Carte de connexion */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        {status && !status.configured && (
          <p className="text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            ⚠️ L'intégration Google n'est pas configurée sur le serveur (fichier d'identifiants manquant).
          </p>
        )}

        {status?.configured && !status.connected && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-semibold text-slate-900">Compte Google non connecté</div>
              <div className="text-sm text-slate-500">Autorisez l'accès pour activer Gmail, Calendar et Drive.</div>
            </div>
            <button onClick={connect}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
              <span className="text-lg">🔗</span> Se connecter avec Google
            </button>
          </div>
        )}

        {status?.connected && (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xl">✓</div>
              <div>
                <div className="font-semibold text-slate-900">Connecté à Google</div>
                <div className="text-sm text-slate-500">{status.email}</div>
              </div>
            </div>
            <button onClick={disconnect} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200">
              Déconnecter
            </button>
          </div>
        )}
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
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2">📧 Gmail</h2>
      <p className="text-xs text-slate-500 mb-3">Envoyer un email</p>
      <form onSubmit={send} className="space-y-2">
        <input required type="email" value={form.to} onChange={update('to')} placeholder="Destinataire"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <input required value={form.subject} onChange={update('subject')} placeholder="Objet"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <textarea value={form.body} onChange={update('body')} placeholder="Message" rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <button disabled={sending} className="w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60">
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
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
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2">📅 Calendar</h2>
      <p className="text-xs text-slate-500 mb-3">Prochains rendez-vous</p>
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun rendez-vous à venir.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="text-xs bg-slate-50 rounded px-2 py-1">
              <span className="font-medium text-slate-700">{ev.summary || '(sans titre)'}</span>
              <span className="text-slate-400"> — {(ev.start?.dateTime || ev.start?.date || '').slice(0, 16).replace('T', ' ')}</span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={create} className="space-y-2">
        <input required value={form.summary} onChange={update('summary')} placeholder="Titre du RDV"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <label className="block text-xs text-slate-500">Début</label>
        <input required type="datetime-local" value={form.start} onChange={update('start')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <label className="block text-xs text-slate-500">Fin</label>
        <input required type="datetime-local" value={form.end} onChange={update('end')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <button className="w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
          Créer le rendez-vous
        </button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
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
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2">📁 Drive</h2>
      <p className="text-xs text-slate-500 mb-3">Documents (créés par AutoPilote)</p>
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {files.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun document pour l'instant.</p>
        ) : (
          files.map((f) => (
            <a key={f.id} href={f.webViewLink} target="_blank" rel="noreferrer"
              className="block text-xs bg-slate-50 rounded px-2 py-1 text-brand-600 hover:underline truncate">
              📄 {f.name}
            </a>
          ))
        )}
      </div>
      <form onSubmit={create} className="space-y-2">
        <input required value={form.name} onChange={update('name')} placeholder="Nom du document (.txt)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <textarea value={form.content} onChange={update('content')} placeholder="Contenu" rows={4}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <button className="w-full py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
          Créer le document
        </button>
        {msg && <p className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
      </form>
    </div>
  );
}
