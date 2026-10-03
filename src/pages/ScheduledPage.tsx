import { InlineNotice } from '../components/Notifications';
import { useFeedback, useNotifications } from '../components/Notifications';
import { Modal } from '../components/Modal';
import { PaginatedTable } from '../components/PaginatedTable';
import {
  Calendar,
  Eye,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Smartphone,
  Square,
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
import { connectionLabel } from '../utils/connection-label';

type DeliveryCampaign = Awaited<
  ReturnType<typeof window.appAPI.listDeliveryCampaigns>
>[number];

type WhatsAppStatus = Awaited<
  ReturnType<typeof window.appAPI.getWhatsAppStatus>
>;

function formatColomboDateTime(value: string | null) {
  if (!value) {
    return '—';
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

function statusClass(status: string) {
  switch (status) {
    case 'scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'queued':
      return 'border-violet-200 bg-violet-50 text-violet-700';

    case 'running':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'paused':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function progressPercentage(campaign: DeliveryCampaign) {
  if (campaign.totalRecipients === 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((campaign.processedCount / campaign.totalRecipients) * 100),
  );
}

export function ScheduledPage() {
  const { confirm } = useNotifications();
  const [campaigns, setCampaigns] = useState<DeliveryCampaign[]>([]);

  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [error, setError] = useFeedback('error');

  const [, setSuccess] = useFeedback('success');

  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignDetails | null>(null);

  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>(
    {},
  );

  const [loadingDetails, setLoadingDetails] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] =
    useState<DeliveryCampaign | null>(null);

  const [rescheduleValue, setRescheduleValue] = useState('');

  async function loadCampaigns(options?: {
    manual?: boolean;
    initial?: boolean;
  }) {
    try {
      if (options?.manual) {
        setRefreshing(true);
      }

      setError(null);

      const [result, whatsapp] = await Promise.all([
        window.appAPI.listDeliveryCampaigns(),
        window.appAPI.getWhatsAppStatus(),
      ]);

      setCampaigns(result);

      setWhatsappStatus(whatsapp);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load delivery queue.',
      );
    } finally {
      if (options?.initial !== false) {
        setLoading(false);
      }

      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCampaigns({
      initial: true,
    });

    const timer = window.setInterval(() => {
      void loadCampaigns({
        initial: false,
      });
    }, 3000);

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

  async function connectWhatsApp() {
    try {
      setError(null);

      const status = await window.appAPI.connectWhatsApp();
      if (status.state === 'error') {
        setError(status.message);
        return;
      }

      setWhatsappStatus(status);

      setSuccess(
        status.state === 'connected'
          ? 'WhatsApp Web connected.'
          : 'WhatsApp Web opened. Scan the QR code if requested.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to open WhatsApp Web.',
      );
    }
  }

  async function sendNow(campaign: DeliveryCampaign) {
    try {
      setBusyId(campaign.id);
      setError(null);

      await window.appAPI.queueCampaignNow(campaign.id);

      setSuccess('Campaign moved to the delivery queue.');

      await loadCampaigns({
        initial: false,
      });
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

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reschedule campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function cancelSchedule(campaign: DeliveryCampaign) {
    if (
      !(await confirm({
        title: 'Cancel this schedule?',
        message: `Cancel the schedule for "${campaign.name}" and return it to Draft?`,
        confirmLabel: 'Return to draft',
        tone: 'warning',
      }))
    ) {
      return;
    }

    try {
      setBusyId(campaign.id);

      await window.appAPI.cancelCampaignSchedule(campaign.id);

      setSuccess('Schedule cancelled. Campaign returned to Draft.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to cancel schedule.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function returnToDraft(campaign: DeliveryCampaign) {
    if (
      !(await confirm({
        title: 'Return this campaign to draft?',
        message: `Return "${campaign.name}" to Draft?`,
        confirmLabel: 'Return to draft',
        tone: 'primary',
      }))
    ) {
      return;
    }

    try {
      setBusyId(campaign.id);

      await window.appAPI.returnQueuedCampaignToDraft(campaign.id);

      setSuccess('Queued campaign returned to Draft.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to return campaign to Draft.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function pauseCampaign(campaign: DeliveryCampaign) {
    try {
      setBusyId(campaign.id);

      await window.appAPI.pauseCampaign(campaign.id);

      setSuccess('Campaign paused.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to pause campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function resumeCampaign(campaign: DeliveryCampaign) {
    try {
      setBusyId(campaign.id);

      await window.appAPI.resumeCampaign(campaign.id);

      setSuccess('Campaign returned to the delivery queue.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to resume campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function retryFailed(campaign: DeliveryCampaign) {
    const confirmed = await confirm({
      title: 'Retry failed or uncertain messages?',
      message:
        'Retry failed or uncertain work?\n\nMessages already recorded as sent will not be resent. An uncertain message may have been submitted before the app stopped, so retry it only if you accept that duplicate risk.',
      confirmLabel: 'Retry messages',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(campaign.id);

      await window.appAPI.retryFailedCampaign(campaign.id);

      setSuccess('Failed / uncertain work returned to the queue.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to retry campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function cancelExecution(campaign: DeliveryCampaign) {
    if (
      !(await confirm({
        title: 'Stop this campaign?',
        message: `Cancel "${campaign.name}"?\n\nMessages already submitted will remain recorded. Pending work will stop.`,
        confirmLabel: 'Stop campaign',
        tone: 'danger',
      }))
    ) {
      return;
    }

    try {
      setBusyId(campaign.id);

      await window.appAPI.cancelCampaignExecution(campaign.id);

      setSuccess('Campaign cancelled.');

      await loadCampaigns({
        initial: false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to cancel campaign.',
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

  const runningCount = campaigns.filter(
    (campaign) => campaign.status === 'running',
  ).length;

  const pausedCount = campaigns.filter(
    (campaign) => campaign.status === 'paused',
  ).length;

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
        title="Sending & schedule"
        description="See what’s sending, what’s waiting, and what’s planned. Keep the app open while your campaigns are running."
      />

      {error && (
        <InlineNotice message={error} onDismiss={() => setError(null)} />
      )}

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <Smartphone size={20} className="text-emerald-700" />
          </div>

          <div>
            <p className="font-semibold">WhatsApp Web</p>

            <p className="text-sm text-slate-500">
              {whatsappStatus?.message ?? 'Checking connection...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              whatsappStatus?.state === 'connected'
                ? 'bg-emerald-50 text-emerald-700'
                : whatsappStatus?.state === 'waiting_for_qr'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {connectionLabel(whatsappStatus?.state)}
          </span>

          {whatsappStatus?.state !== 'connected' && (
            <button
              type="button"
              onClick={() => void connectWhatsApp()}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Open WhatsApp
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Loading delivery queue...
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Nothing scheduled or queued"
          description="Open a campaign and choose Send to add it to the queue or schedule it for later."
          actionTo="/campaigns"
          actionLabel="Choose a campaign"
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Scheduled
              </p>

              <p className="mt-2 text-2xl font-bold">{scheduledCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Queued
              </p>

              <p className="mt-2 text-2xl font-bold">{queuedCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Running
              </p>

              <p className="mt-2 text-2xl font-bold">{runningCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Paused
              </p>

              <p className="mt-2 text-2xl font-bold">{pausedCount}</p>
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
                  Only one campaign is processed at a time.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadCampaigns({
                    manual: true,
                    initial: false,
                  })
                }
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
              <PaginatedTable className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>

                    <th className="px-5 py-3">Status</th>

                    <th className="px-5 py-3">Progress</th>

                    <th className="px-5 py-3">Success</th>

                    <th className="px-5 py-3">Failed</th>

                    <th className="px-5 py-3">Schedule</th>

                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="min-w-60 px-5 py-4">
                        <p className="font-semibold">{campaign.name}</p>

                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Users size={13} />
                          {campaign.totalRecipients} recipients
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                            campaign.status,
                          )}`}
                        >
                          {campaign.status}
                        </span>
                      </td>

                      <td className="min-w-40 px-5 py-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {campaign.processedCount}/{campaign.totalRecipients}
                          </span>

                          <span>{progressPercentage(campaign)}%</span>
                        </div>

                        <progress
                          className="delivery-progress"
                          max={100}
                          value={progressPercentage(campaign)}
                          aria-label={`Sending progress for ${campaign.name}`}
                        />
                      </td>

                      <td className="px-5 py-4 text-emerald-700">
                        {campaign.successCount}
                      </td>

                      <td className="px-5 py-4 text-red-700">
                        {campaign.failureCount}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                        {campaign.scheduledAt
                          ? formatColomboDateTime(campaign.scheduledAt)
                          : campaign.startedAt
                            ? `Started ${formatColomboDateTime(
                                campaign.startedAt,
                              )}`
                            : 'Send ASAP'}
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
                            <span className="action-label">View</span>
                          </button>

                          {campaign.status === 'scheduled' && (
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
                                className="rounded-lg border border-blue-200 p-2 text-blue-700"
                                title="Reschedule"
                              >
                                <Calendar size={16} />
                                <span className="action-label">Reschedule</span>
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void sendNow(campaign)}
                                className="rounded-lg border border-emerald-200 p-2 text-emerald-700"
                                title="Send Now"
                              >
                                <Play size={16} />
                                <span className="action-label">Send Now</span>
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void cancelSchedule(campaign)}
                                className="rounded-lg border border-amber-200 p-2 text-amber-700"
                                title="Cancel Schedule"
                              >
                                <X size={16} />
                                <span className="action-label">
                                  Cancel Schedule
                                </span>
                              </button>
                            </>
                          )}

                          {campaign.status === 'queued' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void returnToDraft(campaign)}
                                className="rounded-lg border p-2"
                                title="Return to Draft"
                              >
                                <RotateCcw size={16} />
                                <span className="action-label">
                                  Return to Draft
                                </span>
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void cancelExecution(campaign)}
                                className="rounded-lg border border-red-200 p-2 text-red-700"
                                title="Cancel"
                              >
                                <Square size={16} />
                                <span className="action-label">Cancel</span>
                              </button>
                            </>
                          )}

                          {campaign.status === 'running' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void pauseCampaign(campaign)}
                                className="rounded-lg border border-amber-200 p-2 text-amber-700"
                                title="Pause"
                              >
                                <Pause size={16} />
                                <span className="action-label">Pause</span>
                              </button>

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void cancelExecution(campaign)}
                                className="rounded-lg border border-red-200 p-2 text-red-700"
                                title="Cancel"
                              >
                                <Square size={16} />
                                <span className="action-label">Cancel</span>
                              </button>
                            </>
                          )}

                          {campaign.status === 'paused' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void resumeCampaign(campaign)}
                                className="rounded-lg border border-emerald-200 p-2 text-emerald-700"
                                title="Resume"
                              >
                                <Play size={16} />
                                <span className="action-label">Resume</span>
                              </button>

                              {(campaign.failureCount > 0 ||
                                campaign.uncertainCount > 0) && (
                                <button
                                  type="button"
                                  disabled={busyId === campaign.id}
                                  onClick={() => void retryFailed(campaign)}
                                  className="rounded-lg border border-amber-200 p-2 text-amber-700"
                                  title="Retry failed / uncertain"
                                >
                                  <RotateCcw size={16} />
                                  <span className="action-label">
                                    Retry failed / uncertain
                                  </span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={busyId === campaign.id}
                                onClick={() => void cancelExecution(campaign)}
                                className="rounded-lg border border-red-200 p-2 text-red-700"
                                title="Cancel"
                              >
                                <Square size={16} />
                                <span className="action-label">Cancel</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PaginatedTable>
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
        <Modal
          label="Change campaign schedule"
          onClose={() => setRescheduleTarget(null)}
          busy={busyId !== null}
          error={error}
        >
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
        </Modal>
      )}
    </>
  );
}
