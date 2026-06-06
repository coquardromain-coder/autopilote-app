'use client';
/** Page de connexion. */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(user.onboarded ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Formes géométriques flottantes */}
      <div className="absolute inset-0 bg-grid" />
      <div className="blob w-[28rem] h-[28rem] bg-brand-500/20 -top-20 -left-10 animate-float" />
      <div className="blob w-[24rem] h-[24rem] bg-cyan-500/10 bottom-0 right-0 animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative w-full max-w-md glass-card p-8 animate-fade-in-up">
        <Link href="/" className="flex items-center justify-center gap-2 font-bold text-2xl mb-6">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient shadow-glow animate-pulse-glow">🎯</span>
          <span>AutoPilote</span>
        </Link>
        <h1 className="text-xl font-bold text-center">Connexion à votre espace</h1>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="input" placeholder="vous@entreprise.fr" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="input" placeholder="••••••••" />
          </div>

          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-cyan-400 font-medium hover:underline">Créer un compte</Link>
        </p>
        <div className="mt-6 text-center text-xs text-muted glass rounded-lg p-3">
          Compte de démo : <span className="font-mono text-cyan-400">demo@autopilote.fr</span> / <span className="font-mono text-cyan-400">demo1234</span>
        </div>
      </div>
    </div>
  );
}
