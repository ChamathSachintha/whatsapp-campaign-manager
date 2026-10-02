import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import {
  PageHeader,
} from '../components/PageHeader';

import type {
  ContactFileInspection,
} from '../types/imports';

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

export function ImportContactsPage() {
  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<ContactFileInspection | null>(
      null,
    );

  const [
    loading,
    setLoading,
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
    selectedPhoneColumn,
    setSelectedPhoneColumn,
  ] =
    useState('');

  const [
    selectedNameColumn,
    setSelectedNameColumn,
  ] =
    useState('');

  const [
    validation,
    setValidation,
  ] =
    useState<
      ContactFileInspection[
        'validationResult'
      ]
    >(null);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    savedImportId,
    setSavedImportId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    savedImports,
    setSavedImports,
  ] =
    useState<
      SavedImportItem[]
    >([]);

  const [
    loadingSavedImports,
    setLoadingSavedImports,
  ] =
    useState(false);

  const [
    selectedSavedImport,
    setSelectedSavedImport,
  ] =
    useState<
      SavedImportDetails | null
    >(null);

  const [
    loadingSavedImportDetails,
    setLoadingSavedImportDetails,
  ] =
    useState(false);

  /* =========================================================
     DELETE STATE
     ========================================================= */

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<SavedImportItem | null>(
      null,
    );

  const [
    deletingImportId,
    setDeletingImportId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    deleteMessage,
    setDeleteMessage,
  ] =
    useState<string | null>(
      null,
    );

  /* =========================================================
     LOAD SAVED IMPORTS
     ========================================================= */

  async function loadSavedImports() {
    try {
      setLoadingSavedImports(
        true,
      );

      const imports =
        await window.appAPI
          .listSavedImports();

      setSavedImports(
        imports,
      );
    } catch (err) {
      console.error(
        'Unable to load saved imports:',
        err,
      );
    } finally {
      setLoadingSavedImports(
        false,
      );
    }
  }

  /* =========================================================
     VIEW SAVED IMPORT
     ========================================================= */

  async function viewSavedImport(
    importId: string,
  ) {
    try {
      setLoadingSavedImportDetails(
        true,
      );

      setError(null);

      const result =
        await window.appAPI
          .getSavedImportDetails(
            importId,
          );

      setSelectedSavedImport(
        result,
      );
    } catch (err) {
      console.error(err);

      setSelectedSavedImport(
        null,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load saved import details.',
      );
    } finally {
      setLoadingSavedImportDetails(
        false,
      );
    }
  }

  /* =========================================================
     REQUEST DELETE
     ========================================================= */

  function requestDeleteImport(
    savedImport: SavedImportItem,
  ) {
    setDeleteMessage(
      null,
    );

    setDeleteTarget(
      savedImport,
    );
  }

  /* =========================================================
     CONFIRM DELETE
     ========================================================= */

  async function confirmDeleteImport() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeletingImportId(
        deleteTarget.id,
      );

      setError(null);
      setDeleteMessage(null);

      const result =
        await window.appAPI
          .deleteSavedImport(
            deleteTarget.id,
          );

      /*
       * Close details if the deleted
       * import is currently being viewed.
       */
      if (
        selectedSavedImport?.id ===
        deleteTarget.id
      ) {
        setSelectedSavedImport(
          null,
        );
      }

      /*
       * If the import that was just saved
       * is deleted, allow it to be saved
       * again.
       */
      if (
        savedImportId ===
        deleteTarget.id
      ) {
        setSavedImportId(
          null,
        );

        setSaveMessage(
          null,
        );
      }

      const contactText =
        result.deletedContacts === 1
          ? '1 stored contact row was removed.'
          : `${result.deletedContacts} stored contact rows were removed.`;

      const campaignText =
        result.detachedCampaigns > 0
          ? result.detachedCampaigns === 1
            ? ' 1 existing campaign was detached from this import.'
            : ` ${result.detachedCampaigns} existing campaigns were detached from this import.`
          : '';

      setDeleteMessage(
        `Import deleted successfully. ${contactText}${campaignText}`,
      );

      setDeleteTarget(
        null,
      );

      await loadSavedImports();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete the saved import.',
      );
    } finally {
      setDeletingImportId(
        null,
      );
    }
  }

  /* =========================================================
     LOAD IMPORTS WHEN PAGE OPENS
     ========================================================= */

  useEffect(() => {
    void loadSavedImports();
  }, []);

  /* =========================================================
     CHOOSE FILE
     ========================================================= */

  async function chooseFile() {
    try {
      setLoading(true);

      setError(null);

      setSavedImportId(
        null,
      );

      setSaveMessage(
        null,
      );

      setDeleteMessage(
        null,
      );

      const result =
        await window.appAPI
          .chooseContactFile();

      if (result.canceled) {
        return;
      }

      setSelectedFile(
        result,
      );

      setSelectedPhoneColumn(
        result
          .suggestedPhoneColumn ??
          '',
      );

      setSelectedNameColumn(
        result
          .suggestedNameColumn ??
          '',
      );

      setValidation(
        result.validationResult ??
          null,
      );
    } catch (err) {
      console.error(err);

      setSelectedFile(
        null,
      );

      setSelectedPhoneColumn(
        '',
      );

      setSelectedNameColumn(
        '',
      );

      setValidation(
        null,
      );

      setSavedImportId(
        null,
      );

      setSaveMessage(
        null,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open or read the selected file.',
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     REVALIDATE FILE
     ========================================================= */

  async function revalidateFile(
    phoneColumn: string,
    nameColumn: string,
  ) {
    setSavedImportId(
      null,
    );

    setSaveMessage(
      null,
    );

    if (
      !selectedFile
        ?.filePath ||
      !phoneColumn
    ) {
      setValidation(
        null,
      );

      return;
    }

    try {
      setError(null);

      const result =
        await window.appAPI
          .validateContactFile({
            filePath:
              selectedFile
                .filePath,

            phoneColumn,

            nameColumn:
              nameColumn ||
              null,
          });

      setValidation(
        result,
      );
    } catch (err) {
      console.error(err);

      setValidation(
        null,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to validate the selected columns.',
      );
    }
  }

  /* =========================================================
     SAVE IMPORT
     ========================================================= */

  async function saveImport() {
    if (
      !selectedFile
        ?.filePath ||
      !selectedPhoneColumn ||
      !validation
    ) {
      return;
    }

    try {
      setSaving(true);

      setError(null);
      setSaveMessage(null);
      setDeleteMessage(null);

      const result =
        await window.appAPI
          .saveContactImport({
            filePath:
              selectedFile
                .filePath,

            phoneColumn:
              selectedPhoneColumn,

            nameColumn:
              selectedNameColumn ||
              null,
          });

      setSavedImportId(
        result.importId,
      );

      await loadSavedImports();

      setSaveMessage(
        `Import saved successfully. ${result.validRows} valid contacts are ready.`,
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save the contact import.',
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     UI
     ========================================================= */

  return (
    <>
      <PageHeader
        title="Import Contacts"
        description="Import the exact recipient list needed for a campaign."
      />

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* DELETE SUCCESS */}

      {deleteMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            className="mt-0.5 shrink-0"
            size={18}
          />

          <span>
            {deleteMessage}
          </span>
        </div>
      )}

      {/* =====================================================
          SAVED IMPORTS
          ===================================================== */}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Saved Imports
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Previously imported
                participant lists stored
                locally in this
                application.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {
                savedImports.length
              }{' '}
              {savedImports.length ===
              1
                ? 'Import'
                : 'Imports'}
            </span>
          </div>
        </div>

        {loadingSavedImports ? (
          <div className="p-6 text-sm text-slate-500">
            Loading saved imports...
          </div>
        ) : savedImports.length ===
          0 ? (
          <div className="p-6 text-sm text-slate-500">
            No contact imports have
            been saved yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                    File
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                    Type
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                    Imported
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                    Total
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-emerald-700">
                    Valid
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-red-700">
                    Invalid
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-amber-700">
                    Duplicates
                  </th>

                  <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {savedImports.map(
                  (
                    savedImport,
                  ) => {
                    const isDeleting =
                      deletingImportId ===
                      savedImport.id;

                    return (
                      <tr
                        key={
                          savedImport.id
                        }
                      >
                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                          {
                            savedImport.filename
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 uppercase text-slate-500">
                          {
                            savedImport.fileType
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {new Date(
                            savedImport
                              .importedAt,
                          ).toLocaleString()}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                          {
                            savedImport.totalRows
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 font-semibold text-emerald-700">
                          {
                            savedImport.validRows
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 font-semibold text-red-700">
                          {
                            savedImport.invalidRows
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 font-semibold text-amber-700">
                          {
                            savedImport
                              .duplicateRows
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void viewSavedImport(
                                  savedImport.id,
                                )
                              }
                              disabled={
                                isDeleting ||
                                loadingSavedImportDetails
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Eye
                                size={
                                  15
                                }
                              />

                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                requestDeleteImport(
                                  savedImport,
                                )
                              }
                              disabled={
                                isDeleting
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2
                                size={
                                  15
                                }
                              />

                              {isDeleting
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================
          SAVED IMPORT DETAILS
          ===================================================== */}

      {loadingSavedImportDetails && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading saved import
          details...
        </div>
      )}

      {selectedSavedImport &&
        !loadingSavedImportDetails && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

            {/* DETAILS HEADER */}

            <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Saved Import Details
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    selectedSavedImport.filename
                  }
                  {' • '}
                  {selectedSavedImport.fileType.toUpperCase()}
                  {' • '}
                  {new Date(
                    selectedSavedImport.importedAt,
                  ).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSavedImport(
                    null,
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <X
                  size={16}
                />

                Close Details
              </button>
            </div>

            {/* DETAILS SUMMARY */}

            <div className="grid gap-4 border-b border-slate-200 p-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total Rows
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">
                  {
                    selectedSavedImport.totalRows
                  }
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Valid
                </p>

                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {
                    selectedSavedImport.validRows
                  }
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                  Invalid
                </p>

                <p className="mt-2 text-xl font-bold text-red-700">
                  {
                    selectedSavedImport.invalidRows
                  }
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                  Duplicates
                </p>

                <p className="mt-2 text-xl font-bold text-amber-700">
                  {
                    selectedSavedImport.duplicateRows
                  }
                </p>
              </div>
            </div>

            {/* DETAILS CONTACT TABLE */}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Row
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Name
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Original Phone
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Normalized Phone
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Status
                    </th>

                    <th className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600">
                      Reason
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {selectedSavedImport.contacts.map(
                    (
                      contact,
                    ) => (
                      <tr
                        key={
                          contact.id
                        }
                      >
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {
                            contact.rowNumber ??
                            '—'
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                          {contact.name ||
                            '—'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                          {
                            contact.originalPhone ||
                            '—'
                          }
                        </td>

                        <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                          {
                            contact.normalizedPhone ??
                            '—'
                          }
                        </td>

                        <td className="px-5 py-3">
                          {contact.validationStatus ===
                            'valid' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2
                                size={
                                  14
                                }
                              />

                              Valid
                            </span>
                          )}

                          {contact.validationStatus ===
                            'invalid' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                              <XCircle
                                size={
                                  14
                                }
                              />

                              Invalid
                            </span>
                          )}

                          {contact.validationStatus ===
                            'duplicate' && (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Duplicate
                            </span>
                          )}
                        </td>

                        <td className="min-w-64 px-5 py-3 text-slate-500">
                          {
                            contact.validationReason ??
                            '—'
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

      {/* =====================================================
          FILE PICKER
          ===================================================== */}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <Upload
            className="text-emerald-700"
            size={24}
          />
        </div>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">
          Import recipient file
        </h3>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Supported formats: CSV,
          Markdown, XLSX and XLS.
        </p>

        <button
          type="button"
          onClick={
            chooseFile
          }
          disabled={
            loading
          }
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet
            size={18}
          />

          {loading
            ? 'Opening...'
            : 'Choose File'}
        </button>
      </div>

      {/* =====================================================
          CURRENT FILE DETAILS
          ===================================================== */}

      {selectedFile && (
        <div className="mt-6 space-y-6">

          {/* FILE INFORMATION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              File Information
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  File
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {
                    selectedFile.fileName
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Type
                </p>

                <p className="mt-1 text-sm font-medium uppercase text-slate-800">
                  {
                    selectedFile.fileType
                  }
                </p>
              </div>
            </div>
          </div>

          {/* COLUMN SELECTION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Column Selection
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              The most likely columns
              were selected
              automatically. Change them
              if needed.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              {/* PHONE COLUMN */}

              <div>
                <label
                  htmlFor="phone-column"
                  className="text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Phone Column
                </label>

                <select
                  id="phone-column"
                  value={
                    selectedPhoneColumn
                  }
                  onChange={async (
                    event,
                  ) => {
                    const value =
                      event.target
                        .value;

                    setSelectedPhoneColumn(
                      value,
                    );

                    await revalidateFile(
                      value,
                      selectedNameColumn,
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    Select phone
                    column
                  </option>

                  {selectedFile.columns?.map(
                    (
                      column,
                    ) => (
                      <option
                        key={
                          column
                        }
                        value={
                          column
                        }
                      >
                        {
                          column
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* NAME COLUMN */}

              <div>
                <label
                  htmlFor="name-column"
                  className="text-xs font-medium uppercase tracking-wide text-slate-500"
                >
                  Name Column
                </label>

                <select
                  id="name-column"
                  value={
                    selectedNameColumn
                  }
                  onChange={async (
                    event,
                  ) => {
                    const value =
                      event.target
                        .value;

                    setSelectedNameColumn(
                      value,
                    );

                    await revalidateFile(
                      selectedPhoneColumn,
                      value,
                    );
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">
                    No name column
                  </option>

                  {selectedFile.columns?.map(
                    (
                      column,
                    ) => (
                      <option
                        key={
                          column
                        }
                        value={
                          column
                        }
                      >
                        {
                          column
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* AVAILABLE COLUMNS */}

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Available Columns
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFile.columns?.map(
                  (
                    column,
                  ) => (
                    <span
                      key={
                        column
                      }
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {
                        column
                      }
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* NO PHONE */}

          {!selectedPhoneColumn && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Select the column containing
              WhatsApp phone numbers to
              continue validation.
            </div>
          )}

          {/* VALIDATION */}

          {validation &&
            selectedPhoneColumn && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Total Rows
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {
                        validation.summary
                          .totalRows
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                      Valid
                    </p>

                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                      {
                        validation.summary
                          .validRows
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-red-600">
                      Invalid
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-700">
                      {
                        validation.summary
                          .invalidRows
                      }
                    </p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                      Duplicates
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-700">
                      {
                        validation.summary
                          .duplicateRows
                      }
                    </p>
                  </div>
                </div>

                {/* VALIDATION TABLE */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-6">
                    <h3 className="text-base font-semibold text-slate-900">
                      Contact Validation
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Row
                          </th>

                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Name
                          </th>

                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Original Phone
                          </th>

                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Normalized Phone
                          </th>

                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Status
                          </th>

                          <th className="px-5 py-3 font-semibold text-slate-600">
                            Reason
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {validation.contacts.map(
                          (
                            contact,
                          ) => (
                            <tr
                              key={
                                contact.rowNumber
                              }
                            >
                              <td className="px-5 py-3 text-slate-500">
                                {
                                  contact.rowNumber
                                }
                              </td>

                              <td className="px-5 py-3 font-medium text-slate-800">
                                {contact.name ||
                                  '—'}
                              </td>

                              <td className="px-5 py-3 text-slate-700">
                                {contact.originalPhone ||
                                  '—'}
                              </td>

                              <td className="px-5 py-3 font-medium text-slate-800">
                                {contact.normalizedPhone ??
                                  '—'}
                              </td>

                              <td className="px-5 py-3">
                                {contact.status ===
                                  'valid' && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                    Valid
                                  </span>
                                )}

                                {contact.status ===
                                  'invalid' && (
                                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                    Invalid
                                  </span>
                                )}

                                {contact.status ===
                                  'duplicate' && (
                                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    Duplicate
                                  </span>
                                )}
                              </td>

                              <td className="min-w-64 px-5 py-3 text-slate-500">
                                {contact.reason ??
                                  '—'}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* CONFIRM IMPORT */}

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Confirm Import
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Save this participant
                        list locally for use in
                        campaigns.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        saveImport
                      }
                      disabled={
                        saving ||
                        Boolean(
                          savedImportId,
                        ) ||
                        validation.summary
                          .validRows === 0
                      }
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? 'Saving...'
                        : savedImportId
                          ? 'Import Saved'
                          : 'Save Import'}
                    </button>
                  </div>

                  {saveMessage && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                      <CheckCircle2
                        size={18}
                      />

                      {
                        saveMessage
                      }
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">

            <div className="flex items-start gap-4 border-b border-slate-200 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                <AlertTriangle
                  className="text-red-600"
                  size={22}
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Delete Saved Import?
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This will permanently
                  delete the saved import
                  and its stored contact
                  rows.
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  {
                    deleteTarget.filename
                  }
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    deleteTarget.totalRows
                  }{' '}
                  rows •{' '}
                  {
                    deleteTarget.validRows
                  }{' '}
                  valid
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Existing campaigns will
                not be deleted. If a
                campaign references this
                import, the relationship
                will be detached.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(
                      null,
                    )
                  }
                  disabled={
                    deletingImportId !==
                    null
                  }
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void confirmDeleteImport()
                  }
                  disabled={
                    deletingImportId !==
                    null
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2
                    size={16}
                  />

                  {deletingImportId
                    ? 'Deleting...'
                    : 'Delete Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}