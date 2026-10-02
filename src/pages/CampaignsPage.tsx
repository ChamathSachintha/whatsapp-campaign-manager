import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  Edit3,
  Eye,
  Loader2,
  Megaphone,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
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

type MessageType =
  | 'text'
  | 'image'
  | 'image-caption'
  | 'document'
  | 'document-caption';

type SavedCampaign = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  importId: string | null;

  createdAt: string;

  updatedAt: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

type NewAttachment = {
  filePath: string;

  fileName: string;

  extension: string;

  sizeBytes: number;
};

type EditMessage = {
  clientId: string;

  type: MessageType;

  text: string;

  caption: string;

  existingMedia: CampaignMedia | null;

  newAttachment: NewAttachment | null;
};

type EditCampaignState = {
  id: string;

  name: string;

  description: string;

  messages: EditMessage[];
};

type DeliveryMode = 'now' | 'scheduled';

const messageOptions: Array<{
  type: MessageType;

  label: string;
}> = [
  {
    type: 'text',
    label: 'Text',
  },

  {
    type: 'image',
    label: 'Image',
  },

  {
    type: 'image-caption',
    label: 'Image + Caption',
  },

  {
    type: 'document',
    label: 'Document',
  },

  {
    type: 'document-caption',
    label: 'Document + Caption',
  },
];

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
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'paused':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'failed':
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

function getAttachmentType(type: MessageType): 'image' | 'document' | null {
  if (type === 'image' || type === 'image-caption') {
    return 'image';
  }

  if (type === 'document' || type === 'document-caption') {
    return 'document';
  }

  return null;
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

function createEditMessage(type: MessageType): EditMessage {
  return {
    clientId: crypto.randomUUID(),

    type,

    text: '',

    caption: '',

    existingMedia: null,

    newAttachment: null,
  };
}

function isEditMessageComplete(message: EditMessage) {
  if (message.type === 'text') {
    return Boolean(message.text.trim());
  }

  if (!message.existingMedia && !message.newAttachment) {
    return false;
  }

  if (message.type === 'image-caption' || message.type === 'document-caption') {
    return Boolean(message.caption.trim());
  }

  return true;
}

function getDefaultScheduleValue() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',

    year: 'numeric',

    month: '2-digit',

    day: '2-digit',

    hour: '2-digit',

    minute: '2-digit',

    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date(Date.now() + 10 * 60_000));

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function isFutureColomboDateTime(value: string) {
  if (!value) {
    return false;
  }

  const timestamp = Date.parse(`${value}:00+05:30`);

  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignDetails | null>(null);

  const [loadingDetails, setLoadingDetails] = useState(false);

  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>(
    {},
  );

  const [editCampaign, setEditCampaign] = useState<EditCampaignState | null>(
    null,
  );

  const [savingEdit, setSavingEdit] = useState(false);

  const [selectingAttachment, setSelectingAttachment] = useState<string | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;

    name: string;
  } | null>(null);

  const [deleting, setDeleting] = useState(false);

  const [deliveryTarget, setDeliveryTarget] = useState<{
    id: string;

    name: string;
  } | null>(null);

  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('now');

  const [scheduledLocalDateTime, setScheduledLocalDateTime] = useState(
    getDefaultScheduleValue(),
  );

  const [savingDelivery, setSavingDelivery] = useState(false);

  async function loadCampaigns(manualRefresh = false) {
    try {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result = await window.appAPI.listSavedCampaigns();

      setCampaigns(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load campaigns.',
      );
    } finally {
      setLoading(false);

      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  async function getDetails(campaignId: string) {
    return window.appAPI.getSavedCampaignDetails(campaignId);
  }

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

      const details = await getDetails(campaignId);

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

  async function openEdit(campaignId: string) {
    try {
      setLoadingDetails(true);

      setError(null);

      const details = await getDetails(campaignId);

      if (details.status !== 'draft') {
        throw new Error('Only draft campaigns can be edited.');
      }

      setSelectedCampaign(details);

      setEditCampaign({
        id: details.id,

        name: details.name,

        description: details.description ?? '',

        messages: details.messages.map((message) => ({
          clientId: crypto.randomUUID(),

          type: message.type as MessageType,

          text: message.textContent ?? '',

          caption: message.caption ?? '',

          existingMedia: message.media,

          newAttachment: null,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to edit campaign.');
    } finally {
      setLoadingDetails(false);
    }
  }

  function addEditMessage(type: MessageType) {
    setEditCampaign((current) =>
      current
        ? {
            ...current,

            messages: [
              ...current.messages,

              createEditMessage(type),
            ],
          }
        : current,
    );
  }

  function removeEditMessage(clientId: string) {
    setEditCampaign((current) =>
      current
        ? {
            ...current,

            messages: current.messages.filter(
              (message) => message.clientId !== clientId,
            ),
          }
        : current,
    );
  }

  function moveEditMessage(index: number, direction: 'up' | 'down') {
    setEditCampaign((current) => {
      if (!current) {
        return current;
      }

      const target = direction === 'up' ? index - 1 : index + 1;

      if (target < 0 || target >= current.messages.length) {
        return current;
      }

      const messages = [...current.messages];

      [messages[index], messages[target]] = [messages[target], messages[index]];

      return {
        ...current,

        messages,
      };
    });
  }

  function updateEditMessage(clientId: string, changes: Partial<EditMessage>) {
    setEditCampaign((current) =>
      current
        ? {
            ...current,

            messages: current.messages.map((message) =>
              message.clientId === clientId
                ? {
                    ...message,

                    ...changes,
                  }
                : message,
            ),
          }
        : current,
    );
  }

  async function chooseEditAttachment(message: EditMessage) {
    const type = getAttachmentType(message.type);

    if (!type) {
      return;
    }

    try {
      setSelectingAttachment(message.clientId);

      const result = await window.appAPI.chooseCampaignAttachment(type);

      if (result.canceled) {
        return;
      }

      updateEditMessage(message.clientId, {
        newAttachment: {
          filePath: result.filePath,

          fileName: result.fileName,

          extension: result.extension,

          sizeBytes: result.sizeBytes,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to select attachment.',
      );
    } finally {
      setSelectingAttachment(null);
    }
  }

  const editReady = Boolean(
    editCampaign &&
    editCampaign.name.trim() &&
    editCampaign.messages.length > 0 &&
    editCampaign.messages.every(isEditMessageComplete),
  );

  async function saveEdit() {
    if (!editCampaign || !editReady) {
      return;
    }

    try {
      setSavingEdit(true);

      setError(null);

      await window.appAPI.updateCampaignDraft({
        campaignId: editCampaign.id,

        name: editCampaign.name,

        description: editCampaign.description || null,

        messages: editCampaign.messages.map((message) => ({
          type: message.type,

          text: message.text || null,

          caption: message.caption || null,

          existingMediaAssetId: message.newAttachment
            ? null
            : (message.existingMedia?.id ?? null),

          filePath: message.newAttachment?.filePath ?? null,

          fileName: message.newAttachment?.fileName ?? null,

          fileExtension: message.newAttachment?.extension ?? null,

          fileSizeBytes: message.newAttachment?.sizeBytes ?? null,
        })),
      });

      const campaignId = editCampaign.id;

      setEditCampaign(null);

      setSuccess('Campaign draft updated successfully.');

      await loadCampaigns();

      await viewCampaign(campaignId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update campaign.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);

      setError(null);

      await window.appAPI.deleteCampaign(deleteTarget.id);

      if (selectedCampaign?.id === deleteTarget.id) {
        setSelectedCampaign(null);
      }

      setEditCampaign(null);

      setDeleteTarget(null);

      setSuccess('Campaign draft deleted.');

      await loadCampaigns();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to delete campaign.',
      );
    } finally {
      setDeleting(false);
    }
  }

  function openDelivery(campaign: SavedCampaign) {
    setDeliveryTarget({
      id: campaign.id,

      name: campaign.name,
    });

    setDeliveryMode('now');

    setScheduledLocalDateTime(getDefaultScheduleValue());

    setError(null);
  }

  const scheduleTimeValid = useMemo(
    () => isFutureColomboDateTime(scheduledLocalDateTime),
    [scheduledLocalDateTime],
  );

  async function confirmDelivery() {
    if (!deliveryTarget) {
      return;
    }

    if (deliveryMode === 'scheduled' && !scheduleTimeValid) {
      setError('Choose a future date and time in Asia/Colombo.');

      return;
    }

    try {
      setSavingDelivery(true);

      setError(null);

      if (deliveryMode === 'now') {
        await window.appAPI.queueCampaignNow(deliveryTarget.id);

        setSuccess(
          'Campaign is queued for the WhatsApp sender. No messages have been sent yet.',
        );
      } else {
        await window.appAPI.scheduleCampaign({
          campaignId: deliveryTarget.id,

          scheduledLocalDateTime,
        });

        setSuccess('Campaign scheduled successfully.');
      }

      const campaignId = deliveryTarget.id;

      setDeliveryTarget(null);

      await loadCampaigns();

      if (selectedCampaign?.id === campaignId) {
        await viewCampaign(campaignId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to configure campaign delivery.',
      );
    } finally {
      setSavingDelivery(false);
    }
  }

  const draftCount = campaigns.filter(
    (campaign) => campaign.status === 'draft',
  ).length;

  const totalRecipients = campaigns.reduce(
    (total, campaign) => total + campaign.recipientCount,
    0,
  );

  const totalMessages = campaigns.reduce(
    (total, campaign) => total + campaign.messageCount,
    0,
  );

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Create, preview, edit and prepare campaign drafts for delivery."
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
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          <Loader2 className="animate-spin" size={19} />
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create and save your first campaign draft."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Campaigns
              </p>

              <p className="mt-2 text-2xl font-bold">{campaigns.length}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Drafts
              </p>

              <p className="mt-2 text-2xl font-bold">{draftCount}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Recipients
              </p>

              <p className="mt-2 text-2xl font-bold">{totalRecipients}</p>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Messages
              </p>

              <p className="mt-2 text-2xl font-bold">{totalMessages}</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
              <div>
                <h3 className="font-semibold">Saved Campaigns</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Drafts can be edited, deleted or prepared for delivery.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadCampaigns(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
              >
                <RefreshCw
                  className={refreshing ? 'animate-spin' : ''}
                  size={16}
                />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3">Campaign</th>

                    <th className="px-5 py-3">Status</th>

                    <th className="px-5 py-3">Recipients</th>

                    <th className="px-5 py-3">Messages</th>

                    <th className="px-5 py-3">Media</th>

                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
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
                          {getStatusLabel(campaign.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">{campaign.recipientCount}</td>

                      <td className="px-5 py-4">{campaign.messageCount}</td>

                      <td className="px-5 py-4">{campaign.mediaCount}</td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void viewCampaign(campaign.id)}
                            className="rounded-lg border border-slate-300 p-2 text-slate-700"
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          {campaign.status === 'draft' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void openEdit(campaign.id)}
                                className="rounded-lg border border-blue-200 p-2 text-blue-700"
                                title="Edit"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openDelivery(campaign)}
                                className="rounded-lg border border-emerald-200 p-2 text-emerald-700"
                                title="Delivery"
                              >
                                <Send size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: campaign.id,

                                    name: campaign.name,
                                  })
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-600"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
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

          {selectedCampaign && !loadingDetails && !editCampaign && (
            <CampaignDetailsViewer
              key={`${selectedCampaign.id}-${selectedCampaign.updatedAt}`}
              campaign={selectedCampaign}
              mediaPreviews={mediaPreviews}
              onClose={() => setSelectedCampaign(null)}
              onEdit={
                selectedCampaign.status === 'draft'
                  ? () => void openEdit(selectedCampaign.id)
                  : undefined
              }
            />
          )}

          {editCampaign && (
            <section className="mt-6 rounded-2xl border border-blue-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b p-6">
                <div>
                  <h3 className="text-lg font-semibold">Edit Campaign</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Edit content and move messages to change their sending
                    order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditCampaign(null)}
                  className="rounded-lg border p-2"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">
                      Campaign Name
                    </label>

                    <input
                      value={editCampaign.name}
                      onChange={(event) =>
                        setEditCampaign({
                          ...editCampaign,

                          name: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Description</label>

                    <input
                      value={editCampaign.description}
                      onChange={(event) =>
                        setEditCampaign({
                          ...editCampaign,

                          description: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border px-4 py-3"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Add Message</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {messageOptions.map((option) => (
                      <button
                        key={option.type}
                        type="button"
                        onClick={() => addEditMessage(option.type)}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      >
                        <Plus size={15} />

                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {editCampaign.messages.map((message, index) => {
                    const attachmentType = getAttachmentType(message.type);

                    const attachment = message.newAttachment;

                    return (
                      <div
                        key={message.clientId}
                        className="rounded-xl border bg-slate-50"
                      >
                        <div className="flex items-center justify-between border-b bg-white p-4">
                          <div>
                            <p className="font-semibold">Message {index + 1}</p>

                            <p className="text-xs text-slate-500">
                              {getMessageLabel(message.type)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveEditMessage(index, 'up')}
                              className="rounded-lg border p-2 disabled:opacity-30"
                            >
                              <ArrowUp size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={
                                index === editCampaign.messages.length - 1
                              }
                              onClick={() => moveEditMessage(index, 'down')}
                              className="rounded-lg border p-2 disabled:opacity-30"
                            >
                              <ArrowDown size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeEditMessage(message.clientId)
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 p-4">
                          {message.type === 'text' && (
                            <textarea
                              rows={4}
                              value={message.text}
                              onChange={(event) =>
                                updateEditMessage(message.clientId, {
                                  text: event.target.value,
                                })
                              }
                              placeholder="Message text"
                              className="w-full rounded-xl border bg-white p-3"
                            />
                          )}

                          {attachmentType && (
                            <div className="rounded-xl border border-dashed bg-white p-4">
                              {attachment ? (
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="font-semibold">
                                      {attachment.fileName}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {formatFileSize(attachment.sizeBytes)}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateEditMessage(message.clientId, {
                                        newAttachment: null,

                                        existingMedia: null,
                                      })
                                    }
                                    className="rounded-lg p-2 text-red-600"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : message.existingMedia ? (
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="font-semibold">
                                      {message.existingMedia.originalFilename}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      Existing attachment
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateEditMessage(message.clientId, {
                                        existingMedia: null,
                                      })
                                    }
                                    className="rounded-lg p-2 text-red-600"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-amber-700">
                                  No attachment selected.
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  void chooseEditAttachment(message)
                                }
                                disabled={
                                  selectingAttachment === message.clientId
                                }
                                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                              >
                                {selectingAttachment === message.clientId ? (
                                  <Loader2 className="animate-spin" size={15} />
                                ) : (
                                  <Paperclip size={15} />
                                )}

                                {message.existingMedia || message.newAttachment
                                  ? 'Replace File'
                                  : 'Choose File'}
                              </button>
                            </div>
                          )}

                          {(message.type === 'image-caption' ||
                            message.type === 'document-caption') && (
                            <textarea
                              rows={3}
                              value={message.caption}
                              onChange={(event) =>
                                updateEditMessage(message.clientId, {
                                  caption: event.target.value,
                                })
                              }
                              placeholder="Caption"
                              className="w-full rounded-xl border bg-white p-3"
                            />
                          )}

                          {!isEditMessageComplete(message) && (
                            <p className="text-xs text-amber-600">
                              Complete this message before saving.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCampaign(null)}
                    className="rounded-xl border px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void saveEdit()}
                    disabled={!editReady || savingEdit}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Save size={17} />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {deliveryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b p-6">
              <h3 className="text-lg font-semibold">Delivery Setup</h3>

              <p className="mt-2 text-sm text-slate-500">
                Prepare <strong>{deliveryTarget.name}</strong> for the WhatsApp
                sender.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="radio"
                  checked={deliveryMode === 'now'}
                  onChange={() => setDeliveryMode('now')}
                />

                <div>
                  <p className="font-semibold">Send Now</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Move this campaign to Queued. No WhatsApp messages are sent
                    yet.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border p-4">
                <input
                  type="radio"
                  checked={deliveryMode === 'scheduled'}
                  onChange={() => setDeliveryMode('scheduled')}
                />

                <div className="w-full">
                  <p className="font-semibold">Schedule Later</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Automatically move to Queued when this time arrives.
                  </p>

                  {deliveryMode === 'scheduled' && (
                    <div className="mt-4">
                      <label className="text-xs font-semibold uppercase text-slate-500">
                        Date & Time
                      </label>

                      <div className="mt-2 flex items-center gap-2">
                        <Calendar size={17} className="text-slate-500" />

                        <input
                          type="datetime-local"
                          value={scheduledLocalDateTime}
                          onChange={(event) =>
                            setScheduledLocalDateTime(event.target.value)
                          }
                          className="w-full rounded-xl border px-3 py-2.5"
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Timezone: Asia/Colombo (UTC+05:30)
                      </p>

                      {!scheduleTimeValid && (
                        <p className="mt-2 text-xs text-red-600">
                          Choose a future date and time.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-6">
              <button
                type="button"
                disabled={savingDelivery}
                onClick={() => setDeliveryTarget(null)}
                className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  savingDelivery ||
                  (deliveryMode === 'scheduled' && !scheduleTimeValid)
                }
                onClick={() => void confirmDelivery()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {savingDelivery ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b p-6">
              <h3 className="text-lg font-semibold">Delete Campaign?</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                This permanently removes the draft, messages, recipients and
                stored media.
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-xl bg-slate-50 p-4 font-semibold">
                {deleteTarget.name}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void confirmDelete()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Delete Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
