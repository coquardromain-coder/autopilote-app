'use client';
/** Page d'inscription (création de compte). */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      // Nouveau compte : on enchaîne sur l'onboarding
      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl text-brand-700 mb-6">
          <span>🎯</span> AutoPilote
        </Link>
        <h1 className="text-xl font-bold text-center text-slate-900">Créer votre compte</h1>
        <p className="text-center text-sm text-slate-500 mt-1">Démarrez en quelques secondes.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
            <input required value={form.name} onChange={update('name')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Camille Dupont" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entreprise</label>
            <input value={form.company} onChange={update('company')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Mon Entreprise SARL" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={update('email')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="vous@entreprise.fr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <input type="password" required value={form.password} onChange={update('password')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="6 caractères minimum" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
