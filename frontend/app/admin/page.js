'use client';
/** Connexion à l'espace ADMIN (conseiller AutoPilote). */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin, getAdminToken } from '@/lib/admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@autopilote.fr');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (getAdminToken()) router.push('/admin/clients'); }, [router]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await adminLogin(email, password); router.push('/admin/clients'); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid">
      <div className="w-full max-w-md glass-card p-8 animate-fade-in-up">
        <div className="flex items-center justify-center gap-2 font-bold text-2xl mb-6">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient shadow-glow">🛠️</span>
          <span>AutoPilote — Admin</span>
        </div>
        <h1 className="text-lg font-bold text-center">Espace conseiller</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
          <div><label className="label">Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" /></div>
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button disabled={loading} className="btn-primary w-full py-3">{loading ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        <p className="text-center text-xs text-muted mt-4">Accès réservé à l'administrateur AutoPilote.</p>
      </div>
    </div>
  );
}
