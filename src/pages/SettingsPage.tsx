import { InlineNotice } from '../components/Notifications';
import { useFeedback } from '../components/Notifications';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  LoaderCircle,
  Save,
  Smartphone,
  Unplug,
  XCircle,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import { PageHeader } from '../components/PageHeader';
import { connectionLabel } from '../utils/connection-label';

type DatabaseHealth = {
  connected: boolean;
  tables: string[];
  tableCount: number;
};

type WhatsAppStatus = Awaited<
  ReturnType<typeof window.appAPI.getWhatsAppStatus>
>;

type SenderSettings = Awaited<
  ReturnType<typeof window.appAPI.getSenderSettings>
>;

function seconds(milliseconds: number) {
  return milliseconds / 1000;
}

export function SettingsPage() {
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealth | null>(
    null,
  );

  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(
    null,
  );

  const [senderSettings, setSenderSettings] = useState<SenderSettings | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useFeedback('error');

  const [, setSuccess] = useFeedback('success');

  async function loadSettings() {
    try {
      setError(null);

      const [health, whatsapp, sender] = await Promise.all([
        window.appAPI.getDatabaseHealth(),
        window.appAPI.getWhatsAppStatus(),
        window.appAPI.getSenderSettings(),
      ]);

      setDatabaseHealth(health);

      setWhatsappStatus(whatsapp);

      setSenderSettings(sender);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();

    const timer = window.setInterval(async () => {
      try {
        const status = await window.appAPI.getWhatsAppStatus();

        setWhatsappStatus(status);
      } catch {
        // Preserve current status.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, []);

  async function connectWhatsApp() {
    try {
      setBusy(true);
      setError(null);
      setSuccess(null);

      const status = await window.appAPI.connectWhatsApp();
      if (status.state === 'error') {
        setError(status.message);
        return;
      }

      setWhatsappStatus(status);

      setSuccess(
        status.state === 'connected'
          ? 'WhatsApp Web is connected.'
          : 'WhatsApp Web opened. Scan the QR code if requested.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to open WhatsApp Web.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWhatsApp() {
    try {
      setBusy(true);
      setError(null);

      const status = await window.appAPI.disconnectWhatsApp();

      setWhatsappStatus(status);

      setSuccess(
        'WhatsApp Web browser closed. The local login profile was preserved.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to close WhatsApp Web.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSenderSettings() {
    if (!senderSettings) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setSuccess(null);

      const saved = await window.appAPI.updateSenderSettings(senderSettings);

      setSenderSettings(saved);

      setSuccess('Sender settings saved.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to save sender settings.',
      );
    } finally {
      setBusy(false);
    }
  }

  function updateSeconds(key: keyof SenderSettings, value: string) {
    if (!senderSettings) {
      return;
    }

    const parsed = Number(value);

    setSenderSettings({
      ...senderSettings,
      [key]: Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0,
    });
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Application configuration and system status."
        />

        <div className="flex items-center gap-3 rounded-2xl border bg-white p-6 text-sm text-slate-500">
          <LoaderCircle className="animate-spin" size={18} />
          Loading settings...
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Application configuration, WhatsApp Web connection, and sender pacing."
      />

      {error && (
        <InlineNotice message={error} onDismiss={() => setError(null)} />
      )}

      <div className="grid max-w-5xl gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-2.5">
                <Smartphone size={20} className="text-emerald-700" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">WhatsApp Web</h3>

                <p className="text-sm text-slate-500">
                  Connect your WhatsApp account to start sending.
                </p>
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                whatsappStatus?.state === 'connected'
                  ? 'bg-emerald-50 text-emerald-700'
                  : whatsappStatus?.state === 'waiting_for_qr'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {connectionLabel(whatsappStatus?.state)}
            </span>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            {whatsappStatus?.message ?? 'WhatsApp Web is not open.'}
          </p>

          {whatsappStatus?.browserName && (
            <p className="mt-2 text-xs text-slate-400">
              Browser: {whatsappStatus.browserName}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void connectWhatsApp()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <ExternalLink size={16} />
              Open WhatsApp Web
            </button>

            <button
              type="button"
              disabled={busy || whatsappStatus?.state === 'disconnected'}
              onClick={() => void disconnectWhatsApp()}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <Unplug size={16} />
              Disconnect WhatsApp
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Only send to contacts who have agreed to receive these messages.
            WhatsApp Web automation is not the same as the official WhatsApp
            Business Platform.
          </div>
        </section>

        {senderSettings && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="border-b pb-5">
              <h3 className="font-semibold text-slate-900">Sending speed</h3>

              <p className="mt-1 text-sm text-slate-500">
                Choose the time between messages and recipients. A random delay
                within your range keeps a natural pace.
              </p>
            </div>

            <div className="grid gap-5 pt-5 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Message delay minimum (seconds)
                <input
                  type="number"
                  min={7}
                  step={1}
                  value={seconds(senderSettings.messageDelayMinMs)}
                  onChange={(event) =>
                    updateSeconds('messageDelayMinMs', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Message delay maximum (seconds)
                <input
                  type="number"
                  min={7}
                  step={1}
                  value={seconds(senderSettings.messageDelayMaxMs)}
                  onChange={(event) =>
                    updateSeconds('messageDelayMaxMs', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Recipient delay minimum (seconds)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={seconds(senderSettings.recipientDelayMinMs)}
                  onChange={(event) =>
                    updateSeconds('recipientDelayMinMs', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Recipient delay maximum (seconds)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={seconds(senderSettings.recipientDelayMaxMs)}
                  onChange={(event) =>
                    updateSeconds('recipientDelayMaxMs', event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3"
                />
              </label>
            </div>

            <details className="advanced-settings mt-7">
              <summary>
                Advanced connection settings
                <small>Usually no changes needed</small>
              </summary>

              <div className="mt-4 grid gap-5 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Navigation
                  <input
                    type="number"
                    min={5}
                    value={seconds(senderSettings.navigationTimeoutMs)}
                    onChange={(event) =>
                      updateSeconds('navigationTimeoutMs', event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  UI action
                  <input
                    type="number"
                    min={5}
                    value={seconds(senderSettings.actionTimeoutMs)}
                    onChange={(event) =>
                      updateSeconds('actionTimeoutMs', event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </label>

                <label className="text-sm font-medium text-slate-700">
                  Media upload
                  <input
                    type="number"
                    min={10}
                    value={seconds(senderSettings.mediaUploadTimeoutMs)}
                    onChange={(event) =>
                      updateSeconds('mediaUploadTimeoutMs', event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border px-4 py-3"
                  />
                </label>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Defaults: 31 seconds navigation, 16 seconds UI actions, and 61
                seconds media upload.
              </p>
            </details>

            <button
              type="button"
              disabled={busy}
              onClick={() => void saveSenderSettings()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Save size={16} />
              Save Sender Settings
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold">General</h3>

          <div className="mt-5">
            <label className="text-sm font-medium text-slate-700">
              Default timezone
            </label>

            <input
              value="Asia/Colombo"
              readOnly
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </div>
        </section>
        <details className="advanced-settings">
          <summary>
            Storage & diagnostics<small>Optional technical information</small>
          </summary>{' '}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5">
                  <Database size={20} className="text-emerald-700" />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">Database</h3>

                  <p className="text-sm text-slate-500">Local SQLite storage</p>
                </div>
              </div>

              {databaseHealth?.connected ? (
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 size={16} />
                  Connected
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700">
                  <XCircle size={16} />
                  Error
                </div>
              )}
            </div>

            {databaseHealth && (
              <div className="mt-6">
                <p className="text-sm text-slate-500">
                  {databaseHealth.tableCount} database tables
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {databaseHealth.tables.map((table) => (
                    <span
                      key={table}
                      className="rounded-lg border bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                    >
                      {table}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </details>
      </div>
    </>
  );
}
