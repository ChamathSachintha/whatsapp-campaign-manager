import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Type,
  Users,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  PageHeader,
} from '../components/PageHeader';

/* =========================================================
   TYPES
   ========================================================= */

type SavedImportItem = {
  id: string;
  filename: string;
  fileType: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

type SavedImportDetails = {
  id: string;
  filename: string;
  fileType: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;

  contacts: Array<{
    id: string;
    name: string;
    originalPhone: string;
    normalizedPhone:
      | string
      | null;
    validationStatus: string;
    validationReason:
      | string
      | null;
    isDuplicate: boolean;
    rowNumber:
      | number
      | null;
  }>;
};

type MessageType =
  | 'text'
  | 'image'
  | 'image-caption'
  | 'document'
  | 'document-caption';

type CampaignMessage = {
  id: string;
  type: MessageType;
  text: string;
  caption: string;
  fileName: string | null;
};

/* =========================================================
   MESSAGE TYPE CONFIG
   ========================================================= */

const messageTypeOptions: Array<{
  type: MessageType;
  label: string;
  description: string;
}> = [
  {
    type: 'text',
    label: 'Text Message',
    description:
      'Send a normal WhatsApp text message.',
  },
  {
    type: 'image',
    label: 'Image',
    description:
      'Send an image without a caption.',
  },
  {
    type: 'image-caption',
    label: 'Image + Caption',
    description:
      'Send an image with accompanying text.',
  },
  {
    type: 'document',
    label: 'Document',
    description:
      'Send a file or document.',
  },
  {
    type: 'document-caption',
    label: 'Document + Caption',
    description:
      'Send a document with accompanying text.',
  },
];

/* =========================================================
   HELPERS
   ========================================================= */

function createMessage(
  type: MessageType,
): CampaignMessage {
  return {
    id: crypto.randomUUID(),
    type,
    text: '',
    caption: '',
    fileName: null,
  };
}

function getMessageLabel(
  type: MessageType,
) {
  return (
    messageTypeOptions.find(
      (option) =>
        option.type === type,
    )?.label ?? 'Message'
  );
}

function getMessageIcon(
  type: MessageType,
) {
  if (type === 'text') {
    return Type;
  }

  if (
    type === 'image' ||
    type === 'image-caption'
  ) {
    return ImageIcon;
  }

  return FileText;
}

/* =========================================================
   COMPONENT
   ========================================================= */

export function CreateCampaignPage() {
  const [
    campaignName,
    setCampaignName,
  ] =
    useState('');

  const [
    description,
    setDescription,
  ] =
    useState('');

  const [
    savedImports,
    setSavedImports,
  ] =
    useState<
      SavedImportItem[]
    >([]);

  const [
    selectedImportId,
    setSelectedImportId,
  ] =
    useState('');

  const [
    selectedImport,
    setSelectedImport,
  ] =
    useState<
      SavedImportDetails | null
    >(null);

  const [
    loadingImports,
    setLoadingImports,
  ] =
    useState(true);

  const [
    loadingImportDetails,
    setLoadingImportDetails,
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
    messages,
    setMessages,
  ] =
    useState<
      CampaignMessage[]
    >([]);

  /* =========================================================
     LOAD SAVED IMPORTS
     ========================================================= */

  useEffect(() => {
    async function loadImports() {
      try {
        setLoadingImports(
          true,
        );

        setError(null);

        const result =
          await window.appAPI
            .listSavedImports();

        setSavedImports(
          result,
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load saved contact imports.',
        );
      } finally {
        setLoadingImports(
          false,
        );
      }
    }

    void loadImports();
  }, []);

  /* =========================================================
     SELECT IMPORT
     ========================================================= */

  async function handleImportChange(
    importId: string,
  ) {
    setSelectedImportId(
      importId,
    );

    setSelectedImport(
      null,
    );

    if (!importId) {
      return;
    }

    try {
      setLoadingImportDetails(
        true,
      );

      setError(null);

      const result =
        await window.appAPI
          .getSavedImportDetails(
            importId,
          );

      setSelectedImport(
        result,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load the selected contact list.',
      );
    } finally {
      setLoadingImportDetails(
        false,
      );
    }
  }

  /* =========================================================
     MESSAGE FUNCTIONS
     ========================================================= */

  function addMessage(
    type: MessageType,
  ) {
    setMessages(
      (current) => [
        ...current,
        createMessage(type),
      ],
    );
  }

  function removeMessage(
    messageId: string,
  ) {
    setMessages(
      (current) =>
        current.filter(
          (message) =>
            message.id !==
            messageId,
        ),
    );
  }

  function moveMessageUp(
    index: number,
  ) {
    if (index <= 0) {
      return;
    }

    setMessages(
      (current) => {
        const updated = [
          ...current,
        ];

        const previous =
          updated[index - 1];

        updated[index - 1] =
          updated[index];

        updated[index] =
          previous;

        return updated;
      },
    );
  }

  function moveMessageDown(
    index: number,
  ) {
    if (
      index >=
      messages.length - 1
    ) {
      return;
    }

    setMessages(
      (current) => {
        const updated = [
          ...current,
        ];

        const next =
          updated[index + 1];

        updated[index + 1] =
          updated[index];

        updated[index] =
          next;

        return updated;
      },
    );
  }

  function updateMessageText(
    messageId: string,
    text: string,
  ) {
    setMessages(
      (current) =>
        current.map(
          (message) =>
            message.id ===
            messageId
              ? {
                  ...message,
                  text,
                }
              : message,
        ),
    );
  }

  function updateMessageCaption(
    messageId: string,
    caption: string,
  ) {
    setMessages(
      (current) =>
        current.map(
          (message) =>
            message.id ===
            messageId
              ? {
                  ...message,
                  caption,
                }
              : message,
        ),
    );
  }

  /* =========================================================
     DERIVED VALUES
     ========================================================= */

  const validContacts =
    selectedImport?.contacts.filter(
      (contact) =>
        contact.validationStatus ===
          'valid' &&
        Boolean(
          contact.normalizedPhone,
        ),
    ) ?? [];

  const previewContacts =
    validContacts.slice(
      0,
      5,
    );

  const campaignDetailsReady =
    campaignName.trim().length >
      0 &&
    Boolean(
      selectedImport,
    ) &&
    validContacts.length > 0;

  const messagesReady =
    messages.length > 0;

  /* =========================================================
     UI
     ========================================================= */

  return (
    <>
      <PageHeader
        title="Create Campaign"
        description="Choose recipients and build an ordered sequence of WhatsApp messages."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

        {/* ===================================================
            MAIN CONTENT
            =================================================== */}

        <div className="space-y-6">

          {/* CAMPAIGN DETAILS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Step 1
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Campaign Details
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Give this campaign a
              clear name and optional
              description.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="campaign-name"
                  className="text-sm font-semibold text-slate-700"
                >
                  Campaign Name
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="campaign-name"
                  type="text"
                  value={
                    campaignName
                  }
                  onChange={(
                    event,
                  ) =>
                    setCampaignName(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Example: October Volunteer Meeting"
                  maxLength={100}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>
                    Required
                  </span>

                  <span>
                    {
                      campaignName.length
                    }
                    /100
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="campaign-description"
                  className="text-sm font-semibold text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="campaign-description"
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Optional notes about this campaign..."
                  rows={4}
                  maxLength={500}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>
                    Optional
                  </span>

                  <span>
                    {
                      description.length
                    }
                    /500
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* RECIPIENT LIST */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Step 2
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Choose Recipients
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select one of your saved
              contact imports for this
              campaign.
            </p>

            {loadingImports ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                <Loader2
                  className="animate-spin"
                  size={18}
                />

                Loading saved
                contact lists...
              </div>
            ) : savedImports.length ===
              0 ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet
                    className="mt-0.5 shrink-0 text-amber-600"
                    size={20}
                  />

                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      No saved contact
                      lists available
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      Import and save a
                      participant list
                      first.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <label
                    htmlFor="recipient-import"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Saved Contact List
                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    id="recipient-import"
                    value={
                      selectedImportId
                    }
                    onChange={(
                      event,
                    ) =>
                      void handleImportChange(
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">
                      Select a saved
                      contact list
                    </option>

                    {savedImports.map(
                      (
                        savedImport,
                      ) => (
                        <option
                          key={
                            savedImport.id
                          }
                          value={
                            savedImport.id
                          }
                        >
                          {
                            savedImport.filename
                          }{' '}
                          —{' '}
                          {
                            savedImport.validRows
                          }{' '}
                          valid contacts
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {loadingImportDetails && (
                  <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    <Loader2
                      className="animate-spin"
                      size={18}
                    />

                    Loading contact
                    list...
                  </div>
                )}

                {selectedImport &&
                  !loadingImportDetails && (
                    <div className="mt-6 space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Total
                          </p>

                          <p className="mt-2 text-xl font-bold text-slate-900">
                            {
                              selectedImport.totalRows
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-emerald-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                            Valid
                          </p>

                          <p className="mt-2 text-xl font-bold text-emerald-700">
                            {
                              selectedImport.validRows
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-red-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                            Invalid
                          </p>

                          <p className="mt-2 text-xl font-bold text-red-700">
                            {
                              selectedImport.invalidRows
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                            Duplicates
                          </p>

                          <p className="mt-2 text-xl font-bold text-amber-700">
                            {
                              selectedImport.duplicateRows
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <CheckCircle2
                          className="mt-0.5 shrink-0 text-emerald-600"
                          size={19}
                        />

                        <div>
                          <p className="text-sm font-semibold text-emerald-800">
                            {
                              validContacts.length
                            }{' '}
                            recipients
                            available
                          </p>

                          <p className="mt-1 text-sm text-emerald-700">
                            Only validated,
                            non-duplicate
                            numbers will be
                            used.
                          </p>
                        </div>
                      </div>

                      {previewContacts.length >
                        0 && (
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                            <h4 className="text-sm font-semibold text-slate-700">
                              Recipient
                              Preview
                            </h4>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="px-5 py-3 font-semibold text-slate-500">
                                    Name
                                  </th>

                                  <th className="px-5 py-3 font-semibold text-slate-500">
                                    WhatsApp
                                    Number
                                  </th>
                                </tr>
                              </thead>

                              <tbody className="divide-y divide-slate-100">
                                {previewContacts.map(
                                  (
                                    contact,
                                  ) => (
                                    <tr
                                      key={
                                        contact.id
                                      }
                                    >
                                      <td className="px-5 py-3 font-medium text-slate-800">
                                        {contact.name ||
                                          '—'}
                                      </td>

                                      <td className="px-5 py-3 text-slate-600">
                                        {
                                          contact.normalizedPhone
                                        }
                                      </td>
                                    </tr>
                                  ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </section>

          {/* MESSAGE SEQUENCE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Step 3
              </p>

              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                Message Sequence
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add messages in the
                exact order they should
                be sent to each
                recipient.
              </p>
            </div>

            {/* ADD MESSAGE TYPES */}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {messageTypeOptions.map(
                (option) => {
                  const Icon =
                    getMessageIcon(
                      option.type,
                    );

                  return (
                    <button
                      key={
                        option.type
                      }
                      type="button"
                      onClick={() =>
                        addMessage(
                          option.type,
                        )
                      }
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Icon
                          size={18}
                          className="text-slate-600"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {
                            option.label
                          }
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {
                            option.description
                          }
                        </p>
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            {/* EMPTY MESSAGE STATE */}

            {messages.length ===
              0 && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Plus
                  className="mx-auto text-slate-400"
                  size={24}
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No messages added
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a message type
                  above to start the
                  sequence.
                </p>
              </div>
            )}

            {/* MESSAGE BLOCKS */}

            {messages.length >
              0 && (
              <div className="mt-6 space-y-4">
                {messages.map(
                  (
                    message,
                    index,
                  ) => {
                    const Icon =
                      getMessageIcon(
                        message.type,
                      );

                    const requiresFile =
                      message.type !==
                      'text';

                    const requiresCaption =
                      message.type ===
                        'image-caption' ||
                      message.type ===
                        'document-caption';

                    return (
                      <div
                        key={
                          message.id
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {/* MESSAGE HEADER */}

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                              <Icon
                                className="text-emerald-700"
                                size={
                                  17
                                }
                              />
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Message{' '}
                                {index +
                                  1}
                              </p>

                              <p className="text-xs text-slate-500">
                                {getMessageLabel(
                                  message.type,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                moveMessageUp(
                                  index,
                                )
                              }
                              disabled={
                                index ===
                                0
                              }
                              title="Move up"
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ArrowUp
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveMessageDown(
                                  index,
                                )
                              }
                              disabled={
                                index ===
                                messages.length -
                                  1
                              }
                              title="Move down"
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <ArrowDown
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeMessage(
                                  message.id,
                                )
                              }
                              title="Remove message"
                              className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        </div>

                        {/* MESSAGE CONTENT */}

                        <div className="p-5">

                          {/* TEXT */}

                          {message.type ===
                            'text' && (
                            <div>
                              <label
                                htmlFor={`message-text-${message.id}`}
                                className="text-sm font-semibold text-slate-700"
                              >
                                Message
                                Text
                              </label>

                              <textarea
                                id={`message-text-${message.id}`}
                                rows={
                                  5
                                }
                                value={
                                  message.text
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateMessageText(
                                    message.id,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Enter your WhatsApp message..."
                                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>
                          )}

                          {/* FILE PLACEHOLDER */}

                          {requiresFile && (
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {message.type ===
                                  'image' ||
                                message.type ===
                                  'image-caption'
                                  ? 'Image'
                                  : 'Document'}
                              </p>

                              <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                                <Icon
                                  className="mx-auto text-slate-400"
                                  size={
                                    25
                                  }
                                />

                                <p className="mt-3 text-sm font-medium text-slate-700">
                                  File
                                  selection
                                  will be
                                  connected
                                  next.
                                </p>

                                <button
                                  type="button"
                                  disabled
                                  className="mt-3 cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
                                >
                                  Choose
                                  File
                                </button>
                              </div>
                            </div>
                          )}

                          {/* CAPTION */}

                          {requiresCaption && (
                            <div className="mt-5">
                              <label
                                htmlFor={`message-caption-${message.id}`}
                                className="text-sm font-semibold text-slate-700"
                              >
                                Caption
                              </label>

                              <textarea
                                id={`message-caption-${message.id}`}
                                rows={
                                  4
                                }
                                value={
                                  message.caption
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateMessageCaption(
                                    message.id,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Enter an optional caption..."
                                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>

        {/* ===================================================
            SUMMARY
            =================================================== */}

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
          <h3 className="font-semibold text-slate-900">
            Campaign Summary
          </h3>

          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <dt className="text-slate-500">
                Name
              </dt>

              <dd className="max-w-44 text-right font-semibold text-slate-800">
                {campaignName.trim() ||
                  'Not set'}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <dt className="text-slate-500">
                Contact List
              </dt>

              <dd className="max-w-44 break-words text-right font-semibold text-slate-800">
                {selectedImport
                  ?.filename ??
                  'Not selected'}
              </dd>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <dt className="flex items-center gap-2 text-slate-500">
                <Users
                  size={16}
                />

                Recipients
              </dt>

              <dd className="font-semibold text-slate-900">
                {
                  validContacts.length
                }
              </dd>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">
                Messages
              </dt>

              <dd className="font-semibold text-slate-900">
                {
                  messages.length
                }
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-500">
                Status
              </dt>

              <dd className="font-semibold text-slate-900">
                Draft
              </dd>
            </div>
          </dl>

          <div
            className={`mt-6 rounded-xl border p-4 ${
              campaignDetailsReady &&
              messagesReady
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            {campaignDetailsReady &&
            messagesReady ? (
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={18}
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Campaign
                    structure ready
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Next we will
                    connect media files
                    and save the draft.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Add a campaign name,
                recipient list and at
                least one message.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
          >
            Save Draft — Next
          </button>
        </aside>
      </div>
    </>
  );
}