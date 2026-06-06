'use client';
/**
 * Coque (layout) du tableau de bord : barre latérale de navigation +
 * protection d'accès (redirection si non connecté ou onboarding non fait).
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: '📊' },
  { href: '/dashboard/chat', label: 'Discuter avec les agents', icon: '💬' },
  { href: '/dashboard/agents', label: 'Mes 17 agents', icon: '🤖' },
  { href: '/dashboard/crm', label: 'CRM — Contacts', icon: '🤝' },
  { href: '/dashboard/billing', label: 'Facturation & Devis', icon: '🧾' },
  { href: '/dashboard/integrations', label: 'Intégrations Google', icon: '🔗' },
  { href: '/dashboard/settings', label: 'Paramètres', icon: '⚙️' },
];

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
    else if (!user.onboarded) router.push('/onboarding');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Chargement…</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Barre latérale */}
      <aside className="w-64 fixed inset-y-0 hidden md:flex flex-col border-r border-white/[0.06] bg-ink-800/60 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl px-6 h-16 border-b border-white/[0.06]">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-gradient shadow-glow text-sm">🎯</span>
          <span>AutoPilote</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  active
                    ? 'bg-brand-500/15 text-white border border-brand-500/30 shadow-glow'
                    : 'text-muted hover:text-white hover:bg-white/[0.04]'
                }`}>
                <span className="text-lg">{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="px-3 py-2 mb-1">
            <div className="font-medium text-sm truncate">{user.name}</div>
            <div className="text-xs text-muted truncate">{user.company || user.email}</div>
            <span className="chip mt-2 !text-cyan-300 !border-cyan-500/30 !bg-cyan-500/10 capitalize">Pack {user.plan}</span>
          </div>
          <button onClick={() => { logout(); router.push('/'); }} className="btn-ghost w-full">
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 md:ml-64">
        <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-white/[0.06] bg-ink-800/60 backdrop-blur-xl sticky top-0 z-30">
          <span className="font-bold flex items-center gap-2"><span>🎯</span> AutoPilote</span>
          <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-muted">Déconnexion</button>
        </div>
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
