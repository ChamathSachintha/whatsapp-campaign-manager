import {
  FileSpreadsheet,
  Upload,
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
  ] =
    useState<ContactFileInspection | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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
    } catch (err) {
      console.error(err);

      setSelectedFile(null);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to open or read the selected file.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import Contacts"
        description="Import the exact recipient list needed for a campaign."
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

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

          {/* COLUMN DETECTION */}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">
              Column Detection
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Detected Phone Column
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedFile
                    .suggestedPhoneColumn ??
                    'Not detected'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Detected Name Column
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedFile
                    .suggestedNameColumn ??
                    'Not detected'}
                </p>
              </div>
            </div>

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

          {/* SAMPLE ROWS */}

          {selectedFile.sampleRows &&
            selectedFile.sampleRows.length >
              0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-6">
                  <h3 className="text-base font-semibold text-slate-900">
                    Sample Rows
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Preview of the first five
                    rows from the selected file.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {selectedFile.columns?.map(
                          (column) => (
                            <th
                              key={column}
                              className="whitespace-nowrap px-5 py-3 font-semibold text-slate-600"
                            >
                              {column}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedFile.sampleRows.map(
                        (row, rowIndex) => (
                          <tr key={rowIndex}>
                            {selectedFile.columns?.map(
                              (column) => (
                                <td
                                  key={column}
                                  className="whitespace-nowrap px-5 py-3 text-slate-700"
                                >
                                  {row[column] ||
                                    '—'}
                                </td>
                              ),
                            )}
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
  );
}