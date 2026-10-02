import {
  Calendar,
  Check,
  Clock,
  Eye,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import {
  CampaignDetailsViewer,
  type CampaignDetails,
  type CampaignMedia,
} from '../components/CampaignDetailsViewer';

import { EmptyState } from '../components/EmptyState';

import { PageHeader } from '../components/PageHeader';

type ScheduledCampaign = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  sendMode: string;

  timezone: string;

  scheduledAt: string | null;

  createdAt: string;

  updatedAt: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

function formatColomboDateTime(value: string | null) {
  if (!value) {
    return 'Send ASAP';
  }

  return new Intl.DateTimeFormat('en-LK', {
    timeZone: 'Asia/Colombo',

    dateStyle: 'medium',

    timeStyle: 'short',
  }).format(new Date(value));
}

function isoToColomboInput(value: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 10 * 60_000);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',

    year: 'numeric',

    month: '2-digit',

    day: '2-digit',

    hour: '2-digit',

    minute: '2-digit',

    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function isFutureColomboDateTime(value: string) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(`${value}:00+05:30`);

  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function getStatusClass(status: string) {
  if (status === 'scheduled') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  return 'border-violet-200 bg-violet-50 text-violet-700';
}

export function ScheduledPage() {
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignDetails | null>(null);

  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>(
    {},
  );

  const [loadingDetails, setLoadingDetails] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] =
    useState<ScheduledCampaign | null>(null);

  const [rescheduleValue, setRescheduleValue] = useState('');

  const [cancelTarget, setCancelTarget] = useState<ScheduledCampaign | null>(
    null,
  );

  const [returnTarget, setReturnTarget] = useState<ScheduledCampaign | null>(
    null,
  );

  async function loadCampaigns(manualRefresh = false) {
    try {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await window.appAPI.listScheduledCampaigns();

      setCampaigns(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load scheduled campaigns.',
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();

    const timer = window.setInterval(() => {
      void loadCampaigns();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  async function loadImagePreviews(details: CampaignDetails) {
    const imageMedia = details.messages
      .map((message) => message.media)
      .filter((media): media is CampaignMedia =>
        Boolean(media?.mimeType?.startsWith('image/')),
      );

    const previews: Record<string, string> = {};

    await Promise.all(
      imageMedia.map(async (media) => {
        try {
          const preview = await window.appAPI.getCampaignMediaPreview(media.id);

          previews[media.id] = preview.dataUrl;
        } catch {
          // Keep placeholder.
        }
      }),
    );

    setMediaPreviews(previews);
  }

  async function viewCampaign(campaignId: string) {
    try {
      setLoadingDetails(true);

      setError(null);

      setMediaPreviews({});

      const details = await window.appAPI.getSavedCampaignDetails(campaignId);

      setSelectedCampaign(details);

      await loadImagePreviews(details);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load campaign details.',
      );
    } finally {
      setLoadingDetails(false);
    }
  }

  async function sendNow(campaign: ScheduledCampaign) {
    try {
      setBusyId(campaign.id);

      setError(null);

      await window.appAPI.queueCampaignNow(campaign.id);

      setSuccess(
        'Campaign moved to Queued. No WhatsApp messages have been sent yet.',
      );

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to queue campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReschedule() {
    if (!rescheduleTarget) {
      return;
    }

    if (!isFutureColomboDateTime(rescheduleValue)) {
      setError('Choose a future date and time in Asia/Colombo.');

      return;
    }

    try {
      setBusyId(rescheduleTarget.id);

      setError(null);

      await window.appAPI.rescheduleCampaign({
        campaignId: rescheduleTarget.id,

        scheduledLocalDateTime: rescheduleValue,
      });

      setRescheduleTarget(null);

      setSuccess('Campaign rescheduled successfully.');

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reschedule campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancelSchedule() {
    if (!cancelTarget) {
      return;
    }

    try {
      setBusyId(cancelTarget.id);

      setError(null);

      await window.appAPI.cancelCampaignSchedule(cancelTarget.id);

      setCancelTarget(null);

      setSuccess('Schedule cancelled. Campaign returned to Draft.');

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel campaign schedule.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReturnToDraft() {
    if (!returnTarget) {
      return;
    }

    try {
      setBusyId(returnTarget.id);

      setError(null);

      await window.appAPI.returnQueuedCampaignToDraft(returnTarget.id);

      setReturnTarget(null);

      setSuccess('Queued campaign returned to Draft.');

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to return campaign to draft.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const scheduledCount = campaigns.filter(
    (campaign) => campaign.status === 'scheduled',
  ).length;

  const queuedCount = campaigns.filter(
    (campaign) => campaign.status === 'queued',
  ).length;

  const totalRecipients = campaigns.reduce(
    (total, campaign) => total + campaign.recipientCount,
    0,
  );

  const nextScheduled = useMemo(
    () =>
      campaigns
        .filter(
          (campaign) => campaign.status === 'scheduled' && campaign.scheduledAt,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledAt as string).getTime() -
            new Date(b.scheduledAt as string).getTime(),
        )[0] ?? null,
    [campaigns],
  );

  return (
    <>
      <PageHeader
        title="Scheduled"
        description="Manage scheduled and queued campaigns before the WhatsApp sender begins processing."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <Check size={18} />

          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Loading scheduled campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled or queued"
          description="Use Delivery on a draft campaign to Send Now or Schedule Later."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Scheduled
              </p>

              <p className="mt-2 text-2xl font-bold">{scheduledCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Queued Now
              </p>

              <p className="mt-2 text-2xl font-bold">{queuedCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Total Recipients
              </p>

              <p className="mt-2 text-2xl font-bold">{totalRecipients}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Next Scheduled
              </p>

              <p className="mt-2 text-sm font-bold">
                {nextScheduled
                  ? formatColomboDateTime(nextScheduled.scheduledAt)
                  : 'None'}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
              <div>
                <h3 className="font-semibold">Delivery Queue</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Scheduled campaigns automatically become Queued when due.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadCampaigns(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>

                    <th className="px-5 py-3">Delivery</th>

                    <th className="px-5 py-3">Recipients</th>

                    <th className="px-5 py-3">Messages</th>

                    <th className="px-5 py-3">Scheduled For</th>

                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="min-w-64 px-5 py-4">
                        <p className="font-semibold">{campaign.name}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {campaign.description || 'No description'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            campaign.status,
                          )}`}
                        >
                          {campaign.status === 'scheduled'
                            ? 'Scheduled'
                            : 'Queued'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users size={15} />

                          {campaign.recipientCount}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={15} />

                          {campaign.messageCount}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {campaign.status === 'scheduled' ? (
                          <div className="flex items-center gap-2">
                            <Clock size={15} />

                            {formatColomboDateTime(campaign.scheduledAt)}
                          </div>
                        ) : campaign.scheduledAt ? (
                          `Queued after ${formatColomboDateTime(
                            campaign.scheduledAt,
                          )}`
                        ) : (
                          'Send ASAP'
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void viewCampaign(campaign.id)}
                            className="rounded-lg border p-2"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          {campaign.status === 'scheduled' ? (
                            <>
                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => {
                                  setRescheduleTarget(campaign);

                                  setRescheduleValue(
                                    isoToColomboInput(campaign.scheduledAt),
                                  );
                                }}
                                className="rounded-lg border border-blue-200 p-2 text-blue-700 disabled:opacity-50"
                                title="Reschedule"
                              >
                                <Calendar size={16} />
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void sendNow(campaign)}
                                className="rounded-lg border border-emerald-200 p-2 text-emerald-700 disabled:opacity-50"
                                title="Send Now"
                              >
                                <Play size={16} />
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => setCancelTarget(campaign)}
                                className="rounded-lg border border-amber-200 p-2 text-amber-700 disabled:opacity-50"
                                title="Cancel Schedule"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === campaign.id}
                              onClick={() => setReturnTarget(campaign)}
                              className="rounded-lg border border-slate-300 p-2 text-slate-700 disabled:opacity-50"
                              title="Return to Draft"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {loadingDetails && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-white p-6">
              <Loader2 className="animate-spin" size={18} />
              Loading campaign...
            </div>
          )}

          {selectedCampaign && !loadingDetails && (
            <CampaignDetailsViewer
              key={`${selectedCampaign.id}-${selectedCampaign.updatedAt}`}
              campaign={selectedCampaign}
              mediaPreviews={mediaPreviews}
              onClose={() => setSelectedCampaign(null)}
            />
          )}
        </>
      )}

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b p-6">
              <h3 className="text-lg font-semibold">Reschedule Campaign</h3>

              <p className="mt-2 text-sm text-slate-500">
                {rescheduleTarget.name}
              </p>
            </div>

            <div className="p-6">
              <input
                type="datetime-local"
                value={rescheduleValue}
                onChange={(event) => setRescheduleValue(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />

              <p className="mt-2 text-xs text-slate-500">
                Asia/Colombo (UTC+05:30)
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    !isFutureColomboDateTime(rescheduleValue) ||
                    busyId === rescheduleTarget.id
                  }
                  onClick={() => void confirmReschedule()}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Cancel Schedule?</h3>

            <p className="mt-2 text-sm text-slate-500">
              {cancelTarget.name} will return to Draft and become editable
              again.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Keep Scheduled
              </button>

              <button
                type="button"
                disabled={busyId === cancelTarget.id}
                onClick={() => void confirmCancelSchedule()}
                className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Cancel Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {returnTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">Return to Draft?</h3>

            <p className="mt-2 text-sm text-slate-500">
              {returnTarget.name} will leave the delivery queue and become
              editable again.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Keep Queued
              </button>

              <button
                type="button"
                disabled={busyId === returnTarget.id}
                onClick={() => void confirmReturnToDraft()}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Return to Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
