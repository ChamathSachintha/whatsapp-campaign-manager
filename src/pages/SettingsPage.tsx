import {
  CheckCircle2,
  Database,
  LoaderCircle,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHeader } from '../components/PageHeader';

type DatabaseHealth = {
  connected: boolean;
  tables: string[];
  tableCount: number;
};

export function SettingsPage() {
  const [databaseHealth, setDatabaseHealth] =
    useState<DatabaseHealth | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDatabaseHealth() {
      try {
        setLoading(true);
        setError(null);

        const health =
          await window.appAPI.getDatabaseHealth();

        setDatabaseHealth(health);
      } catch (err) {
        console.error(err);

        setError(
          'Unable to read database status.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDatabaseHealth();
  }, []);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Application configuration and system status."
      />

      <div className="grid max-w-4xl gap-6">
        {/* Database */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <Database
                    size={20}
                    className="text-emerald-700"
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Database
                  </h3>

                  <p className="text-sm text-slate-500">
                    Local SQLite storage
                  </p>
                </div>
              </div>
            </div>

            {loading && (
              <LoaderCircle
                size={20}
                className="animate-spin text-slate-400"
              />
            )}

            {!loading &&
              databaseHealth?.connected && (
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 size={16} />
                  Connected
                </div>
              )}

            {!loading &&
              (!databaseHealth || error) && (
                <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                  <XCircle size={16} />
                  Error
                </div>
              )}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {databaseHealth && (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    Database Connected
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Tables
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {databaseHealth.tableCount}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-sm font-medium text-slate-700">
                  Database tables
                </p>

                <div className="flex flex-wrap gap-2">
                  {databaseHealth.tables.map(
                    (table) => (
                      <span
                        key={table}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {table}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* General */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5">
            <h3 className="font-semibold">
              General
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Default application preferences.
            </p>
          </div>

          <div className="space-y-5 pt-5">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Default timezone
              </label>

              <input
                value="Asia/Colombo"
                readOnly
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium">
                  Minimize to system tray
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  This will be enabled when we build the
                  scheduler.
                </p>
              </div>

              <div className="h-6 w-11 rounded-full bg-slate-200" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}