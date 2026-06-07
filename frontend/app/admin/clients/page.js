'use client';
/** Liste des clients (espace admin). */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi, getAdminToken, setAdminToken } from '@/lib/admin';

export default function AdminClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getAdminToken()) { router.push('/admin'); return; }
    adminApi('/api/admin/clients').then((d) => setClients(d.clients)).catch((e) => setError(e.message));
  }, [router]);

  function logout() { setAdminToken(null); router.push('/admin'); }

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">🛠️ Clients AutoPilote</h1>
          <p className="text-muted mt-1">Gérez et configurez les comptes de vos clients.</p>
        </div>
        <button onClick={logout} className="btn-secondary">Déconnexion</button>
      </div>

      {error && <p className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      <div className="glass-card overflow-hidden">
        {clients === null ? (
          <div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-6 w-full skeleton" />)}</div>
        ) : clients.length === 0 ? (
          <p className="p-8 text-center text-muted">Aucun client pour l'instant.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-muted text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Société</th>
                <th className="px-4 py-3 font-medium">Pack</th>
                <th className="px-4 py-3 font-medium">Connecteurs</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">{c.company || '—'}</td>
                  <td className="px-4 py-3"><span className="chip capitalize">{c.plan}</span></td>
                  <td className="px-4 py-3 font-mono">{c.connectors.connected}/{c.connectors.total}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/clients/${c.id}`} className="btn-secondary text-xs py-1.5">Configurer</Link>
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
