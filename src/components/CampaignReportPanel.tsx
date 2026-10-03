import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  X,
} from 'lucide-react';

import { useState } from 'react';

export type CampaignReportData = Awaited<
  ReturnType<typeof window.appAPI.getCampaignReport>
>;

type ExportKind = 'summary' | 'details';

type Props = {
  report: CampaignReportData;

  onClose: () => void;
};

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

function statusClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case 'success':

    case 'sent':

    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'failed':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'not_contactable':

    case 'skipped':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'unknown':
      return 'border-violet-200 bg-violet-50 text-violet-700';

    case 'cancelled':
      return 'border-slate-300 bg-slate-100 text-slate-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function statusLabel(status: string | null) {
  if (!status) {
    return 'Not started';
  }

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function messageLabel(type: string | null) {
  switch (type) {
    case 'text':
      return 'Text';

    case 'image':
      return 'Image';

    case 'image-caption':
      return 'Image + Caption';

    case 'document':
      return 'Document';

    case 'document-caption':
      return 'Document + Caption';

    default:
      return type ?? '—';
  }
}

export function CampaignReportPanel({ report, onClose }: Props) {
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const [exportError, setExportError] = useState<string | null>(null);

  async function exportCsv(kind: ExportKind) {
    try {
      setExporting(kind);

      setExportError(null);

      setExportMessage(null);

      const result = await window.appAPI.exportCampaignReportCsv({
        campaignId: report.summary.id,

        kind,
      });

      if (!result.canceled) {
        setExportMessage(`Saved ${result.fileName}.`);
      }
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'Unable to export campaign report.',
      );
    } finally {
      setExporting(null);
    }
  }

  const summary = report.summary;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900">
              Campaign Report
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                summary.status,
              )}`}
            >
              {statusLabel(summary.status)}
            </span>
          </div>

          <p className="mt-2 text-lg font-semibold text-slate-800">
            {summary.name}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {summary.description || 'No description'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void exportCsv('summary')}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 disabled:opacity-50"
          >
            {exporting === 'summary' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            Summary CSV
          </button>

          <button
            type="button"
            disabled={exporting !== null}
            onClick={() => void exportCsv('details')}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 disabled:opacity-50"
          >
            {exporting === 'details' ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            Detailed CSV
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 p-2.5 text-slate-600"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {exportError}
        </div>
      )}

      {exportMessage && (
        <div className="mx-6 mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {exportMessage}
        </div>
      )}

      {summary.uncertainCount > 0 && (
        <div className="mx-6 mt-5 flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Uncertain delivery state</p>

            <p className="mt-1">
              {summary.uncertainCount} message attempt(s) have an uncertain
              delivery state, usually because the app stopped while a send was
              in progress.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Total
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalRecipients}
          </p>
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Processed
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.processedCount}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase text-emerald-600">
            Successful
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {summary.successCount}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase text-red-600">Failed</p>

          <p className="mt-2 text-2xl font-bold text-red-700">
            {summary.failureCount}
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase text-amber-600">
            Not Contactable
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-700">
            {summary.notContactable}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase text-blue-600">
            Success Rate
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-700">
            {summary.successRate}%
          </p>
        </div>
      </div>

      <div className="border-y border-slate-200 bg-slate-50/60 p-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Created
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDateTime(summary.createdAt)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Scheduled
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDateTime(summary.scheduledAt)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Started
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDateTime(summary.startedAt)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Completed
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {formatDateTime(summary.completedAt)}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Send Mode
            </p>

            <p className="mt-1 text-sm font-medium capitalize text-slate-700">
              {summary.sendMode}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">
              Timezone
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
              {summary.timezone}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-lg font-semibold text-slate-900">
          Recipient Results
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Recipient-level execution results and errors.
        </p>

        <div className="mt-4 max-h-[440px] overflow-auto rounded-xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Name</th>

                <th className="px-4 py-3">WhatsApp</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3">Messages</th>

                <th className="px-4 py-3">Started</th>

                <th className="px-4 py-3">Completed</th>

                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {report.recipients.map((recipient) => (
                <tr key={recipient.id}>
                  <td className="px-4 py-3">{recipient.name || '—'}</td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {recipient.normalizedPhone}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(
                        recipient.status,
                      )}`}
                    >
                      {statusLabel(recipient.status)}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    <span className="text-emerald-700">
                      {recipient.sentCount} sent
                    </span>

                    {' · '}

                    <span className="text-red-700">
                      {recipient.failedCount} failed
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(recipient.startedAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(recipient.completedAt)}
                  </td>

                  <td className="max-w-xs px-4 py-3">
                    {recipient.lastErrorMessage ? (
                      <div>
                        <p className="text-xs font-semibold text-red-700">
                          {recipient.lastErrorCode || 'Error'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {recipient.lastErrorMessage}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t p-6">
        <h4 className="text-lg font-semibold text-slate-900">
          Message Delivery Results
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Each message attempt for each campaign recipient.
        </p>

        <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border">
          <table className="min-w-[1300px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="px-4 py-3">Recipient</th>

                <th className="px-4 py-3">Message</th>

                <th className="px-4 py-3">Type</th>

                <th className="px-4 py-3">Status</th>

                <th className="px-4 py-3">Attempts</th>

                <th className="px-4 py-3">Started</th>

                <th className="px-4 py-3">Sent</th>

                <th className="px-4 py-3">Finished</th>

                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {report.deliveries.map((delivery, index) => (
                <tr
                  key={
                    delivery.deliveryId ?? `${delivery.recipientId}-${index}`
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {delivery.recipientName || '—'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {delivery.normalizedPhone}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {delivery.messagePosition === null
                      ? '—'
                      : `#${delivery.messagePosition}`}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {messageLabel(delivery.messageType)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(
                        delivery.deliveryStatus,
                      )}`}
                    >
                      {statusLabel(delivery.deliveryStatus)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {delivery.attemptCount}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(delivery.deliveryStartedAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(delivery.sentAt)}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDateTime(delivery.finishedAt)}
                  </td>

                  <td className="max-w-xs px-4 py-3">
                    {delivery.deliveryErrorMessage ? (
                      <div>
                        <p className="text-xs font-semibold text-red-700">
                          {delivery.deliveryErrorCode || 'Error'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {delivery.deliveryErrorMessage}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
          A successful sender result means the campaign engine successfully
          submitted the message through WhatsApp Web. It does not represent a
          WhatsApp delivered or read receipt.
        </div>
      </div>
    </section>
  );
}
