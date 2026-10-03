import { InlineNotice } from '../components/Notifications';
import { useFeedback } from '../components/Notifications';
import {
  CalendarClock,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Megaphone,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

import { PageHeader } from '../components/PageHeader';

type CampaignItem = {
  id: string;

  name: string;

  status: string;

  updatedAt: string;

  createdAt?: string;

  totalRecipients?: number;

  recipientCount?: number;

  successCount?: number;
};

type WhatsAppStatus = Awaited<
  ReturnType<typeof window.appAPI.getWhatsAppStatus>
>;

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700';

    case 'failed':
      return 'bg-red-50 text-red-700';

    case 'running':
      return 'bg-blue-50 text-blue-700';

    case 'scheduled':
      return 'bg-violet-50 text-violet-700';

    case 'queued':
      return 'bg-amber-50 text-amber-700';

    case 'paused':
      return 'bg-orange-50 text-orange-700';

    case 'cancelled':
      return 'bg-slate-100 text-slate-600';

    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatStatus(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function DashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useFeedback('error');

  const [whatsAppStatus, setWhatsAppStatus] = useState<WhatsAppStatus | null>(
    null,
  );

  async function loadDashboard(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      }

      setError(null);

      const [drafts, scheduled, delivery, history, connection] =
        await Promise.all([
          window.appAPI.listSavedCampaigns(),
          window.appAPI.listScheduledCampaigns(),
          window.appAPI.listDeliveryCampaigns(),
          window.appAPI.listCampaignHistory(),
          window.appAPI.getWhatsAppStatus(),
        ]);

      const campaignMap = new Map<string, CampaignItem>();

      for (const campaign of drafts) {
        campaignMap.set(campaign.id, campaign);
      }

      for (const campaign of scheduled) {
        campaignMap.set(campaign.id, campaign);
      }

      for (const campaign of delivery) {
        campaignMap.set(campaign.id, campaign);
      }

      for (const campaign of history) {
        campaignMap.set(campaign.id, campaign);
      }

      setCampaigns(Array.from(campaignMap.values()));

      setWhatsAppStatus(connection);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load dashboard information.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();

    const interval = window.setInterval(() => {
      void window.appAPI
        .getWhatsAppStatus()
        .then(setWhatsAppStatus)
        .catch(() => {
          // Keep the last known connection state.
        });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const statistics = useMemo(() => {
    const totalCampaigns = campaigns.length;

    const successfulSends = campaigns.reduce(
      (total, campaign) => total + (campaign.successCount ?? 0),
      0,
    );

    const scheduledCount = campaigns.filter(
      (campaign) => campaign.status === 'scheduled',
    ).length;

    const activeCount = campaigns.filter(
      (campaign) => campaign.status === 'running',
    ).length;

    return {
      totalCampaigns,
      successfulSends,
      scheduledCount,
      activeCount,
    };
  }, [campaigns]);

  const recentCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 5),
    [campaigns],
  );

  const cards = [
    {
      title: 'Total Campaigns',
      value: statistics.totalCampaigns,
      description: 'Campaigns created',
      icon: Megaphone,
    },
    {
      title: 'Successful Sends',
      value: statistics.successfulSends,
      description: 'Successful recipients',
      icon: CheckCircle2,
    },
    {
      title: 'Scheduled',
      value: statistics.scheduledCount,
      description: 'Waiting campaigns',
      icon: CalendarClock,
    },
    {
      title: 'Active',
      value: statistics.activeCount,
      description: 'Currently processing',
      icon: Clock3,
    },
  ];

  function connectionBox() {
    if (!whatsAppStatus) {
      return (
        <div className="flex items-center gap-3 rounded-xl border bg-slate-50 p-4 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Checking WhatsApp connection...
        </div>
      );
    }

    if (whatsAppStatus.state === 'connected') {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <Wifi className="mt-0.5 text-emerald-700" size={20} />

            <div>
              <p className="font-semibold text-emerald-900">
                WhatsApp connected
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                WhatsApp Web is ready for campaign sending.
              </p>

              {whatsAppStatus.browserName && (
                <p className="mt-2 text-xs text-emerald-600">
                  Browser: {whatsAppStatus.browserName}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (whatsAppStatus.state === 'opening') {
      return (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 animate-spin text-blue-700" size={20} />

            <div>
              <p className="font-semibold text-blue-900">
                Opening WhatsApp Web
              </p>

              <p className="mt-1 text-sm text-blue-700">
                {whatsAppStatus.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (whatsAppStatus.state === 'waiting_for_qr') {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 text-amber-700" size={20} />

            <div>
              <p className="font-semibold text-amber-900">
                Waiting for QR scan
              </p>

              <p className="mt-1 text-sm text-amber-700">
                Scan the WhatsApp Web QR code using your phone.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (whatsAppStatus.state === 'error') {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 text-red-700" size={20} />

            <div>
              <p className="font-semibold text-red-900">
                WhatsApp connection error
              </p>

              <p className="mt-1 text-sm text-red-700">
                {whatsAppStatus.message}
              </p>

              <Link
                to="/settings"
                className="mt-3 inline-block text-sm font-semibold text-red-800 underline"
              >
                Open Settings
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <WifiOff className="mt-0.5 text-amber-700" size={20} />

          <div>
            <p className="font-semibold text-amber-900">
              WhatsApp not connected
            </p>

            <p className="mt-1 text-sm text-amber-700">
              Connect WhatsApp Web before sending campaigns.
            </p>

            <Link
              to="/settings"
              className="mt-3 inline-block text-sm font-semibold text-amber-800 underline"
            >
              Open Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Your outreach, at a glance."
          description="A clear view of your campaigns and what to do next."
        />

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void loadDashboard(true)}
          className="mt-1 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <InlineNotice message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Loading dashboard...
        </div>
      ) : (
        <>
          <section className="dashboard-hero">
            <div>
              <p className="eyebrow">MAKE YOUR NEXT CONNECTION</p>
              <h3>A thoughtful message. The right people.</h3>
              <p>
                Start with a contact list, build your messages, and choose when
                to send. We’ll keep everything organized along the way.
              </p>
            </div>
            <Link to="/campaigns/new" className="button">
              Create a campaign
              <ArrowRight size={17} />
            </Link>
          </section>
          <div className="workflow-grid">
            {[
              {
                to: '/import',
                title: 'Prepare your contacts',
                text: 'Import a list and check the phone numbers.',
              },
              {
                to: '/campaigns',
                title: 'Make it your own',
                text: 'Edit a draft or reuse a previous campaign.',
              },
              {
                to: '/scheduled',
                title: 'Keep an eye on delivery',
                text: 'See what’s sending and what’s coming next.',
              },
            ].map((step, index) => (
              <Link className="workflow-card" to={step.to} key={step.to}>
                <span className="step-number">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ title, value, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-950">
                      {value}
                    </p>

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
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b p-6">
                <h3 className="font-semibold">Recent campaigns</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Latest campaign activity across the application.
                </p>
              </div>

              {recentCampaigns.length === 0 ? (
                <div className="m-6 rounded-xl bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  No campaigns yet.
                </div>
              ) : (
                <div className="divide-y">
                  {recentCampaigns.map((campaign) => (
                    <Link
                      to="/campaigns"
                      key={campaign.id}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {campaign.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {campaign.totalRecipients ??
                            campaign.recipientCount ??
                            0}{' '}
                          recipients · Updated{' '}
                          {formatDateTime(campaign.updatedAt)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          campaign.status,
                        )}`}
                      >
                        {formatStatus(campaign.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold">WhatsApp connection</h3>

              <p className="mt-1 text-sm text-slate-500">
                Current WhatsApp Web sender status.
              </p>

              <div className="mt-5">{connectionBox()}</div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
