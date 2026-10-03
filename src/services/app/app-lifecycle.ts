import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron';
import { closeDatabase, getDatabase } from '../../db/database';
import { recoverInterruptedCampaigns } from '../campaigns/campaign-execution-repository';
import {
  startCampaignExecutor,
  stopCampaignExecutor,
} from '../campaigns/campaign-executor';
import {
  startCampaignScheduler,
  stopCampaignScheduler,
} from '../campaigns/campaign-scheduler';
import { disconnectWhatsApp } from '../whatsapp/whatsapp-service';
import type { AppCloseAction, AppCloseStatus } from '../../types/app-lifecycle';
import { TRAY_ICON_DATA_URL } from './tray-icon';

export function createAppLifecycle(window: BrowserWindow) {
  let tray: Tray | null = null;
  let requested = false;
  let allowQuit = false;
  let shutdown: Promise<void> | null = null;

  function showWindow() {
    if (window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }

  function getCloseStatus(): AppCloseStatus {
    const counts = getDatabase()
      .prepare(`SELECT
      SUM(CASE WHEN status = 'running' OR EXISTS (SELECT 1 FROM message_deliveries d WHERE d.campaign_id = campaigns.id AND d.status = 'sending') THEN 1 ELSE 0 END) AS running,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled
      FROM campaigns`)
      .get() as {
      running: number | null;
      queued: number | null;
      scheduled: number | null;
    };
    return {
      requested,
      runningCampaigns: counts.running ?? 0,
      queuedCampaigns: counts.queued ?? 0,
      scheduledCampaigns: counts.scheduled ?? 0,
      trayAvailable: tray !== null,
    };
  }

  function requestClose() {
    if (allowQuit || shutdown) return;
    showWindow();
    if (requested) return;
    requested = true;
    const send = () => {
      if (!window.isDestroyed())
        window.webContents.send('app:close-requested', getCloseStatus());
    };
    if (window.webContents.isLoading())
      window.webContents.once('did-finish-load', send);
    else send();
  }

  async function quit() {
    stopCampaignScheduler();
    const idle = stopCampaignExecutor();
    try {
      await disconnectWhatsApp();
      await idle;
      recoverInterruptedCampaigns('shutdown');
      closeDatabase();
      allowQuit = true;
      tray?.destroy();
      tray = null;
      app.quit();
    } catch (error) {
      await idle;
      shutdown = null;
      startCampaignScheduler();
      startCampaignExecutor();
      showWindow();
      throw error;
    }
  }

  async function respond(action: AppCloseAction) {
    if (!['tray', 'quit', 'cancel'].includes(action))
      throw new Error('Unknown close action.');
    if (!requested) throw new Error('No close request is pending.');
    if (shutdown) return shutdown;
    if (action === 'cancel') {
      requested = false;
      return;
    }
    if (action === 'tray') {
      if (!tray)
        throw new Error(
          'The system tray is unavailable. Keep the window open or choose Quit app.',
        );
      requested = false;
      window.hide();
      return;
    }
    shutdown = quit();
    return shutdown;
  }

  window.on('close', (event) => {
    if (!allowQuit) {
      event.preventDefault();
      requestClose();
    }
  });
  try {
    tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON_DATA_URL));
    tray.setToolTip('Outreach — running in the background');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Open Outreach', click: showWindow },
        { type: 'separator' },
        { label: 'Quit app…', click: requestClose },
      ]),
    );
    tray.on('double-click', showWindow);
    tray.on('click', showWindow);
  } catch (error) {
    console.error('[System tray] Unable to create tray icon.', error);
  }
  return {
    showWindow,
    requestClose,
    getCloseStatus,
    respond,
    canQuit: () => allowQuit,
  };
}
