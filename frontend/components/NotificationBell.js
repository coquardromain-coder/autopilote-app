'use client';
/** Cloche de notifications du dashboard (tâches terminées, etc.). */
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  function load() {
    api('/api/notifications').then(setData).catch(() => {});
  }

  useEffect(() => {
    load();
    // Rafraîchit régulièrement (les tâches terminées créent des notifications)
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Ferme au clic extérieur
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data.unread > 0) {
      await api('/api/notifications/read', { method: 'POST' }).catch(() => {});
      setData((d) => ({ ...d, unread: 0 }));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative grid place-items-center w-9 h-9 rounded-xl glass hover:border-brand-500/40 transition-all duration-300">
        <span className="text-lg">🔔</span>
        {data.unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gradient text-[10px] font-bold grid place-items-center shadow-glow">
            {data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 glass-card p-2 z-50 shadow-card animate-fade-in-up">
          <div className="px-2 py-1.5 text-xs uppercase tracking-wide text-muted font-semibold">Notifications</div>
          {data.notifications.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted text-center">Aucune notification.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {data.notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-2 px-2 py-2 rounded-lg text-sm ${n.read ? 'text-muted' : 'bg-white/[0.04] text-white'}`}>
                  <span>{n.icon || '🔔'}</span>
                  <div className="flex-1">
                    <div>{n.message}</div>
                    <div className="text-[11px] text-muted font-mono mt-0.5">{n.created_at?.slice(0, 16).replace('T', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
