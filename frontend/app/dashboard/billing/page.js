'use client';
/** Page facturation & devis (agents Manon & Manon D.). */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const INVOICE_STATUS = {
  brouillon: 'bg-white/[0.06] text-muted border border-white/[0.08]',
  envoyee: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20',
  payee: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
};
const QUOTE_STATUS = {
  brouillon: 'bg-white/[0.06] text-muted border border-white/[0.08]',
  envoye: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20',
  accepte: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  refuse: 'bg-red-500/15 text-red-300 border border-red-500/20',
};

export default function BillingPage() {
  const [tab, setTab] = useState('invoices');
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [form, setForm] = useState({ client_name: '', amount: '', content: '' });
  const [error, setError] = useState('');

  function load() {
    api('/api/billing/invoices').then((d) => setInvoices(d.invoices)).catch(() => {});
    api('/api/billing/quotes').then((d) => setQuotes(d.quotes)).catch(() => {});
  }
  useEffect(load, []);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      const path = tab === 'invoices' ? '/api/billing/invoices' : '/api/billing/quotes';
      await api(path, { method: 'POST', body: { ...form, amount: Number(form.amount) } });
      setForm({ client_name: '', amount: '', content: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setInvoiceStatus(inv, status) {
    await api(`/api/billing/invoices/${inv.id}`, { method: 'PATCH', body: { status } });
    load();
  }
  async function setQuoteStatus(q, status) {
    await api(`/api/billing/quotes/${q.id}`, { method: 'PATCH', body: { status } });
    load();
  }
  async function removeInvoice(inv) {
    if (!confirm('Supprimer cette facture ?')) return;
    await api(`/api/billing/invoices/${inv.id}`, { method: 'DELETE' });
    load();
  }
  async function removeQuote(q) {
    if (!confirm('Supprimer ce devis ?')) return;
    await api(`/api/billing/quotes/${q.id}`, { method: 'DELETE' });
    load();
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-bold">Facturation & Devis</h1>
        <p className="text-muted mt-1">Géré par Manon 🧾 (factures) et Manon D. 📄 (devis).</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab('invoices')} className={tab === 'invoices' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
          🧾 Factures
        </button>
        <button onClick={() => setTab('quotes')} className={tab === 'quotes' ? 'btn-primary text-sm' : 'btn-secondary text-sm'}>
          📄 Devis
        </button>
      </div>

      {/* Formulaire de création */}
      <form onSubmit={create} className="glass-card p-6 grid sm:grid-cols-3 gap-4">
        <input required value={form.client_name} onChange={update('client_name')} placeholder="Nom du client *" className="input" />
        <input required type="number" step="0.01" value={form.amount} onChange={update('amount')} placeholder="Montant € *" className="input" />
        <button type="submit" className="btn-primary">+ Créer {tab === 'invoices' ? 'la facture' : 'le devis'}</button>
        {tab === 'quotes' && (
          <input value={form.content} onChange={update('content')} placeholder="Description de la prestation" className="input sm:col-span-3" />
        )}
      </form>

      {error && <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {/* Liste */}
      <div className="glass-card overflow-hidden">
        {tab === 'invoices' ? (
          invoices.length === 0 ? (
            <p className="p-8 text-center text-muted">Aucune facture.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-muted text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted">{inv.number}</td>
                    <td className="px-4 py-3 font-medium">{inv.client_name}</td>
                    <td className="px-4 py-3 font-semibold font-mono">{inv.amount.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3">
                      <select value={inv.status} onChange={(e) => setInvoiceStatus(inv, e.target.value)}
                        className={`text-xs rounded-full px-2 py-1 outline-none ${INVOICE_STATUS[inv.status]}`}>
                        <option className="bg-ink-800" value="brouillon">Brouillon</option>
                        <option className="bg-ink-800" value="envoyee">Envoyée</option>
                        <option className="bg-ink-800" value="payee">Payée</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeInvoice(inv)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : quotes.length === 0 ? (
          <p className="p-8 text-center text-muted">Aucun devis.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{q.number}</td>
                  <td className="px-4 py-3 font-medium">
                    {q.client_name}
                    {q.content && <div className="text-xs text-muted font-normal">{q.content}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold font-mono">{q.amount.toLocaleString('fr-FR')} €</td>
                  <td className="px-4 py-3">
                    <select value={q.status} onChange={(e) => setQuoteStatus(q, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 outline-none ${QUOTE_STATUS[q.status]}`}>
                      <option className="bg-ink-800" value="brouillon">Brouillon</option>
                      <option className="bg-ink-800" value="envoye">Envoyé</option>
                      <option className="bg-ink-800" value="accepte">Accepté</option>
                      <option className="bg-ink-800" value="refuse">Refusé</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeQuote(q)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
