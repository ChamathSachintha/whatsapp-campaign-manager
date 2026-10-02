import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Save,
  Trash2,
  Type,
  Users,
  X,
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

  filePath:
    | string
    | null;

  fileName:
    | string
    | null;

  fileExtension:
    | string
    | null;

  fileSizeBytes:
    | number
    | null;
};

type SavedDraftResult = {
  campaignId: string;
  recipientCount: number;
  messageCount: number;
  mediaCount: number;
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
    label:
      'Document + Caption',
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

    filePath: null,

    fileName: null,

    fileExtension: null,

    fileSizeBytes: null,
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
    type ===
      'image-caption'
  ) {
    return ImageIcon;
  }

  return FileText;
}

function getAttachmentType(
  type: MessageType,
):
  | 'image'
  | 'document'
  | null {
  if (
    type === 'image' ||
    type ===
      'image-caption'
  ) {
    return 'image';
  }

  if (
    type === 'document' ||
    type ===
      'document-caption'
  ) {
    return 'document';
  }

  return null;
}

function formatFileSize(
  bytes: number,
) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (
    kilobytes < 1024
  ) {
    return `${kilobytes.toFixed(
      1,
    )} KB`;
  }

  const megabytes =
    kilobytes / 1024;

  return `${megabytes.toFixed(
    1,
  )} MB`;
}

function isMessageComplete(
  message: CampaignMessage,
) {
  if (
    message.type === 'text'
  ) {
    return (
      message.text
        .trim()
        .length > 0
    );
  }

  if (
    !message.filePath
  ) {
    return false;
  }

  if (
    message.type ===
      'image-caption' ||
    message.type ===
      'document-caption'
  ) {
    return (
      message.caption
        .trim()
        .length > 0
    );
  }

  return true;
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

  const [
    selectingAttachmentId,
    setSelectingAttachmentId,
  ] =
    useState<
      string | null
    >(null);

  const [
    savingDraft,
    setSavingDraft,
  ] =
    useState(false);

  const [
    savedDraft,
    setSavedDraft,
  ] =
    useState<
      SavedDraftResult | null
    >(null);

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
          await window
            .appAPI
            .listSavedImports();

        setSavedImports(
          result,
        );
      } catch (err) {
        console.error(
          err,
        );

        setError(
          err instanceof
            Error
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
    if (savedDraft) {
      return;
    }

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
        await window
          .appAPI
          .getSavedImportDetails(
            importId,
          );

      setSelectedImport(
        result,
      );
    } catch (err) {
      console.error(
        err,
      );

      setError(
        err instanceof
          Error
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
    if (savedDraft) {
      return;
    }

    setMessages(
      (current) => [
        ...current,
        createMessage(
          type,
        ),
      ],
    );
  }

  function removeMessage(
    messageId: string,
  ) {
    if (savedDraft) {
      return;
    }

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
    if (
      savedDraft ||
      index <= 0
    ) {
      return;
    }

    setMessages(
      (current) => {
        const updated = [
          ...current,
        ];

        const previous =
          updated[
            index - 1
          ];

        updated[
          index - 1
        ] =
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
    if (savedDraft) {
      return;
    }

    setMessages(
      (current) => {
        if (
          index >=
          current.length -
            1
        ) {
          return current;
        }

        const updated = [
          ...current,
        ];

        const next =
          updated[
            index + 1
          ];

        updated[
          index + 1
        ] =
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
    if (savedDraft) {
      return;
    }

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
    if (savedDraft) {
      return;
    }

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
     CHOOSE ATTACHMENT
     ========================================================= */

  async function chooseAttachment(
    messageId: string,
    messageType: MessageType,
  ) {
    if (savedDraft) {
      return;
    }

    const attachmentType =
      getAttachmentType(
        messageType,
      );

    if (
      !attachmentType
    ) {
      return;
    }

    try {
      setSelectingAttachmentId(
        messageId,
      );

      setError(null);

      const result =
        await window
          .appAPI
          .chooseCampaignAttachment(
            attachmentType,
          );

      if (
        result.canceled
      ) {
        return;
      }

      setMessages(
        (current) =>
          current.map(
            (message) =>
              message.id ===
              messageId
                ? {
                    ...message,

                    filePath:
                      result.filePath,

                    fileName:
                      result.fileName,

                    fileExtension:
                      result.extension,

                    fileSizeBytes:
                      result.sizeBytes,
                  }
                : message,
          ),
      );
    } catch (err) {
      console.error(
        err,
      );

      setError(
        err instanceof
          Error
          ? err.message
          : 'Unable to select the attachment.',
      );
    } finally {
      setSelectingAttachmentId(
        null,
      );
    }
  }

  /* =========================================================
     REMOVE ATTACHMENT
     ========================================================= */

  function removeAttachment(
    messageId: string,
  ) {
    if (savedDraft) {
      return;
    }

    setMessages(
      (current) =>
        current.map(
          (message) =>
            message.id ===
            messageId
              ? {
                  ...message,

                  filePath:
                    null,

                  fileName:
                    null,

                  fileExtension:
                    null,

                  fileSizeBytes:
                    null,
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
    campaignName
      .trim()
      .length > 0 &&
    Boolean(
      selectedImport,
    ) &&
    validContacts.length >
      0;

  const completedMessages =
    messages.filter(
      isMessageComplete,
    ).length;

  const messagesReady =
    messages.length >
      0 &&
    completedMessages ===
      messages.length;

  const campaignStructureReady =
    campaignDetailsReady &&
    messagesReady;

  /* =========================================================
     SAVE DRAFT
     ========================================================= */

  async function saveDraft() {
    if (
      !campaignStructureReady ||
      !selectedImportId ||
      savedDraft
    ) {
      return;
    }

    try {
      setSavingDraft(
        true,
      );

      setError(null);

      const result =
        await window
          .appAPI
          .saveCampaignDraft({
            name:
              campaignName,

            description:
              description ||
              null,

            importId:
              selectedImportId,

            messages:
              messages.map(
                (
                  message,
                ) => ({
                  type:
                    message.type,

                  text:
                    message.text ||
                    null,

                  caption:
                    message.caption ||
                    null,

                  filePath:
                    message.filePath,

                  fileName:
                    message.fileName,

                  fileExtension:
                    message.fileExtension,

                  fileSizeBytes:
                    message.fileSizeBytes,
                }),
              ),
          });

      setSavedDraft(
        result,
      );
    } catch (err) {
      console.error(
        err,
      );

      setError(
        err instanceof
          Error
          ? err.message
          : 'Unable to save the campaign draft.',
      );
    } finally {
      setSavingDraft(
        false,
      );
    }
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <>
      <PageHeader
        title="Create Campaign"
        description="Choose recipients and build an ordered sequence of WhatsApp messages."
      />

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SAVED SUCCESS */}

      {savedDraft && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-600"
              size={22}
            />

            <div>
              <p className="font-semibold text-emerald-900">
                Campaign draft
                saved successfully
              </p>

              <p className="mt-1 text-sm leading-6 text-emerald-700">
                {
                  savedDraft.recipientCount
                }{' '}
                recipients,{' '}
                {
                  savedDraft.messageCount
                }{' '}
                messages and{' '}
                {
                  savedDraft.mediaCount
                }{' '}
                media files were
                stored.
              </p>

              <p className="mt-2 break-all text-xs text-emerald-600">
                Campaign ID:{' '}
                {
                  savedDraft.campaignId
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

        {/* ===================================================
            MAIN
            =================================================== */}

        <div className="space-y-6">

          {/* =================================================
              STEP 1
              ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Step 1
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Campaign Details
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Give this
              campaign a clear
              name and optional
              description.
            </p>

            <div className="mt-6 space-y-5">

              {/* NAME */}

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
                  disabled={
                    Boolean(
                      savedDraft,
                    )
                  }
                  onChange={(
                    event,
                  ) =>
                    setCampaignName(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Example: October Volunteer Meeting"
                  maxLength={
                    100
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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

              {/* DESCRIPTION */}

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
                  disabled={
                    Boolean(
                      savedDraft,
                    )
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Optional notes about this campaign..."
                  rows={4}
                  maxLength={
                    500
                  }
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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

          {/* =================================================
              STEP 2
              ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Step 2
            </p>

            <h3 className="mt-1 text-lg font-semibold text-slate-900">
              Choose
              Recipients
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select one of
              your saved
              contact imports
              for this
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
                      No saved
                      contact lists
                      available
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      Import and
                      save a
                      participant
                      list first.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* SELECT */}

                <div className="mt-6">
                  <label
                    htmlFor="recipient-import"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Saved
                    Contact List

                    <span className="ml-1 text-red-500">
                      *
                    </span>
                  </label>

                  <select
                    id="recipient-import"
                    value={
                      selectedImportId
                    }
                    disabled={
                      Boolean(
                        savedDraft,
                      )
                    }
                    onChange={(
                      event,
                    ) =>
                      void handleImportChange(
                        event
                          .target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">
                      Select a
                      saved contact
                      list
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
                          valid
                          contacts
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

                    Loading
                    contact list...
                  </div>
                )}

                {selectedImport &&
                  !loadingImportDetails && (
                    <div className="mt-6 space-y-5">

                      {/* COUNTS */}

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

                      {/* VALID */}

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
                            Only
                            validated,
                            non-duplicate
                            numbers will
                            be used.
                          </p>
                        </div>
                      </div>

                      {/* PREVIEW */}

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

          {/* =================================================
              STEP 3
              ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Step 3
              </p>

              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                Message
                Sequence
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Add messages in
                the exact order
                they should be
                sent to each
                recipient.
              </p>
            </div>

            {/* TYPES */}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {messageTypeOptions.map(
                (
                  option,
                ) => {
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
                      disabled={
                        Boolean(
                          savedDraft,
                        )
                      }
                      onClick={() =>
                        addMessage(
                          option.type,
                        )
                      }
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <Icon
                          size={
                            18
                          }
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

            {/* EMPTY */}

            {messages.length ===
              0 && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Plus
                  className="mx-auto text-slate-400"
                  size={24}
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No messages
                  added
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a
                  message type
                  above to start
                  the sequence.
                </p>
              </div>
            )}

            {/* BLOCKS */}

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

                    const attachmentType =
                      getAttachmentType(
                        message.type,
                      );

                    const requiresFile =
                      attachmentType !==
                      null;

                    const requiresCaption =
                      message.type ===
                        'image-caption' ||
                      message.type ===
                        'document-caption';

                    const attachmentLoading =
                      selectingAttachmentId ===
                      message.id;

                    const complete =
                      isMessageComplete(
                        message,
                      );

                    return (
                      <div
                        key={
                          message.id
                        }
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {/* HEADER */}

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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  Message{' '}
                                  {index +
                                    1}
                                </p>

                                {complete && (
                                  <CheckCircle2
                                    className="text-emerald-600"
                                    size={
                                      15
                                    }
                                  />
                                )}
                              </div>

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
                              disabled={
                                Boolean(
                                  savedDraft,
                                ) ||
                                index ===
                                  0
                              }
                              onClick={() =>
                                moveMessageUp(
                                  index,
                                )
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
                              disabled={
                                Boolean(
                                  savedDraft,
                                ) ||
                                index ===
                                  messages.length -
                                    1
                              }
                              onClick={() =>
                                moveMessageDown(
                                  index,
                                )
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
                              disabled={
                                Boolean(
                                  savedDraft,
                                )
                              }
                              onClick={() =>
                                removeMessage(
                                  message.id,
                                )
                              }
                              title="Remove message"
                              className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        </div>

                        {/* CONTENT */}

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
                                disabled={
                                  Boolean(
                                    savedDraft,
                                  )
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
                                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />

                              {!message.text.trim() && (
                                <p className="mt-2 text-xs text-amber-600">
                                  Enter
                                  message
                                  text to
                                  complete
                                  this
                                  block.
                                </p>
                              )}
                            </div>
                          )}

                          {/* ATTACHMENT */}

                          {requiresFile && (
                            <div>
                              <p className="text-sm font-semibold text-slate-700">
                                {attachmentType ===
                                'image'
                                  ? 'Image'
                                  : 'Document'}
                              </p>

                              {message.fileName ? (
                                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex min-w-0 items-start gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                                        {attachmentType ===
                                        'image' ? (
                                          <ImageIcon
                                            className="text-emerald-700"
                                            size={
                                              18
                                            }
                                          />
                                        ) : (
                                          <FileText
                                            className="text-emerald-700"
                                            size={
                                              18
                                            }
                                          />
                                        )}
                                      </div>

                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-emerald-900">
                                          {
                                            message.fileName
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-emerald-700">
                                          {message.fileExtension
                                            ?.toUpperCase() ??
                                            'FILE'}

                                          {message.fileSizeBytes !==
                                            null &&
                                            ` • ${formatFileSize(
                                              message.fileSizeBytes,
                                            )}`}
                                        </p>

                                        <p
                                          className="mt-1 truncate text-xs text-emerald-600"
                                          title={
                                            message.filePath ??
                                            undefined
                                          }
                                        >
                                          {
                                            message.filePath
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={
                                        Boolean(
                                          savedDraft,
                                        )
                                      }
                                      onClick={() =>
                                        removeAttachment(
                                          message.id,
                                        )
                                      }
                                      title="Remove attachment"
                                      className="shrink-0 rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <X
                                        size={
                                          17
                                        }
                                      />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      attachmentLoading ||
                                      Boolean(
                                        savedDraft,
                                      )
                                    }
                                    onClick={() =>
                                      void chooseAttachment(
                                        message.id,
                                        message.type,
                                      )
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {attachmentLoading ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={
                                          15
                                        }
                                      />
                                    ) : (
                                      <Paperclip
                                        size={
                                          15
                                        }
                                      />
                                    )}

                                    {attachmentLoading
                                      ? 'Opening...'
                                      : 'Replace File'}
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                                  <Icon
                                    className="mx-auto text-slate-400"
                                    size={
                                      25
                                    }
                                  />

                                  <p className="mt-3 text-sm font-medium text-slate-700">
                                    {attachmentType ===
                                    'image'
                                      ? 'Choose an image for this message.'
                                      : 'Choose a document for this message.'}
                                  </p>

                                  <button
                                    type="button"
                                    disabled={
                                      attachmentLoading ||
                                      Boolean(
                                        savedDraft,
                                      )
                                    }
                                    onClick={() =>
                                      void chooseAttachment(
                                        message.id,
                                        message.type,
                                      )
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {attachmentLoading ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={
                                          15
                                        }
                                      />
                                    ) : (
                                      <Paperclip
                                        size={
                                          15
                                        }
                                      />
                                    )}

                                    {attachmentLoading
                                      ? 'Opening...'
                                      : 'Choose File'}
                                  </button>
                                </div>
                              )}
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
                                disabled={
                                  Boolean(
                                    savedDraft,
                                  )
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
                                placeholder="Enter the caption..."
                                className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />

                              {!message.caption.trim() && (
                                <p className="mt-2 text-xs text-amber-600">
                                  Add a
                                  caption
                                  to
                                  complete
                                  this
                                  message
                                  block.
                                </p>
                              )}
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
            Campaign
            Summary
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
                  size={
                    16
                  }
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

            <div className="flex justify-between border-b border-slate-100 pb-4">
              <dt className="text-slate-500">
                Complete
              </dt>

              <dd className="font-semibold text-slate-900">
                {
                  completedMessages
                }
                /
                {
                  messages.length
                }
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-slate-500">
                Status
              </dt>

              <dd
                className={`font-semibold ${
                  savedDraft
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }`}
              >
                {savedDraft
                  ? 'Draft Saved'
                  : 'Draft'}
              </dd>
            </div>
          </dl>

          {/* READY STATE */}

          <div
            className={`mt-6 rounded-xl border p-4 ${
              campaignStructureReady
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            {savedDraft ? (
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={
                    18
                  }
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Draft stored
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Campaign,
                    recipients,
                    messages and
                    attachments
                    are now stored
                    locally.
                  </p>
                </div>
              </div>
            ) : campaignStructureReady ? (
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={
                    18
                  }
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Campaign
                    ready to save
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    All required
                    campaign
                    information
                    is complete.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Complete the
                campaign name,
                recipient list
                and every
                message block.
              </p>
            )}
          </div>

          {/* SAVE */}

          <button
            type="button"
            onClick={() =>
              void saveDraft()
            }
            disabled={
              !campaignStructureReady ||
              savingDraft ||
              Boolean(
                savedDraft,
              )
            }
            className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              campaignStructureReady &&
              !savedDraft
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
          >
            {savingDraft ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={
                    17
                  }
                />

                Saving Draft...
              </>
            ) : savedDraft ? (
              <>
                <CheckCircle2
                  size={
                    17
                  }
                />

                Draft Saved
              </>
            ) : (
              <>
                <Save
                  size={
                    17
                  }
                />

                Save Draft
              </>
            )}
          </button>
        </aside>
      </div>
    </>
  );
}