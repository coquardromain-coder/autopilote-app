'use client';
/** Barre de navigation des pages publiques (accueil, pricing…). */
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function PublicNav() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-700">
          <span className="text-2xl">🎯</span> AutoPilote
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link href="/#agents" className="hidden sm:inline text-slate-600 hover:text-brand-700">Agents</Link>
          <Link href="/pricing" className="text-slate-600 hover:text-brand-700">Tarifs</Link>
          {user ? (
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">
              Mon espace
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-brand-700">Connexion</Link>
              <Link href="/register" className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700">
                Essayer
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
