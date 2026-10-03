import { InlineNotice } from '../components/Notifications';
import { useFeedback, useNotifications } from '../components/Notifications';
import { PaginatedTable } from '../components/PaginatedTable';
import {
  BarChart3,
  Eye,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import {
  CampaignDetailsViewer,
  type CampaignDetails,
  type CampaignMedia,
} from '../components/CampaignDetailsViewer';

import {
  CampaignReportPanel,
  type CampaignReportData,
} from '../components/CampaignReportPanel';

import { EmptyState } from '../components/EmptyState';

import { PageHeader } from '../components/PageHeader';
import {
  colomboDate,
  historyRange,
  type HistoryPeriod,
} from '../utils/history-filters';

type HistoryCampaign = Awaited<
  ReturnType<typeof window.appAPI.listCampaignHistory>
>[number];

function formatDateTime(value: string | null) {
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
  if (status === 'completed') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'failed') {
    return 'bg-red-50 text-red-700';
  }

  return 'bg-slate-100 text-slate-700';
}

export function HistoryPage() {
  const { confirm } = useNotifications();
  const [period, setPeriod] = useState<HistoryPeriod>('all');
  const [selectedDate, setSelectedDate] = useState(colomboDate());
  const [cleaning, setCleaning] = useState(false);
  const [campaigns, setCampaigns] = useState<HistoryCampaign[]>([]);

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

  const [selectedReport, setSelectedReport] =
    useState<CampaignReportData | null>(null);

  const [loadingReport, setLoadingReport] = useState(false);

  async function loadCampaigns(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      }

      setError(null);

      const result = await window.appAPI.listCampaignHistory();

      setCampaigns(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load campaign history.',
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  async function loadImagePreviews(details: CampaignDetails) {
    const media = details.messages
      .map((message) => message.media)
      .filter((item): item is CampaignMedia =>
        Boolean(item?.mimeType?.startsWith('image/')),
      );

    const previews: Record<string, string> = {};

    await Promise.all(
      media.map(async (item) => {
        try {
          const preview = await window.appAPI.getCampaignMediaPreview(item.id);

          previews[item.id] = preview.dataUrl;
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

      setSelectedReport(null);

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

  async function viewReport(campaignId: string) {
    try {
      setLoadingReport(true);

      setError(null);

      setSelectedCampaign(null);

      const report = await window.appAPI.getCampaignReport(campaignId);

      setSelectedReport(report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load campaign report.',
      );
    } finally {
      setLoadingReport(false);
    }
  }

  async function retryCampaign(campaign: HistoryCampaign) {
    const confirmed = await confirm({
      title: 'Retry this campaign?',
      message: `Retry failed or uncertain work for "${campaign.name}"?\n\nMessages recorded as sent will not be resent. An uncertain message may already have been submitted, so retrying it could send it twice.`,
      confirmLabel: 'Retry messages',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(campaign.id);

      setError(null);

      await window.appAPI.retryFailedCampaign(campaign.id);

      setSelectedReport(null);

      setSelectedCampaign(null);

      setSuccess('Retryable work was returned to the queue.');

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to retry campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const range = historyRange(period, selectedDate);
  const filteredCampaigns = campaigns.filter((campaign) => {
    const timestamp = Date.parse(campaign.completedAt ?? campaign.updatedAt);
    return timestamp >= range.start && timestamp < range.end;
  });

  async function removeExpiredHistory() {
    if (
      !(await confirm({
        title: 'Remove history older than 90 days?',
        message:
          'Permanently delete completed, failed, and cancelled campaigns older than 90 days, including their reports and attachments? Drafts and active campaigns will be kept.',
        confirmLabel: 'Remove old history',
        tone: 'danger',
      }))
    )
      return;
    try {
      setCleaning(true);
      setError(null);
      const result = await window.appAPI.removeExpiredCampaignHistory();
      setSelectedCampaign(null);
      setSelectedReport(null);
      setSuccess(`Removed ${result.deletedCount} expired campaigns.`);
      await loadCampaigns(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to remove expired history.',
      );
    } finally {
      setCleaning(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Results & history"
        description="See how your campaigns performed. Open a report for message details, export results, or retry failed messages."
      />
      <div className="mb-6 rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">
            View
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as HistoryPeriod)
              }
              className="ml-3 rounded-lg border px-3 py-2"
            >
              <option value="all">Last 90 days</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </label>
          {period !== 'all' && (
            <label className="text-sm font-semibold">
              Date
              <input
                type="date"
                value={selectedDate}
                min={colomboDate(new Date(Date.now() - 90 * 86_400_000))}
                max={colomboDate()}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="ml-3 rounded-lg border px-3 py-2"
              />
            </label>
          )}
          <button
            type="button"
            disabled={cleaning || loading || refreshing}
            onClick={() => void removeExpiredHistory()}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
          >
            <Trash2 size={16} />
            {cleaning ? 'Removing…' : 'Remove history older than 90 days'}
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Calendar periods use Asia/Colombo time; weeks start Monday. All views
          show only the last 90 days, with 10 records per page. Cleanup is
          manual and preserves drafts and active campaigns.
        </p>
      </div>

      {error && (
        <InlineNotice message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Loading history...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={History}
          title="No history in this period"
          description="Choose another date or view to see completed, failed, and cancelled campaigns from the last 90 days."
        />
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
              <div>
                <h3 className="font-semibold">Campaign History</h3>

                <p className="mt-1 text-sm text-slate-500">
                  View campaign content or open a detailed execution report.
                </p>
              </div>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => void loadCampaigns(true)}
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
              <PaginatedTable
                key={`${period}-${selectedDate}`}
                className="min-w-full text-left text-sm"
              >
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>

                    <th className="px-5 py-3">Status</th>

                    <th className="px-5 py-3">Success</th>

                    <th className="px-5 py-3">Failed</th>

                    <th className="px-5 py-3">Not Contactable</th>

                    <th className="px-5 py-3">Completed</th>

                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td className="min-w-64 px-5 py-4">
                        <p className="font-semibold">{campaign.name}</p>

                        <p className="mt-1 text-xs text-slate-500">
                          {campaign.totalRecipients} recipients
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            campaign.status,
                          )}`}
                        >
                          {campaign.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium text-emerald-700">
                        {campaign.successCount}
                      </td>

                      <td className="px-5 py-4 font-medium text-red-700">
                        {campaign.failureCount}
                      </td>

                      <td className="px-5 py-4 font-medium text-amber-700">
                        {campaign.notContactable}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDateTime(campaign.completedAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void viewCampaign(campaign.id)}
                            className="rounded-lg border p-2"
                            title="View Campaign"
                          >
                            <Eye size={16} />
                            <span className="action-label">View Campaign</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => void viewReport(campaign.id)}
                            className="rounded-lg border border-blue-200 p-2 text-blue-700"
                            title="Campaign Report"
                          >
                            <BarChart3 size={16} />
                            <span className="action-label">
                              Campaign Report
                            </span>
                          </button>

                          {(campaign.failureCount > 0 ||
                            campaign.uncertainCount > 0 ||
                            campaign.status === 'failed') && (
                            <button
                              type="button"
                              disabled={busyId === campaign.id}
                              onClick={() => void retryCampaign(campaign)}
                              className="rounded-lg border border-amber-200 p-2 text-amber-700 disabled:opacity-50"
                              title="Retry failed / uncertain work"
                            >
                              <RotateCcw size={16} />
                              <span className="action-label">
                                Retry failed / uncertain work
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PaginatedTable>
            </div>
          </section>

          {loadingReport && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading campaign report...
            </div>
          )}

          {selectedReport && !loadingReport && (
            <CampaignReportPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
            />
          )}

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
    </>
  );
}
