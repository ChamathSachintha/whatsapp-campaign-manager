import {
  Eye,
  FileText,
  Loader2,
  Megaphone,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  EmptyState,
} from '../components/EmptyState';

import {
  PageHeader,
} from '../components/PageHeader';

/* =========================================================
   TYPES
   ========================================================= */

type SavedCampaign = {
  id: string;

  name: string;

  description:
    | string
    | null;

  status: string;

  importId:
    | string
    | null;

  createdAt: string;

  updatedAt: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

/* =========================================================
   HELPERS
   ========================================================= */

function getStatusLabel(
  status: string,
) {
  switch (
    status.toLowerCase()
  ) {
    case 'draft':
      return 'Draft';

    case 'scheduled':
      return 'Scheduled';

    case 'running':
      return 'Running';

    case 'paused':
      return 'Paused';

    case 'completed':
      return 'Completed';

    case 'failed':
      return 'Failed';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
}

function getStatusClass(
  status: string,
) {
  switch (
    status.toLowerCase()
  ) {
    case 'draft':
      return 'border-slate-200 bg-slate-100 text-slate-700';

    case 'scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'running':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'paused':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';

    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

/* =========================================================
   COMPONENT
   ========================================================= */

export function CampaignsPage() {
  const [
    campaigns,
    setCampaigns,
  ] =
    useState<
      SavedCampaign[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    selectedCampaign,
    setSelectedCampaign,
  ] =
    useState<
      SavedCampaign | null
    >(null);

  /* =========================================================
     LOAD CAMPAIGNS
     ========================================================= */

  async function loadCampaigns(
    manualRefresh = false,
  ) {
    try {
      if (
        manualRefresh
      ) {
        setRefreshing(
          true,
        );
      } else {
        setLoading(
          true,
        );
      }

      setError(
        null,
      );

      const result =
        await window
          .appAPI
          .listSavedCampaigns();

      setCampaigns(
        result,
      );

      /*
       * Keep the selected campaign
       * synchronized with fresh data.
       */
      setSelectedCampaign(
        (current) => {
          if (!current) {
            return null;
          }

          return (
            result.find(
              (campaign) =>
                campaign.id ===
                current.id,
            ) ?? null
          );
        },
      );
    } catch (err) {
      console.error(
        err,
      );

      setError(
        err instanceof
          Error
          ? err.message
          : 'Unable to load campaigns.',
      );
    } finally {
      setLoading(
        false,
      );

      setRefreshing(
        false,
      );
    }
  }

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    void loadCampaigns();
  }, []);

  /* =========================================================
     TOTALS
     ========================================================= */

  const draftCount =
    campaigns.filter(
      (campaign) =>
        campaign.status ===
        'draft',
    ).length;

  const totalRecipients =
    campaigns.reduce(
      (
        total,
        campaign,
      ) =>
        total +
        campaign.recipientCount,
      0,
    );

  const totalMessages =
    campaigns.reduce(
      (
        total,
        campaign,
      ) =>
        total +
        campaign.messageCount,
      0,
    );

  /* =========================================================
     UI
     ========================================================= */

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="View drafts, active campaigns, paused campaigns, and results."
      />

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          LOADING
          ===================================================== */}

      {loading ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          <Loader2
            className="animate-spin"
            size={19}
          />

          Loading campaigns...
        </div>
      ) : campaigns.length ===
        0 ? (
        /* ===================================================
           EMPTY
           =================================================== */

        <EmptyState
          icon={
            Megaphone
          }
          title="No campaigns yet"
          description="Create and save your first campaign draft. It will appear here automatically."
        />
      ) : (
        <>
          {/* =================================================
              OVERVIEW
              ================================================= */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Campaigns
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  campaigns.length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Drafts
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  draftCount
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Saved Recipients
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  totalRecipients
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Messages
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {
                  totalMessages
                }
              </p>
            </div>
          </div>

          {/* =================================================
              CAMPAIGN LIST
              ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* HEADER */}

            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">
                  Saved Campaigns
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Campaign drafts
                  and future campaign
                  activity will appear
                  here.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadCampaigns(
                    true,
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={
                    refreshing
                      ? 'animate-spin'
                      : ''
                  }
                  size={16}
                />

                {refreshing
                  ? 'Refreshing...'
                  : 'Refresh'}
              </button>
            </div>

            {/* TABLE */}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-slate-600">
                      Campaign
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Recipients
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Messages
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Media
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Created
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {campaigns.map(
                    (
                      campaign,
                    ) => (
                      <tr
                        key={
                          campaign.id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        {/* CAMPAIGN */}

                        <td className="min-w-64 px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                              <Megaphone
                                className="text-emerald-700"
                                size={
                                  18
                                }
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {
                                  campaign.name
                                }
                              </p>

                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {campaign.description ||
                                  'No description'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              campaign.status,
                            )}`}
                          >
                            {getStatusLabel(
                              campaign.status,
                            )}
                          </span>
                        </td>

                        {/* RECIPIENTS */}

                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Users
                              size={
                                15
                              }
                            />

                            {
                              campaign.recipientCount
                            }
                          </div>
                        </td>

                        {/* MESSAGES */}

                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <MessageSquare
                              size={
                                15
                              }
                            />

                            {
                              campaign.messageCount
                            }
                          </div>
                        </td>

                        {/* MEDIA */}

                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Paperclip
                              size={
                                15
                              }
                            />

                            {
                              campaign.mediaCount
                            }
                          </div>
                        </td>

                        {/* CREATED */}

                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {new Date(
                            campaign.createdAt,
                          ).toLocaleString()}
                        </td>

                        {/* ACTION */}

                        <td className="whitespace-nowrap px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCampaign(
                                campaign,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye
                              size={
                                15
                              }
                            />

                            View
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* =================================================
              SELECTED CAMPAIGN SUMMARY
              ================================================= */}

          {selectedCampaign && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

              {/* DETAIL HEADER */}

              <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Campaign Summary
                  </p>

                  <h3 className="mt-1 text-lg font-semibold text-slate-900">
                    {
                      selectedCampaign.name
                    }
                  </h3>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    {selectedCampaign.description ||
                      'No description was added to this campaign.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCampaign(
                      null,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <X
                    size={
                      16
                    }
                  />

                  Close
                </button>
              </div>

              {/* DETAILS */}

              <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users
                      size={
                        16
                      }
                    />

                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Recipients
                    </p>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {
                      selectedCampaign.recipientCount
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MessageSquare
                      size={
                        16
                      }
                    />

                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Messages
                    </p>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {
                      selectedCampaign.messageCount
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Paperclip
                      size={
                        16
                      }
                    />

                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Media
                    </p>
                  </div>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {
                      selectedCampaign.mediaCount
                    }
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText
                      size={
                        16
                      }
                    />

                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Status
                    </p>
                  </div>

                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        selectedCampaign.status,
                      )}`}
                    >
                      {getStatusLabel(
                        selectedCampaign.status,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* METADATA */}

              <div className="grid gap-5 border-t border-slate-200 p-6 text-sm md:grid-cols-2">

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Created
                  </p>

                  <p className="mt-2 font-medium text-slate-700">
                    {new Date(
                      selectedCampaign.createdAt,
                    ).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Last Updated
                  </p>

                  <p className="mt-2 font-medium text-slate-700">
                    {new Date(
                      selectedCampaign.updatedAt,
                    ).toLocaleString()}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Campaign ID
                  </p>

                  <p className="mt-2 break-all font-mono text-xs text-slate-600">
                    {
                      selectedCampaign.id
                    }
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}