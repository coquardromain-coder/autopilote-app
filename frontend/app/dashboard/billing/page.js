'use client';
/** Page facturation & devis (agents Manon & Manon D.). */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const INVOICE_STATUS = { brouillon: 'bg-slate-100 text-slate-600', envoyee: 'bg-blue-100 text-blue-700', payee: 'bg-green-100 text-green-700' };
const QUOTE_STATUS = { brouillon: 'bg-slate-100 text-slate-600', envoye: 'bg-blue-100 text-blue-700', accepte: 'bg-green-100 text-green-700', refuse: 'bg-red-100 text-red-700' };

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Facturation & Devis</h1>
        <p className="text-slate-500 mt-1">Géré par Manon 🧾 (factures) et Manon D. 📄 (devis).</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button onClick={() => setTab('invoices')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'invoices' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          🧾 Factures
        </button>
        <button onClick={() => setTab('quotes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'quotes' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
          📄 Devis
        </button>
      </div>

      {/* Formulaire de création */}
      <form onSubmit={create} className="bg-white border border-slate-100 rounded-2xl p-6 grid sm:grid-cols-3 gap-4">
        <input required value={form.client_name} onChange={update('client_name')} placeholder="Nom du client *"
          className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <input required type="number" step="0.01" value={form.amount} onChange={update('amount')} placeholder="Montant € *"
          className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        <button type="submit" className="py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
          + Créer {tab === 'invoices' ? 'la facture' : 'le devis'}
        </button>
        {tab === 'quotes' && (
          <input value={form.content} onChange={update('content')} placeholder="Description de la prestation"
            className="sm:col-span-3 px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
        )}
      </form>

      {error && <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {/* Liste */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {tab === 'invoices' ? (
          invoices.length === 0 ? (
            <p className="p-8 text-center text-slate-400">Aucune facture.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{inv.number}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{inv.client_name}</td>
                    <td className="px-4 py-3 font-semibold">{inv.amount.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3">
                      <select value={inv.status} onChange={(e) => setInvoiceStatus(inv, e.target.value)}
                        className={`text-xs rounded-full px-2 py-1 border-0 ${INVOICE_STATUS[inv.status]}`}>
                        <option value="brouillon">Brouillon</option>
                        <option value="envoyee">Envoyée</option>
                        <option value="payee">Payée</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removeInvoice(inv)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : quotes.length === 0 ? (
          <p className="p-8 text-center text-slate-400">Aucun devis.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Numéro</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{q.number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {q.client_name}
                    {q.content && <div className="text-xs text-slate-400 font-normal">{q.content}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold">{q.amount.toLocaleString('fr-FR')} €</td>
                  <td className="px-4 py-3">
                    <select value={q.status} onChange={(e) => setQuoteStatus(q, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 ${QUOTE_STATUS[q.status]}`}>
                      <option value="brouillon">Brouillon</option>
                      <option value="envoye">Envoyé</option>
                      <option value="accepte">Accepté</option>
                      <option value="refuse">Refusé</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeQuote(q)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
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
