'use client';
/**
 * Page WhatsApp — le Directeur accessible via WhatsApp.
 * Liaison du numéro, envoi de test, et historique des conversations.
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function WhatsAppPage() {
  const { refresh } = useAuth();
  const [status, setStatus] = useState(null);
  const [number, setNumber] = useState('');
  const [conversations, setConversations] = useState([]);
  const [test, setTest] = useState({ to: '', body: '' });
  const [toast, setToast] = useState(null);

  function load() {
    api('/api/whatsapp/status').then((d) => { setStatus(d); setNumber(d.whatsapp_number || ''); }).catch(() => {});
    api('/api/whatsapp/conversations').then((d) => setConversations(d.conversations)).catch(() => {});
  }
  useEffect(load, []);

  function showToast(text, ok = true) { setToast({ text, ok }); setTimeout(() => setToast(null), 2500); }

  async function saveNumber() {
    await api('/api/auth/me', { method: 'PATCH', body: { whatsapp_number: number } });
    await refresh();
    showToast('Numéro WhatsApp enregistré ✓');
    load();
  }

  async function sendTest(e) {
    e.preventDefault();
    try {
      await api('/api/whatsapp/send', { method: 'POST', body: test });
      showToast('Message envoyé ✓');
      setTest({ to: '', body: '' });
    } catch (err) { showToast(err.message, false); }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <p className="text-muted mt-1">Discutez avec le Directeur directement sur WhatsApp 📲</p>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 border ${toast.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>{toast.text}</div>
      )}

      {/* Statut + liaison numéro */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold">Configuration</h2>
          {status && (
            <span className={`chip ${status.configured ? '!text-emerald-300 !border-emerald-500/30 !bg-emerald-500/10' : '!text-amber-300 !border-amber-500/30 !bg-amber-500/10'}`}>
              {status.configured ? 'Twilio connecté' : 'Mode simulation'}
            </span>
          )}
        </div>
        <label className="label">Votre numéro WhatsApp (format international, ex : +33612345678)</label>
        <div className="flex gap-2">
          <input value={number} onChange={(e) => setNumber(e.target.value)} className="input flex-1" placeholder="+33612345678" />
          <button onClick={saveNumber} className="btn-primary">Lier</button>
        </div>
        <p className="text-xs text-muted mt-2">
          Une fois lié, les messages WhatsApp envoyés depuis ce numéro seront traités par le Directeur,
          qui délègue au bon agent et répond sur WhatsApp.
          {!status?.configured && ' (Mode simulation : aucun message réel n\'est envoyé tant que Twilio n\'est pas configuré.)'}
        </p>
      </div>

      {/* Envoi de test */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Envoyer un message</h2>
        <form onSubmit={sendTest} className="grid sm:grid-cols-3 gap-3">
          <input value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} className="input" placeholder="Destinataire (+33…)" required />
          <input value={test.body} onChange={(e) => setTest({ ...test, body: e.target.value })} className="input sm:col-span-2" placeholder="Message" required />
          <button className="btn-primary sm:col-span-3">Envoyer via WhatsApp</button>
        </form>
      </div>

      {/* Historique */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Historique des conversations WhatsApp</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted">Aucune conversation WhatsApp pour l'instant.</p>
        ) : (
          <div className="space-y-4">
            {conversations.map((c) => (
              <div key={c.id} className="space-y-2">
                {c.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-brand-gradient text-white' : 'glass'}`}>
                      {m.role === 'assistant'
                        ? <div className="prose-chat"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                        : m.content}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
