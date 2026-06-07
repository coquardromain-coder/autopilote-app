'use client';
/** Détail d'un client (admin) : connecteurs, agents, conversations, email. */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { adminApi, getAdminToken } from '@/lib/admin';

const DOT = { non_configure: '⬜', en_cours: '🔄', connecte: '✅', erreur: '⚠️' };
const ACT = { inactif: 'text-muted', basique: 'text-amber-300', complet: 'text-emerald-300', actif: 'text-cyan-300' };
const isSecret = (f) => /key|token|password|secret/i.test(f);

export default function AdminClientDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  function load() { adminApi(`/api/admin/clients/${id}`).then(setData).catch((e) => setError(e.message)); }
  useEffect(() => { if (!getAdminToken()) { router.push('/admin'); return; } load(); }, [id, router]);

  async function saveConnector() {
    setResult(null);
    try {
      const d = await adminApi(`/api/admin/clients/${id}/connectors/${modal.id}`, { method: 'POST', body: form });
      setResult(d.success ? { ok: true, text: `Connecté ✓${d.version ? ' (' + d.version + ')' : ''}` } : { ok: false, text: d.error });
      load();
    } catch (e) { setResult({ ok: false, text: e.message }); }
  }
  async function sendWelcome() {
    try { await adminApi(`/api/admin/clients/${id}/welcome-email`, { method: 'POST' }); setToast('Email de bienvenue envoyé ✓'); }
    catch (e) { setToast('Erreur : ' + e.message); }
    setTimeout(() => setToast(null), 3000);
  }

  if (error) return <div className="p-8 text-red-400">{error} — <Link href="/admin/clients" className="underline">retour</Link></div>;
  if (!data) return <div className="min-h-screen grid place-items-center text-muted">Chargement…</div>;

  const c = data.client;
  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {toast && <div className="fixed bottom-6 right-6 z-50 glass-card px-4 py-3 text-emerald-300">{toast}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/admin/clients" className="text-sm text-muted hover:text-white">← Tous les clients</Link>
          <h1 className="text-2xl font-bold mt-1">{c.company || c.name}</h1>
          <div className="text-sm text-muted">{c.email} · <span className="chip capitalize">{c.plan}</span> · {c.sector || 'secteur ?'}</div>
        </div>
        <button onClick={sendWelcome} className="btn-primary">✉️ Envoyer email de bienvenue</button>
      </div>

      {/* Connecteurs */}
      <section>
        <h2 className="font-semibold mb-3">Intégrations du client</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.connectors.map((c2) => (
            <div key={c2.id} className={`glass-card p-4 ${c2.status === 'connecte' ? 'border border-emerald-500/30' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-xl">{c2.icon}</span>
                <span className="text-xs text-muted">{DOT[c2.status]} {c2.status}</span>
              </div>
              <div className="font-medium mt-2 text-sm">{c2.name}</div>
              <div className="text-[11px] text-brand-200">{c2.agents.join(' • ')}</div>
              {(c2.fields && c2.fields.length > 0)
                ? <button onClick={() => { setModal(c2); setForm({}); setResult(null); }} className="btn-secondary text-xs w-full mt-3">Configurer</button>
                : <div className="text-[11px] text-muted mt-3">OAuth (côté client)</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section>
        <h2 className="font-semibold mb-3">Statut des agents</h2>
        <div className="glass-card p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.agents.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span>{a.avatar}</span><span className="flex-1">{a.name}</span>
              <span className={`text-xs ${ACT[a.activation.status] || 'text-muted'}`}>{a.activation.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Conversations */}
      <section>
        <h2 className="font-semibold mb-3">Conversations récentes ({data.conversations.length})</h2>
        <div className="space-y-3">
          {data.conversations.length === 0 && <p className="text-sm text-muted">Aucune conversation.</p>}
          {data.conversations.slice(0, 5).map((conv) => (
            <details key={conv.id} className="glass-card p-4">
              <summary className="cursor-pointer text-sm font-medium">{conv.title} <span className="text-muted">· {conv.created_at?.slice(0, 10)}</span></summary>
              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {conv.messages.map((m, i) => (
                  <div key={i} className={`text-sm ${m.role === 'user' ? 'text-white' : 'text-white/80'}`}>
                    <span className="text-xs text-cyan-400">{m.role === 'user' ? 'Client' : (m.agent_id || 'agent')} :</span>
                    {m.role === 'assistant'
                      ? <div className="prose-chat"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
                      : <span> {m.content}</span>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Modal config connecteur */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="glass-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg flex items-center gap-2">{modal.icon} {modal.name}</h3>
            <p className="text-sm text-muted mb-4">Renseignez les identifiants à la place du client.</p>
            <div className="space-y-2">
              {(modal.fields || []).map((f) => (
                <input key={f} type={isSecret(f) ? 'password' : 'text'} value={form[f] || ''}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} className="input" placeholder={f} />
              ))}
            </div>
            {result && <p className={`mt-3 text-sm ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>{result.ok ? '✅ ' : '⚠️ '}{result.text}</p>}
            <div className="mt-5 flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Fermer</button>
              <button onClick={saveConnector} className="btn-primary flex-1">Sauvegarder & tester</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
