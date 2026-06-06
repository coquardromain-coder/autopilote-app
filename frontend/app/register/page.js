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
      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[28rem] h-[28rem] bg-brand-500/20 top-0 right-0 animate-float" />
      <div className="blob w-[24rem] h-[24rem] bg-cyan-500/10 -bottom-10 -left-10 animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative w-full max-w-md glass-card p-8 animate-fade-in-up">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-6">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient shadow-glow animate-pulse-glow">🎯</span>
          <span>AutoPilote</span>
        </Link>
        <h1 className="text-xl font-bold text-center">Créer votre compte</h1>
        <p className="text-center text-sm text-muted mt-1">Démarrez en quelques secondes.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input required value={form.name} onChange={update('name')} className="input" placeholder="Camille Dupont" />
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input value={form.company} onChange={update('company')} className="input" placeholder="Mon Entreprise SARL" />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={form.email} onChange={update('email')} className="input" placeholder="vous@entreprise.fr" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" required value={form.password} onChange={update('password')} className="input" placeholder="6 caractères minimum" />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-cyan-400 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
