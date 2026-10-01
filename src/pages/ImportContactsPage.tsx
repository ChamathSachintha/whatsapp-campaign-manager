import {
  FileSpreadsheet,
  Upload,
} from 'lucide-react';

import { useState } from 'react';

import { PageHeader } from '../components/PageHeader';

type SelectedFile = {
  filePath?: string;
  fileName?: string;
  fileType?: string;
  columns?: string[];
  sampleRows?: Array<
    Record<string, string>
  >;
};

export function ImportContactsPage() {
  const [selectedFile, setSelectedFile] =
    useState<SelectedFile | null>(null);

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

      setError(
        'Unable to open or read the selected file.',
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

        <h3 className="mt-5 text-lg font-semibold">
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
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">
            Selected file
          </h3>

          <div className="mt-4 space-y-3 text-sm">
            <div>
              <span className="text-slate-500">
                File:
              </span>{' '}
              <span className="font-medium">
                {selectedFile.fileName}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Type:
              </span>{' '}
              <span className="font-medium uppercase">
                {selectedFile.fileType}
              </span>
            </div>

            <div>
              <span className="text-slate-500">
                Detected columns:
              </span>

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
        </div>
      )}
    </>
  );
}