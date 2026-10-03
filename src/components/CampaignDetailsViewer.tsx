import { PaginatedTable } from './PaginatedTable';
import { FileText, Image as ImageIcon, Paperclip, Type, X } from 'lucide-react';

import { useState } from 'react';

export type CampaignMedia = {
  id: string;

  originalFilename: string;

  mimeType: string | null;

  fileSize: number | null;
};

export type CampaignMessageDetails = {
  id: string;

  position: number;

  type: string;

  textContent: string | null;

  caption: string | null;

  media: CampaignMedia | null;
};

export type CampaignRecipientDetails = {
  id: string;

  name: string | null;

  normalizedPhone: string;

  originalPhone: string | null;

  status: string;
};

export type CampaignDetails = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  importId: string | null;

  importFilename: string | null;

  createdAt: string;

  updatedAt: string;

  totalRecipients: number;

  eligibleRecipients: number;

  processedCount: number;

  successCount: number;

  failureCount: number;

  messages: CampaignMessageDetails[];

  recipients: CampaignRecipientDetails[];
};

type DetailsTab = 'preview' | 'messages' | 'recipients';

type Props = {
  campaign: CampaignDetails;

  mediaPreviews: Record<string, string>;

  onClose: () => void;

  onEdit?: () => void;
};

function getStatusLabel(status: string) {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'Draft';

    case 'scheduled':
      return 'Scheduled';

    case 'queued':
      return 'Queued';

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

    case 'pending':
      return 'Pending';

    case 'sent':
      return 'Sent';

    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case 'scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'queued':
      return 'border-violet-200 bg-violet-50 text-violet-700';

    case 'running':

    case 'completed':

    case 'sent':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'paused':

    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'failed':

    case 'cancelled':
      return 'border-red-200 bg-red-50 text-red-700';

    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

function getMessageLabel(type: string) {
  switch (type) {
    case 'text':
      return 'Text Message';

    case 'image':
      return 'Image';

    case 'image-caption':
      return 'Image + Caption';

    case 'document':
      return 'Document';

    case 'document-caption':
      return 'Document + Caption';

    default:
      return type;
  }
}

function getMessageIcon(type: string) {
  if (type === 'text') {
    return Type;
  }

  if (type === 'image' || type === 'image-caption') {
    return ImageIcon;
  }

  return FileText;
}

function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return 'Unknown size';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

export function CampaignDetailsViewer({
  campaign,
  mediaPreviews,
  onClose,
  onEdit,
}: Props) {
  const [tab, setTab] = useState<DetailsTab>('preview');

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-slate-900">
              {campaign.name}
            </h3>

            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                campaign.status,
              )}`}
            >
              {getStatusLabel(campaign.status)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {campaign.description || 'No description'}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {campaign.totalRecipients} recipients · {campaign.messages.length}{' '}
            messages
          </p>
        </div>

        <div className="flex gap-2">
          {onEdit && campaign.status === 'draft' && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"
            >
              Edit
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 p-2 text-slate-700"
          >
            <X size={17} />
            <span className="action-label">Close</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
        {(
          [
            ['preview', 'Chat Preview'],
            ['messages', 'Messages'],
            ['recipients', 'Recipients'],
          ] as Array<[DetailsTab, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              tab === value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'preview' && (
        <div className="p-6">
          <div className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-lg">
            <div className="bg-emerald-700 px-5 py-4 text-white">
              <p className="font-semibold">{campaign.name}</p>

              <p className="text-xs text-emerald-100">Campaign Preview</p>
            </div>

            <div className="min-h-[500px] space-y-3 bg-[#efeae2] p-4">
              {campaign.messages.map((message) => {
                const imagePreview = message.media
                  ? mediaPreviews[message.media.id]
                  : null;

                const previewTime = new Date(
                  campaign.updatedAt,
                ).toLocaleTimeString([], {
                  hour: '2-digit',

                  minute: '2-digit',
                });

                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-xl bg-[#d9fdd3] p-2 shadow-sm">
                      {message.media?.mimeType?.startsWith('image/') &&
                        (imagePreview ? (
                          <img
                            src={imagePreview}
                            alt={message.media.originalFilename}
                            className="mb-2 max-h-80 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="mb-2 flex h-40 items-center justify-center rounded-lg bg-slate-200">
                            <ImageIcon className="text-slate-500" size={30} />
                          </div>
                        ))}

                      {message.media &&
                        !message.media.mimeType?.startsWith('image/') && (
                          <div className="mb-2 flex items-center gap-3 rounded-lg bg-white/70 p-3">
                            <FileText
                              className="shrink-0 text-slate-600"
                              size={24}
                            />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {message.media.originalFilename}
                              </p>

                              <p className="text-xs text-slate-500">
                                {formatFileSize(message.media.fileSize)}
                              </p>
                            </div>
                          </div>
                        )}

                      {message.textContent && (
                        <p className="whitespace-pre-wrap px-1 text-sm leading-6 text-slate-900">
                          {message.textContent}
                        </p>
                      )}

                      {message.caption && (
                        <p className="whitespace-pre-wrap px-1 text-sm leading-6 text-slate-900">
                          {message.caption}
                        </p>
                      )}

                      <div className="mt-1 flex justify-end">
                        <span className="text-[10px] text-slate-500">
                          {previewTime}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="space-y-4 p-6">
          {campaign.messages.map((message) => {
            const Icon = getMessageIcon(message.type);

            return (
              <div key={message.id} className="rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-emerald-700" />

                  <div>
                    <p className="font-semibold">Message {message.position}</p>

                    <p className="text-xs text-slate-500">
                      {getMessageLabel(message.type)}
                    </p>
                  </div>
                </div>

                {message.textContent && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
                    {message.textContent}
                  </p>
                )}

                {message.media && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <Paperclip size={17} />

                    <div>
                      <p className="text-sm font-semibold">
                        {message.media.originalFilename}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatFileSize(message.media.fileSize)}
                      </p>
                    </div>
                  </div>
                )}

                {message.caption && (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6">
                    {message.caption}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'recipients' && (
        <div className="p-6">
          <div className="max-h-[500px] overflow-auto rounded-xl border">
            <PaginatedTable className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-5 py-3">Name</th>

                  <th className="px-5 py-3">WhatsApp</th>

                  <th className="px-5 py-3">Original</th>

                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {campaign.recipients.map((recipient) => (
                  <tr key={recipient.id}>
                    <td className="px-5 py-3">{recipient.name || '—'}</td>

                    <td className="px-5 py-3">{recipient.normalizedPhone}</td>

                    <td className="px-5 py-3">
                      {recipient.originalPhone || '—'}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${getStatusClass(
                          recipient.status,
                        )}`}
                      >
                        {getStatusLabel(recipient.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PaginatedTable>
          </div>
        </div>
      )}
    </section>
  );
}
