'use client';
/** Page CRM — gestion des contacts (agente Léa). */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const STATUS_STYLE = {
  prospect: 'bg-amber-100 text-amber-700',
  client: 'bg-green-100 text-green-700',
  inactif: 'bg-slate-100 text-slate-500',
};

export default function CrmPage() {
  const [contacts, setContacts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
  const [error, setError] = useState('');

  function load() {
    api('/api/crm/contacts').then((d) => setContacts(d.contacts)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function addContact(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/api/crm/contacts', { method: 'POST', body: form });
      setForm({ name: '', email: '', phone: '', company: '', status: 'prospect', notes: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(c, status) {
    await api(`/api/crm/contacts/${c.id}`, { method: 'PATCH', body: { status } });
    load();
  }

  async function remove(c) {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    await api(`/api/crm/contacts/${c.id}`, { method: 'DELETE' });
    load();
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM — Contacts</h1>
          <p className="text-slate-500 mt-1">Votre base clients & prospects, gérée par Léa 🤝</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
          {showForm ? 'Fermer' : '+ Ajouter un contact'}
        </button>
      </div>

      {error && <p className="text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {showForm && (
        <form onSubmit={addContact} className="bg-white border border-slate-100 rounded-2xl p-6 grid sm:grid-cols-2 gap-4 animate-fade-in-up">
          <input required value={form.name} onChange={update('name')} placeholder="Nom *"
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          <input value={form.company} onChange={update('company')} placeholder="Société"
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          <input type="email" value={form.email} onChange={update('email')} placeholder="Email"
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          <input value={form.phone} onChange={update('phone')} placeholder="Téléphone"
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          <select value={form.status} onChange={update('status')}
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none">
            <option value="prospect">Prospect</option>
            <option value="client">Client</option>
            <option value="inactif">Inactif</option>
          </select>
          <input value={form.notes} onChange={update('notes')} placeholder="Notes"
            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" />
          <button type="submit" className="sm:col-span-2 py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700">
            Enregistrer le contact
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        {contacts.length === 0 ? (
          <p className="p-8 text-center text-slate-400">Aucun contact pour l'instant. Ajoutez-en un !</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Société</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    <div>{c.email || '—'}</div>
                    <div className="text-xs text-slate-400">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={c.status} onChange={(e) => updateStatus(c, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 border-0 ${STATUS_STYLE[c.status]}`}>
                      <option value="prospect">Prospect</option>
                      <option value="client">Client</option>
                      <option value="inactif">Inactif</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c)} className="text-red-500 hover:text-red-700 text-xs">Supprimer</button>
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
