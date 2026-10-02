import {
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  XCircle,
} from 'lucide-react';

import { useState } from 'react';

import { PageHeader } from '../components/PageHeader';

import type {
  ContactFileInspection,
} from '../types/imports';

export function ImportContactsPage() {
  const [
    selectedFile,
    setSelectedFile,
  ] = useState<ContactFileInspection | null>(
    null,
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    selectedPhoneColumn,
    setSelectedPhoneColumn,
  ] = useState('');

  const [
    selectedNameColumn,
    setSelectedNameColumn,
  ] = useState('');

  const [
    validation,
    setValidation,
  ] = useState<
    ContactFileInspection['validationResult']
  >(null);

  /* =========================================================
     CHOOSE FILE
     ========================================================= */

  async function chooseFile() {
    try {
      setLoading(true);
      setError(null);

      const result =
        await window.appAPI.chooseContactFile();

      if (result.canceled) {
        return;
      }

      setSelectedFile(result);

      setSelectedPhoneColumn(
        result.suggestedPhoneColumn ?? '',
      );

      setSelectedNameColumn(
        result.suggestedNameColumn ?? '',
      );

      setValidation(
        result.validationResult ?? null,
      );
    } catch (err) {
      console.error(err);

      setSelectedFile(null);

      setSelectedPhoneColumn('');
      setSelectedNameColumn('');
      setValidation(null);

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
     REVALIDATE USING MANUALLY SELECTED COLUMNS
     ========================================================= */

  async function revalidateFile(
    phoneColumn: string,
    nameColumn: string,
  ) {
    if (
      !selectedFile?.filePath ||
      !phoneColumn
    ) {
      setValidation(null);
      return;
    }

    try {
      setError(null);

      const result =
        await window.appAPI.validateContactFile({
          filePath:
            selectedFile.filePath,

          phoneColumn,

          nameColumn:
            nameColumn || null,
        });

      setValidation(result);
    } catch (err) {
      console.error(err);

      setValidation(null);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to validate the selected columns.',
      );
    }
  }

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

      {/* FILE PICKER */}

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
          Supported formats: CSV, Markdown,
          XLSX and XLS.
        </p>

        <button
          type="button"
          onClick={chooseFile}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet size={18} />

          {loading
            ? 'Opening...'
            : 'Choose File'}
        </button>
      </div>

      {/* IMPORT DETAILS */}

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
                  {selectedFile.fileName}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Type
                </p>

                <p className="mt-1 text-sm font-medium uppercase text-slate-800">
                  {selectedFile.fileType}
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
              The most likely columns were
              selected automatically. Change
              them if needed.
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
                      event.target.value;

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
                    Select phone column
                  </option>

                  {selectedFile.columns?.map(
                    (column) => (
                      <option
                        key={column}
                        value={column}
                      >
                        {column}
                      </option>
                    ),
                  )}
                </select>

                {selectedFile
                  .suggestedPhoneColumn && (
                  <p className="mt-2 text-xs text-slate-400">
                    Auto-detected:{' '}
                    {
                      selectedFile
                        .suggestedPhoneColumn
                    }
                  </p>
                )}
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
                      event.target.value;

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
                    (column) => (
                      <option
                        key={column}
                        value={column}
                      >
                        {column}
                      </option>
                    ),
                  )}
                </select>

                {selectedFile
                  .suggestedNameColumn && (
                  <p className="mt-2 text-xs text-slate-400">
                    Auto-detected:{' '}
                    {
                      selectedFile
                        .suggestedNameColumn
                    }
                  </p>
                )}
              </div>
            </div>

            {/* AVAILABLE COLUMNS */}

            <div className="mt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Available Columns
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFile.columns?.map(
                  (column) => (
                    <span
                      key={column}
                      className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {column}
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* NO PHONE COLUMN */}

          {!selectedPhoneColumn && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              A phone number column has not
              been selected. Choose the column
              containing WhatsApp phone numbers
              above to continue validation.
            </div>
          )}

          {/* VALIDATION SUMMARY */}

          {validation &&
            selectedPhoneColumn && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {/* TOTAL */}

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

                {/* VALID */}

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

                {/* INVALID */}

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

                {/* DUPLICATES */}

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

              {/* CONTACT VALIDATION TABLE */}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    Contact Validation
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Phone numbers are
                    normalized to the +94
                    format before campaign
                    creation.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">

                    {/* TABLE HEADER */}

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

                    {/* TABLE BODY */}

                    <tbody className="divide-y divide-slate-100">
                      {validation.contacts.map(
                        (contact) => (
                          <tr
                            key={
                              contact.rowNumber
                            }
                          >
                            {/* ROW */}

                            <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                              {
                                contact.rowNumber
                              }
                            </td>

                            {/* NAME */}

                            <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                              {contact.name ||
                                '—'}
                            </td>

                            {/* ORIGINAL PHONE */}

                            <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                              {contact.originalPhone ||
                                '—'}
                            </td>

                            {/* NORMALIZED PHONE */}

                            <td className="whitespace-nowrap px-5 py-3 font-medium text-slate-800">
                              {contact.normalizedPhone ??
                                '—'}
                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-3">

                              {contact.status ===
                                'valid' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                  <CheckCircle2
                                    size={14}
                                  />
                                  Valid
                                </span>
                              )}

                              {contact.status ===
                                'invalid' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                  <XCircle
                                    size={14}
                                  />
                                  Invalid
                                </span>
                              )}

                              {contact.status ===
                                'duplicate' && (
                                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                  Duplicate
                                </span>
                              )}
                            </td>

                            {/* REASON */}

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
            </>
          )}
        </div>
      )}
    </>
  );
}