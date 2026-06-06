'use client';
/**
 * Interface de chat avec les agents.
 * L'utilisateur écrit à Pilot (routage automatique) ou choisit un agent
 * précis. Les conversations et messages sont persistés côté backend.
 */
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { AGENTS } from '@/lib/agents';

export default function ChatPage() {
  const [agentId, setAgentId] = useState('pilot');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function newConversation(targetAgent = 'pilot') {
    setConversationId(null);
    setMessages([]);
    setAgentId(targetAgent);
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
        body: {
          message: text,
          conversationId,
          agentId: agentId === 'pilot' ? null : agentId,
        },
      });
      setConversationId(d.conversationId);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          agentId: d.reply.agentId,
          agentName: d.reply.agentName,
          avatar: d.reply.avatar,
          content: d.reply.content,
          routedBy: d.reply.routedBy,
        },
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Erreur : ' + err.message, error: true }]);
    } finally {
      setSending(false);
    }
  }

  const currentAgent = AGENTS.find((a) => a.id === agentId);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Discuter avec vos agents</h1>
          <p className="text-muted text-sm">Parlez à Pilot — il délègue au bon spécialiste — ou choisissez un agent.</p>
        </div>
        <button onClick={() => newConversation(agentId)} className="btn-secondary text-sm">
          + Nouvelle conversation
        </button>
      </div>

      {/* Sélecteur d'agent */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {AGENTS.map((a) => (
          <button key={a.id} onClick={() => newConversation(a.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all duration-300 ${
              agentId === a.id
                ? 'bg-brand-gradient border-transparent text-white shadow-glow'
                : 'glass text-muted hover:text-white hover:border-brand-500/40'
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
              {agentId === 'pilot' ? 'Pilot vous écoute' : `${currentAgent?.name} vous écoute`}
            </p>
            <p className="text-sm text-muted mt-1 max-w-sm">
              {agentId === 'pilot'
                ? 'Décrivez votre besoin, je le confie à l\'agent le plus adapté.'
                : currentAgent?.role}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl shrink-0">{m.avatar || '🎯'}</div>
            )}
            <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-brand-gradient text-white rounded-br-sm shadow-glow'
                : m.error
                ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-sm'
                : 'glass text-white/90 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' && m.agentName && (
                <div className="text-xs font-semibold text-cyan-400 mb-1">
                  {m.agentName}
                  {m.routedBy === 'pilot' && agentId === 'pilot' && (
                    <span className="font-normal text-muted"> · choisi par Pilot</span>
                  )}
                </div>
              )}
              {m.role === 'assistant' && !m.error ? (
                <div className="prose-chat">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl">{currentAgent?.avatar || '🎯'}</div>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Saisie */}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={`Écrire à ${agentId === 'pilot' ? 'Pilot' : currentAgent?.name}…`}
          className="input flex-1" />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary px-6">
          Envoyer
        </button>
      </form>
    </div>
  );
}
