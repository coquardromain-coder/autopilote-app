'use client';
/**
 * Interface de chat avec les agents.
 * L'utilisateur écrit au Directeur (routage automatique) ou choisit un agent.
 * Fonctions : indicateur de travail contextuel, historique recherchable,
 * export PDF des réponses. Conversations persistées côté backend.
 */
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { AGENTS } from '@/lib/agents';
import { exportToPdf } from '@/lib/pdf';

// Verbe d'action affiché pendant que l'agent travaille
const WORKING_VERB = {
  directeur: 'analyse votre demande', commercial: 'organise vos contacts',
  chasseur: 'prépare votre email', assistance: 'rédige la réponse',
  creatif: 'rédige votre contenu', vocal: 'prépare votre script',
  relance: 'prépare votre relance', coordinateur: 'organise vos tâches',
  analyste: 'analyse vos données', comptable: 'prépare votre document',
  deviseur: 'rédige votre devis', recruteur: 'prépare le document RH',
  juriste: 'rédige le document', referenceur: 'optimise votre contenu',
  community: 'prépare votre publication', formateur: 'prépare le support',
  stratege: 'travaille le design', technicien: 'analyse le marché',
  assistant: 'optimise votre boutique',
};

export default function ChatPage() {
  const [agentId, setAgentId] = useState('directeur');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Recherche dans l'historique (titres + contenu des messages)
  useEffect(() => {
    if (!showHistory) return;
    const path = search.trim() ? `/api/chat/search?q=${encodeURIComponent(search.trim())}` : '/api/chat/conversations';
    api(path).then((d) => setHistory(d.conversations || [])).catch(() => {});
  }, [search, showHistory]);

  function newConversation(targetAgent = 'directeur') {
    setConversationId(null);
    setMessages([]);
    setAgentId(targetAgent);
  }

  async function openConversation(conv) {
    const d = await api(`/api/chat/conversations/${conv.id}/messages`);
    setConversationId(conv.id);
    setAgentId(conv.agent_id || 'directeur');
    setMessages(d.messages.map((m) => {
      const agent = AGENTS.find((a) => a.id === m.agent_id);
      return { role: m.role, content: m.content, agentId: m.agent_id, agentName: agent?.name, avatar: agent?.avatar };
    }));
    setShowHistory(false);
  }

  async function send(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const d = await api('/api/chat/message', {
        method: 'POST',
        body: { message: text, conversationId, agentId: agentId === 'directeur' ? null : agentId },
      });
      setConversationId(d.conversationId);
      setMessages((m) => [...m, {
        role: 'assistant', agentId: d.reply.agentId, agentName: d.reply.agentName,
        avatar: d.reply.avatar, content: d.reply.content, routedBy: d.reply.routedBy,
      }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Erreur : ' + err.message, error: true }]);
    } finally {
      setSending(false);
    }
  }

  const currentAgent = AGENTS.find((a) => a.id === agentId);
  const workingLabel = `Le ${currentAgent?.name || 'Directeur'} ${WORKING_VERB[agentId] || 'travaille'}…`;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold">Discuter avec vos agents</h1>
          <p className="text-muted text-sm">Parlez au Directeur — il délègue au bon spécialiste — ou choisissez un agent.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowHistory((s) => !s)} className="btn-secondary text-sm">🕑 Historique</button>
          <button onClick={() => newConversation(agentId)} className="btn-secondary text-sm">+ Nouvelle</button>
        </div>
      </div>

      {/* Panneau historique recherchable */}
      {showHistory && (
        <div className="glass-card p-3 mb-3 animate-fade-in-up">
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input mb-2" placeholder="🔎 Rechercher dans l'historique…" />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {history.length === 0 ? (
              <p className="text-sm text-muted p-2">Aucune conversation.</p>
            ) : history.map((c) => (
              <button key={c.id} onClick={() => openConversation(c)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors text-sm flex items-center justify-between">
                <span className="truncate">{c.title}</span>
                <span className="text-[11px] text-muted font-mono ml-2">{c.created_at?.slice(0, 10)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sélecteur d'agent */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {AGENTS.map((a) => (
          <button key={a.id} onClick={() => newConversation(a.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all duration-300 ${
              agentId === a.id ? 'bg-brand-gradient border-transparent text-white shadow-glow' : 'glass text-muted hover:text-white hover:border-brand-500/40'
            }`}>
            <span>{a.avatar}</span> {a.name}
          </button>
        ))}
      </div>

      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto glass-card p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="grid place-items-center w-20 h-20 rounded-3xl bg-brand-500/15 border border-brand-500/20 text-4xl mb-4 animate-pulse-glow">
              {currentAgent?.avatar || '🎯'}
            </div>
            <p className="font-semibold text-white/90">
              {agentId === 'directeur' ? 'Le Directeur vous écoute' : `${currentAgent?.name} vous écoute`}
            </p>
            <p className="text-sm text-muted mt-1 max-w-sm">
              {agentId === 'directeur' ? 'Décrivez votre besoin, je le confie à l\'agent le plus adapté.' : currentAgent?.role}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl shrink-0">{m.avatar || '🎯'}</div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
              m.role === 'user' ? 'bg-brand-gradient text-white rounded-br-sm shadow-glow'
                : m.error ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm'
                : 'glass text-white/90 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' && m.agentName && (
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-xs font-semibold text-cyan-400">
                    {m.agentName}
                    {m.routedBy === 'directeur' && agentId === 'directeur' && (
                      <span className="font-normal text-muted"> · choisi par le Directeur</span>
                    )}
                  </span>
                  {!m.error && (
                    <button onClick={() => exportToPdf(`${m.agentName} — AutoPilote`, m.content)} className="text-[11px] text-muted hover:text-white transition-colors">📄 PDF</button>
                  )}
                </div>
              )}
              {m.role === 'assistant' && !m.error ? (
                <div className="prose-chat"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              )}
            </div>
          </div>
        ))}

        {/* Indicateur de travail contextuel */}
        {sending && (
          <div className="flex gap-3 items-center">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl">{currentAgent?.avatar || '🎯'}</div>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-3">
              <span className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.3s]" />
              </span>
              <span className="text-sm text-muted">{workingLabel}</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Saisie */}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={`Écrire à ${agentId === 'directeur' ? 'Directeur' : currentAgent?.name}…`} className="input flex-1" />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-6">Envoyer</button>
      </form>
    </div>
  );
}
