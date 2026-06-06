'use client';
/**
 * Page « Mes documents » — bibliothèque de tous les contenus générés
 * par les agents (devis, contenus, contrats…), classés par type et date.
 */
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { exportToPdf } from '@/lib/pdf';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);

  function load() {
    api('/api/documents').then((d) => setDocuments(d.documents)).catch(() => {});
  }
  useEffect(load, []);

  async function remove(id) {
    if (!confirm('Supprimer ce document ?')) return;
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    if (selected?.id === id) setSelected(null);
    load();
  }

  const types = [...new Set(documents.map((d) => d.type))];
  const filtered = filter ? documents.filter((d) => d.type === filter) : documents;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Mes documents</h1>
        <p className="text-muted mt-1">Tous vos contenus générés, classés par type et par date 📁</p>
      </div>

      {/* Filtres par type */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('')} className={!filter ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>Tous ({documents.length})</button>
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={filter === t ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>{t}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Liste */}
        <div className="glass-card p-4 max-h-[70vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted p-4 text-center">Aucun document. Discutez avec un agent pour en générer.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((d) => (
                <button key={d.id} onClick={() => setSelected(d)}
                  className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${selected?.id === d.id ? 'border-brand-500/60 bg-brand-500/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-brand-500/30'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip">{d.type}</span>
                    <span className="text-[11px] text-muted font-mono">{d.created_at?.slice(0, 10)}</span>
                  </div>
                  <div className="mt-1.5 text-sm font-medium truncate">{d.title}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prévisualisation */}
        <div className="glass-card p-5 max-h-[70vh] overflow-y-auto">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="chip">{selected.type}</span>
                <div className="flex gap-2">
                  <button onClick={() => exportToPdf(selected.title, selected.content)} className="btn-secondary text-xs py-1.5">📄 Export PDF</button>
                  <button onClick={() => remove(selected.id)} className="text-red-400 hover:text-red-300 text-xs">Supprimer</button>
                </div>
              </div>
              <div className="prose-chat"><ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown></div>
            </>
          ) : (
            <p className="text-sm text-muted h-full grid place-items-center">Sélectionnez un document pour le prévisualiser.</p>
          )}
        </div>
      </div>
    </div>
  );
}
