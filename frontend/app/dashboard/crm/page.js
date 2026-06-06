'use client';
/** Page CRM — gestion des contacts (agent Commercial). */
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const STATUS_STYLE = {
  prospect: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  client: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  inactif: 'bg-white/[0.06] text-muted border border-white/[0.08]',
};

export default function CrmPage() {
  const [contacts, setContacts] = useState(null);
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
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold">CRM — Contacts</h1>
          <p className="text-muted mt-1">Votre base clients & prospects, gérée par Commercial 🤝</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Fermer' : '+ Ajouter un contact'}
        </button>
      </div>

      {error && <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {showForm && (
        <form onSubmit={addContact} className="glass-card p-6 grid sm:grid-cols-2 gap-4 animate-fade-in-up">
          <input required value={form.name} onChange={update('name')} placeholder="Nom *" className="input" />
          <input value={form.company} onChange={update('company')} placeholder="Société" className="input" />
          <input type="email" value={form.email} onChange={update('email')} placeholder="Email" className="input" />
          <input value={form.phone} onChange={update('phone')} placeholder="Téléphone" className="input" />
          <select value={form.status} onChange={update('status')} className="input">
            <option className="bg-ink-800" value="prospect">Prospect</option>
            <option className="bg-ink-800" value="client">Client</option>
            <option className="bg-ink-800" value="inactif">Inactif</option>
          </select>
          <input value={form.notes} onChange={update('notes')} placeholder="Notes" className="input" />
          <button type="submit" className="btn-primary sm:col-span-2">Enregistrer le contact</button>
        </form>
      )}

      <div className="glass-card overflow-hidden">
        {contacts === null ? (
          <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-6 w-full skeleton" />)}</div>
        ) : contacts.length === 0 ? (
          <p className="p-8 text-center text-muted">Aucun contact pour l'instant. Ajoutez-en un !</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Société</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.company || '—'}</td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell">
                    <div>{c.email || '—'}</div>
                    <div className="text-xs text-muted/70 font-mono">{c.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={c.status} onChange={(e) => updateStatus(c, e.target.value)}
                      className={`text-xs rounded-full px-2 py-1 outline-none ${STATUS_STYLE[c.status]}`}>
                      <option className="bg-ink-800" value="prospect">Prospect</option>
                      <option className="bg-ink-800" value="client">Client</option>
                      <option className="bg-ink-800" value="inactif">Inactif</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Supprimer</button>
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
