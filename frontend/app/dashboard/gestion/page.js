'use client';
/**
 * Page Gestion — pilotage via Dolibarr : CA du mois, factures impayées,
 * devis en attente, accès à Dolibarr et export EBP.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

const euro = (n) => `${Number(n || 0).toLocaleString('fr-FR')} €`;

export default function GestionPage() {
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    api('/api/dolibarr/dashboard').then(setData).catch((e) => setToast({ ok: false, text: e.message }));
  }, []);

  function showToast(text, ok = true) { setToast({ text, ok }); setTimeout(() => setToast(null), 4000); }

  async function exportEbp() {
    setExporting(true);
    try {
      const d = await api('/api/dolibarr/export-ebp', { method: 'POST', body: {} });
      showToast(`Export ${d.filename} généré${d.emailed ? ' et envoyé par email' : ''}${d.simulated ? ' (simulation)' : ''} ✓`);
    } catch (err) { showToast(err.message, false); }
    finally { setExporting(false); }
  }

  const widgets = [
    { label: 'CA du mois', value: data ? euro(data.ca_mois) : null, icon: '💰', tint: 'from-brand-500/20 to-brand-500/0' },
    { label: 'Factures impayées', value: data ? `${data.impayees.count} · ${euro(data.impayees.montant)}` : null, icon: '⏰', tint: 'from-red-500/20 to-red-500/0' },
    { label: 'Devis en attente', value: data ? `${data.devis.count} · ${euro(data.devis.montant)}` : null, icon: '📄', tint: 'from-cyan-500/20 to-cyan-500/0' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold">Gestion</h1>
          <p className="text-muted mt-1">Vos indicateurs en temps réel depuis Dolibarr 📒</p>
        </div>
        <div className="flex gap-2">
          {data?.url && (
            <a href={data.url} target="_blank" rel="noreferrer" className="btn-secondary">↗ Ouvrir Dolibarr</a>
          )}
          <button onClick={exportEbp} disabled={exporting} className="btn-primary">{exporting ? 'Export…' : '📊 Export EBP'}</button>
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 border ${toast.ok ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-red-500/10 text-red-300 border-red-500/20'}`}>{toast.text}</div>
      )}

      {data && !data.configured && (
        <div className="rounded-xl px-4 py-3 border bg-amber-500/10 text-amber-300 border-amber-500/20">
          ⚠️ Dolibarr n'est pas connecté — les chiffres ci-dessous sont une <strong>simulation</strong>.{' '}
          <Link href="/dashboard/integrations" className="underline">Connectez Dolibarr</Link> pour vos données réelles.
        </div>
      )}

      {/* Widgets */}
      <div className="grid sm:grid-cols-3 gap-4">
        {widgets.map((w) => (
          <div key={w.label} className="relative glass-card p-6 overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${w.tint} opacity-60`} />
            <div className="relative">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xl">{w.icon}</div>
              {w.value !== null ? (
                <div className="mt-3 text-2xl font-bold font-mono">{w.value}</div>
              ) : <div className="mt-3 h-8 w-28 skeleton" />}
              <div className="text-sm text-muted mt-1">{w.label}</div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        💡 Demandez à vos agents : « factures impayées », « chiffre d'affaires », « crée un devis »,
        « export EBP du mois » — ils agissent directement sur Dolibarr.
      </p>
    </div>
  );
}
