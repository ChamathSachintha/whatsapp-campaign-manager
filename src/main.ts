import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import path from 'node:path';

import started from 'electron-squirrel-startup';

import { closeDatabase, initializeDatabase } from './db/database';

import { getDatabaseHealth } from './db/health';

import {
  cancelCampaignExecution,
  listCampaignHistory,
  listDeliveryCampaigns,
  pauseRunningCampaign,
  recoverInterruptedCampaigns,
  resumeCampaign,
  retryFailedCampaign,
} from './services/campaigns/campaign-execution-repository';

import {
  startCampaignExecutor,
  stopCampaignExecutor,
} from './services/campaigns/campaign-executor';

import { chooseCampaignAttachment } from './services/campaigns/media-picker';

import {
  cancelCampaignSchedule,
  deleteCampaignDraft,
  getCampaignMediaPreview,
  getSavedCampaignDetails,
  listSavedCampaigns,
  listScheduledCampaigns,
  processDueCampaigns,
  queueCampaignNow,
  rescheduleCampaign,
  returnQueuedCampaignToDraft,
  saveCampaignDraft,
  scheduleCampaign,
  updateCampaignDraft,
} from './services/campaigns/campaign-repository';

import {
  startCampaignScheduler,
  stopCampaignScheduler,
} from './services/campaigns/campaign-scheduler';

import { detectContactColumns } from './services/imports/column-detector';

import { validateContacts } from './services/imports/contact-validator';

import { parseContactFile } from './services/imports/file-parser';

import {
  deleteSavedImport,
  getSavedImportDetails,
  listSavedImports,
  saveValidatedImport,
} from './services/imports/import-repository';

import {
  getSenderSettings,
  updateSenderSettings,
} from './services/settings/sender-settings';

import {
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppStatus,
} from './services/whatsapp/whatsapp-service';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;

declare const MAIN_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1360,

    height: 860,

    minWidth: 1100,

    minHeight: 700,

    show: false,

    backgroundColor: '#f8fafc',

    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),

      contextIsolation: true,

      nodeIntegration: false,

      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(
        __dirname,

        `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`,
      ),
    );
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

app.whenReady().then(() => {
  initializeDatabase();

  const recoveredCount = recoverInterruptedCampaigns();

  if (recoveredCount > 0) {
    console.log(
      `[Campaign Executor] Recovered ${recoveredCount} interrupted campaign(s) as paused.`,
    );
  }

  startCampaignScheduler();

  startCampaignExecutor();

  ipcMain.handle('database:get-health', () => getDatabaseHealth());

  ipcMain.handle('imports:choose-file', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose Contact File',

      properties: ['openFile'],

      filters: [
        {
          name: 'Contact Files',

          extensions: ['csv', 'md', 'xlsx', 'xls'],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        canceled: true,
      };
    }

    const filePath = result.filePaths[0];

    const parsed = parseContactFile(filePath);

    const detectedColumns = detectContactColumns(parsed.columns, parsed.rows);

    const validationResult = detectedColumns.phoneColumn
      ? validateContacts({
          rows: parsed.rows,

          phoneColumn: detectedColumns.phoneColumn,

          nameColumn: detectedColumns.nameColumn,
        })
      : null;

    return {
      canceled: false,

      filePath,

      fileName: parsed.fileName,

      fileType: parsed.fileType,

      columns: parsed.columns,

      suggestedPhoneColumn: detectedColumns.phoneColumn,

      suggestedNameColumn: detectedColumns.nameColumn,

      sampleRows: parsed.rows.slice(0, 5),

      validationResult,
    };
  });

  ipcMain.handle('imports:list', () => listSavedImports());

  ipcMain.handle('imports:get-details', (_event, importId: string) => {
    const result = getSavedImportDetails(importId);

    if (!result) {
      throw new Error('Saved import was not found.');
    }

    return result;
  });

  ipcMain.handle(
    'imports:validate-file',
    (
      _event,

      options: {
        filePath: string;

        phoneColumn: string;

        nameColumn?: string | null;
      },
    ) => {
      const parsed = parseContactFile(options.filePath);

      if (!parsed.columns.includes(options.phoneColumn)) {
        throw new Error('Selected phone column does not exist in the file.');
      }

      if (options.nameColumn && !parsed.columns.includes(options.nameColumn)) {
        throw new Error('Selected name column does not exist in the file.');
      }

      return validateContacts({
        rows: parsed.rows,

        phoneColumn: options.phoneColumn,

        nameColumn: options.nameColumn ?? null,
      });
    },
  );

  ipcMain.handle(
    'imports:save',
    (
      _event,

      options: {
        filePath: string;

        phoneColumn: string;

        nameColumn?: string | null;

        sourceNote?: string | null;
      },
    ) => {
      const parsed = parseContactFile(options.filePath);

      if (!parsed.columns.includes(options.phoneColumn)) {
        throw new Error('Selected phone column does not exist in the file.');
      }

      if (options.nameColumn && !parsed.columns.includes(options.nameColumn)) {
        throw new Error('Selected name column does not exist in the file.');
      }

      const validationResult = validateContacts({
        rows: parsed.rows,

        phoneColumn: options.phoneColumn,

        nameColumn: options.nameColumn ?? null,
      });

      return saveValidatedImport({
        filePath: options.filePath,

        fileName: parsed.fileName,

        fileType: parsed.fileType,

        validationResult,

        sourceNote: options.sourceNote ?? null,
      });
    },
  );

  ipcMain.handle('imports:delete', (_event, importId: string) =>
    deleteSavedImport(importId),
  );

  ipcMain.handle(
    'campaigns:choose-attachment',
    (
      _event,

      type: 'image' | 'document',
    ) => {
      if (type !== 'image' && type !== 'document') {
        throw new Error('Invalid campaign attachment type.');
      }

      return chooseCampaignAttachment(type);
    },
  );

  ipcMain.handle(
    'campaigns:save-draft',
    (
      _event,

      options: Parameters<typeof saveCampaignDraft>[0],
    ) => saveCampaignDraft(options),
  );

  ipcMain.handle('campaigns:list', () => listSavedCampaigns());

  ipcMain.handle('campaigns:get-details', (_event, campaignId: string) => {
    const result = getSavedCampaignDetails(campaignId);

    if (!result) {
      throw new Error('Campaign was not found.');
    }

    return result;
  });

  ipcMain.handle(
    'campaigns:get-media-preview',
    (_event, mediaAssetId: string) => getCampaignMediaPreview(mediaAssetId),
  );

  ipcMain.handle(
    'campaigns:update-draft',
    (
      _event,

      options: Parameters<typeof updateCampaignDraft>[0],
    ) => updateCampaignDraft(options),
  );

  ipcMain.handle('campaigns:delete', (_event, campaignId: string) =>
    deleteCampaignDraft(campaignId),
  );

  ipcMain.handle('campaigns:queue-now', (_event, campaignId: string) =>
    queueCampaignNow(campaignId),
  );

  ipcMain.handle(
    'campaigns:schedule',
    (
      _event,

      options: {
        campaignId: string;

        scheduledLocalDateTime: string;
      },
    ) => scheduleCampaign(options.campaignId, options.scheduledLocalDateTime),
  );

  ipcMain.handle(
    'campaigns:reschedule',
    (
      _event,

      options: {
        campaignId: string;

        scheduledLocalDateTime: string;
      },
    ) => rescheduleCampaign(options.campaignId, options.scheduledLocalDateTime),
  );

  ipcMain.handle('campaigns:cancel-schedule', (_event, campaignId: string) =>
    cancelCampaignSchedule(campaignId),
  );

  ipcMain.handle('campaigns:return-to-draft', (_event, campaignId: string) =>
    returnQueuedCampaignToDraft(campaignId),
  );

  ipcMain.handle('campaigns:list-scheduled', () => {
    processDueCampaigns();

    return listScheduledCampaigns();
  });

  ipcMain.handle('delivery:list', () => {
    processDueCampaigns();

    return listDeliveryCampaigns();
  });

  ipcMain.handle('delivery:pause', (_event, campaignId: string) =>
    pauseRunningCampaign(campaignId),
  );

  ipcMain.handle('delivery:resume', (_event, campaignId: string) =>
    resumeCampaign(campaignId),
  );

  ipcMain.handle('delivery:cancel', (_event, campaignId: string) =>
    cancelCampaignExecution(campaignId),
  );

  ipcMain.handle('delivery:retry', (_event, campaignId: string) =>
    retryFailedCampaign(campaignId),
  );

  ipcMain.handle('history:list', () => listCampaignHistory());

  ipcMain.handle('sender:get-settings', () => getSenderSettings());

  ipcMain.handle(
    'sender:update-settings',
    (
      _event,

      settings: Parameters<typeof updateSenderSettings>[0],
    ) => updateSenderSettings(settings),
  );

  ipcMain.handle('whatsapp:connect', () => connectWhatsApp());

  ipcMain.handle('whatsapp:disconnect', () => disconnectWhatsApp());

  ipcMain.handle('whatsapp:get-status', () => getWhatsAppStatus());

  ipcMain.handle('app:get-version', () => app.getVersion());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopCampaignExecutor();

  stopCampaignScheduler();

  void disconnectWhatsApp();

  closeDatabase();
});
