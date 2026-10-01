import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Megaphone,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

const cards = [
  {
    title: 'Total Campaigns',
    value: '0',
    description: 'Campaigns created',
    icon: Megaphone,
  },
  {
    title: 'Successful Sends',
    value: '0',
    description: 'Message operations',
    icon: CheckCircle2,
  },
  {
    title: 'Scheduled',
    value: '0',
    description: 'Waiting campaigns',
    icon: CalendarClock,
  },
  {
    title: 'Active',
    value: '0',
    description: 'Currently processing',
    icon: Clock3,
  },
];

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Monitor campaigns, schedules, and sending progress."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, description, icon: Icon }) => (
          <div
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <Icon className="text-emerald-700" size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">Recent campaigns</h3>
          <div className="mt-6 rounded-xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            No campaigns yet.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">WhatsApp connection</h3>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900">Not connected</p>
            <p className="mt-1 text-sm text-amber-700">
              Playwright and WhatsApp Web login will be added after the core
              campaign modules are ready.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
