'use client';
/** Barre de navigation des pages publiques (accueil, pricing…). */
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function PublicNav() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-xl">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient shadow-glow text-sm">🎯</span>
          <span className="text-white">AutoPilote</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          <Link href="/#agents" className="hidden sm:inline btn-ghost">Agents</Link>
          <Link href="/pricing" className="btn-ghost">Tarifs</Link>
          {user ? (
            <Link href="/dashboard" className="btn-primary text-sm ml-1">Mon espace</Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Connexion</Link>
              <Link href="/register" className="btn-primary text-sm ml-1">Essayer</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
