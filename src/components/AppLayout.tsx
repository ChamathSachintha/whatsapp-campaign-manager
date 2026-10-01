import {
  CalendarClock,
  History,
  LayoutDashboard,
  Megaphone,
  MessageSquarePlus,
  Settings,
  Upload,
} from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/import', label: 'Import Contacts', icon: Upload },
  { to: '/campaigns/new', label: 'Create Campaign', icon: MessageSquarePlus },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/scheduled', label: 'Scheduled', icon: CalendarClock },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Outreach
            </p>
            <h1 className="text-lg font-bold">Campaign Manager</h1>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full border-t border-slate-200 p-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                WhatsApp not connected
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Connection module will be added later.
            </p>
          </div>
        </div>
      </aside>

      <div className="pl-64">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
          <div>
            <p className="text-sm text-slate-500">
              WhatsApp Web Campaign Manager
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
            Local desktop mode
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
