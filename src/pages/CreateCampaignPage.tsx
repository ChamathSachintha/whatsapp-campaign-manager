import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
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

  /* =========================================================
     UI
     ========================================================= */

  return (
    <>
      <PageHeader
        title="Create Campaign"
        description="Choose your recipient list and prepare the campaign before building the message sequence."
      />

      {/* ERROR */}

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
            <div>
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
            </div>

            <div className="mt-6 space-y-5">

              {/* CAMPAIGN NAME */}

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
            <div>
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
            </div>

            {/* LOADING */}

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
              /* NO IMPORTS */

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
                      from the Import
                      Contacts page
                      before creating a
                      campaign.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* IMPORT SELECT */}

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

                {/* DETAILS LOADING */}

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

                {/* SELECTED IMPORT */}

                {selectedImport &&
                  !loadingImportDetails && (
                    <div className="mt-6 space-y-5">

                      {/* IMPORT STATS */}

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

                      {/* VALID RECIPIENT NOTE */}

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

                          <p className="mt-1 text-sm leading-6 text-emerald-700">
                            Only validated,
                            non-duplicate
                            numbers will be
                            used as campaign
                            recipients.
                          </p>
                        </div>
                      </div>

                      {/* RECIPIENT PREVIEW */}

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

                          {validContacts.length >
                            previewContacts.length && (
                            <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-500">
                              Showing first{' '}
                              {
                                previewContacts.length
                              }{' '}
                              of{' '}
                              {
                                validContacts.length
                              }{' '}
                              valid
                              recipients.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
              </>
            )}
          </section>

          {/* MESSAGE BUILDER PLACEHOLDER */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <span className="text-sm font-bold text-slate-500">
                  3
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Message Sequence
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Text, images,
                  captions and document
                  messages will be added
                  in the next campaign
                  creation step.
                </p>
              </div>
            </div>
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
                0
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
              campaignDetailsReady
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            {campaignDetailsReady ? (
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={18}
                />

                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Campaign details
                    ready
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Next we will build
                    the message
                    sequence.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                Enter a campaign name
                and choose a recipient
                list to continue.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500"
          >
            Message Builder — Next
          </button>
        </aside>
      </div>
    </>
  );
}