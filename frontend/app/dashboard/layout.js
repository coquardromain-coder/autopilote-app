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

  // Protection d'accès
  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
    else if (!user.onboarded) router.push('/onboarding');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Chargement…</div>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Barre latérale */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 hidden md:flex">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-700 px-6 h-16 border-b border-slate-100">
          <span className="text-2xl">🎯</span> AutoPilote
        </Link>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className="text-lg">{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-2">
            <div className="font-medium text-sm text-slate-900 truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.company || user.email}</div>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs capitalize">
              Pack {user.plan}
            </span>
          </div>
          <button onClick={() => { logout(); router.push('/'); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            🚪 Déconnexion
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 md:ml-64">
        {/* Barre supérieure mobile */}
        <div className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
          <span className="font-bold text-brand-700">🎯 AutoPilote</span>
          <button onClick={() => { logout(); router.push('/'); }} className="text-sm text-slate-500">Déconnexion</button>
        </div>
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
