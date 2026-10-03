import { AlertTriangle, Loader2, Monitor, Power, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AppCloseAction, AppCloseStatus } from '../types/app-lifecycle';
import { Modal } from './Modal';

export function AppCloseDialog() {
  const [status, setStatus] = useState<AppCloseStatus | null>(null);
  const [busy, setBusy] = useState<AppCloseAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const receive = (value: AppCloseStatus) => {
      if (active) {
        setError(null);
        setStatus(value);
      }
    };
    const unsubscribe = window.appAPI.onAppCloseRequested(receive);
    void window.appAPI
      .getAppCloseStatus()
      .then((value) => {
        if (value?.requested) receive(value);
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  const open = Boolean(status);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setInterval(() => {
      void window.appAPI
        .getAppCloseStatus()
        .then((value) => {
          if (active && value?.requested) setStatus(value);
        })
        .catch(() => {});
    }, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open]);

  async function respond(action: AppCloseAction) {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      await window.appAPI.respondToAppClose(action);
      setStatus(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to close the application. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }
  if (!status) return null;
  const running = status.runningCampaigns > 0;
  return (
    <Modal
      label="Keep Outreach running?"
      onClose={() => void respond('cancel')}
      busy={busy !== null}
      error={error}
    >
      <div className="close-dialog">
        <div className="close-heading">
          <span className="confirmation-symbol">
            <Monitor size={26} />
          </span>
          <button
            type="button"
            className="button button-icon button-quiet"
            disabled={busy !== null}
            aria-label="Keep app open"
            onClick={() => void respond('cancel')}
          >
            <X size={18} />
          </button>
        </div>
        <h2>Keep Outreach running?</h2>
        <p>
          Minimize to the system tray to keep your campaigns and scheduled
          messages running in the background.
        </p>
        {running && (
          <div role="alert" className="close-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>A campaign is sending right now.</strong>
              <p>
                Quitting stops the current sending process. A message already
                being submitted may still go through; uncertain messages will be
                flagged for review when you reopen the app.
              </p>
            </div>
          </div>
        )}
        <dl className="close-summary">
          <div>
            <dt>Sending now</dt>
            <dd>{status.runningCampaigns}</dd>
          </div>
          <div>
            <dt>In the queue</dt>
            <dd>{status.queuedCampaigns}</dd>
          </div>
          <div>
            <dt>Scheduled</dt>
            <dd>{status.scheduledCampaigns}</dd>
          </div>
        </dl>
        {!status.trayAvailable && (
          <div className="inline-notice toast-error">
            The system tray is unavailable. Keep the window open to continue
            sending.
          </div>
        )}
        <p className="close-hint">
          Tray mode keeps the app open. Keep your computer awake and WhatsApp
          connected. Click the Outreach tray icon to return.
        </p>
        <div className="close-actions">
          <button
            type="button"
            className="button button-primary"
            disabled={busy !== null || !status.trayAvailable}
            onClick={() => void respond('tray')}
          >
            <Monitor size={17} />
            Keep sending in tray
          </button>
          <button
            type="button"
            className="button button-danger"
            disabled={busy !== null}
            onClick={() => void respond('quit')}
          >
            {busy === 'quit' ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Power size={17} />
            )}
            {busy === 'quit' ? 'Stopping sending…' : 'Quit app'}
          </button>
          <button
            type="button"
            className="button button-quiet"
            disabled={busy !== null}
            onClick={() => void respond('cancel')}
          >
            Keep app open
          </button>
        </div>
        <p className="close-hint">
          If you quit, queued and scheduled messages wait until the app is
          opened again. Interrupted campaigns stay paused for review.
        </p>
      </div>
    </Modal>
  );
}
