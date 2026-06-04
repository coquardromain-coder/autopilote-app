'use client';
/**
 * Interface de chat avec les agents.
 * L'utilisateur écrit à Pilot (routage automatique) ou choisit un agent
 * précis. Les conversations et messages sont persistés côté backend.
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { AGENTS } from '@/lib/agents';

export default function ChatPage() {
  const [agentId, setAgentId] = useState('pilot'); // agent ciblé (pilot = auto)
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Fait défiler vers le bas à chaque nouveau message
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

    // Affiche immédiatement le message utilisateur
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const d = await api('/api/chat/message', {
        method: 'POST',
        body: {
          message: text,
          conversationId,
          // Si l'utilisateur a choisi un agent précis, on le force ;
          // 'pilot' signifie : laisser Pilot router automatiquement.
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
          <h1 className="text-2xl font-bold text-slate-900">Discuter avec vos agents</h1>
          <p className="text-slate-500 text-sm">Parlez à Pilot — il délègue au bon spécialiste — ou choisissez un agent.</p>
        </div>
        <button onClick={() => newConversation(agentId)}
          className="text-sm px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">
          + Nouvelle conversation
        </button>
      </div>

      {/* Sélecteur d'agent */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {AGENTS.map((a) => (
          <button key={a.id} onClick={() => newConversation(a.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition ${
              agentId === a.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
            }`}>
            <span>{a.avatar}</span> {a.name}
          </button>
        ))}
      </div>

      {/* Fil de messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
            <div className="text-5xl mb-3">{currentAgent?.avatar || '🎯'}</div>
            <p className="font-medium text-slate-600">
              {agentId === 'pilot' ? 'Pilot vous écoute' : `${currentAgent?.name} vous écoute`}
            </p>
            <p className="text-sm mt-1 max-w-sm">
              {agentId === 'pilot'
                ? 'Décrivez votre besoin, je le confie à l\'agent le plus adapté.'
                : currentAgent?.role}
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="text-2xl shrink-0">{m.avatar || '🎯'}</div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              m.role === 'user'
                ? 'bg-brand-600 text-white rounded-br-sm'
                : m.error
                ? 'bg-red-50 text-red-700 rounded-bl-sm'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm'
            }`}>
              {m.role === 'assistant' && m.agentName && (
                <div className="text-xs font-semibold text-brand-600 mb-1">
                  {m.agentName}
                  {m.routedBy === 'pilot' && agentId === 'pilot' && (
                    <span className="font-normal text-slate-400"> · choisi par Pilot</span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="text-2xl">{currentAgent?.avatar || '🎯'}</div>
            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 text-slate-400 text-sm">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce [animation-delay:0.15s]">●</span>
                <span className="animate-bounce [animation-delay:0.3s]">●</span>
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
          className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <button type="submit" disabled={sending || !input.trim()}
          className="px-5 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50">
          Envoyer
        </button>
      </form>
    </div>
  );
}
