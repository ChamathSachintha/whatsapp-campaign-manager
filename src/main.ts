import { app, BrowserWindow, dialog, ipcMain } from 'electron';

import path from 'node:path';

import started from 'electron-squirrel-startup';

import { closeDatabase, initializeDatabase } from './db/database';

import { getDatabaseHealth } from './db/health';

import { chooseCampaignAttachment } from './services/campaigns/media-picker';

import {
  deleteCampaignDraft,
  getCampaignMediaPreview,
  getSavedCampaignDetails,
  listSavedCampaigns,
  saveCampaignDraft,
  updateCampaignDraft,
} from './services/campaigns/campaign-repository';

import { detectContactColumns } from './services/imports/column-detector';

import { validateContacts } from './services/imports/contact-validator';

import { parseContactFile } from './services/imports/file-parser';

import {
  deleteSavedImport,
  getSavedImportDetails,
  listSavedImports,
  saveValidatedImport,
} from './services/imports/import-repository';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

/* =========================================================
   SQUIRREL
   ========================================================= */

if (started) {
  app.quit();
}

/* =========================================================
   WINDOW
   ========================================================= */

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

/* =========================================================
   APP READY
   ========================================================= */

app.whenReady().then(() => {
  initializeDatabase();

  /* -------------------------------------------------------
       DATABASE
       ------------------------------------------------------- */

  ipcMain.handle('database:get-health', () => getDatabaseHealth());

  /* -------------------------------------------------------
       IMPORTS - CHOOSE FILE
       ------------------------------------------------------- */

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

  /* -------------------------------------------------------
       IMPORTS - LIST
       ------------------------------------------------------- */

  ipcMain.handle('imports:list', () => listSavedImports());

  /* -------------------------------------------------------
       IMPORTS - DETAILS
       ------------------------------------------------------- */

  ipcMain.handle('imports:get-details', (_event, importId: string) => {
    const result = getSavedImportDetails(importId);

    if (!result) {
      throw new Error('Saved import was not found.');
    }

    return result;
  });

  /* -------------------------------------------------------
       IMPORTS - VALIDATE
       ------------------------------------------------------- */

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

  /* -------------------------------------------------------
       IMPORTS - SAVE
       ------------------------------------------------------- */

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

  /* -------------------------------------------------------
       IMPORTS - DELETE
       ------------------------------------------------------- */

  ipcMain.handle('imports:delete', (_event, importId: string) =>
    deleteSavedImport(importId),
  );

  /* -------------------------------------------------------
       CAMPAIGN ATTACHMENT PICKER
       ------------------------------------------------------- */

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

  /* -------------------------------------------------------
       CAMPAIGNS - SAVE DRAFT
       ------------------------------------------------------- */

  ipcMain.handle(
    'campaigns:save-draft',
    (
      _event,

      options: {
        name: string;

        description?: string | null;

        importId: string;

        messages: Array<{
          type:
            | 'text'
            | 'image'
            | 'image-caption'
            | 'document'
            | 'document-caption';

          text?: string | null;

          caption?: string | null;

          filePath?: string | null;

          fileName?: string | null;

          fileExtension?: string | null;

          fileSizeBytes?: number | null;
        }>;
      },
    ) => saveCampaignDraft(options),
  );

  /* -------------------------------------------------------
       CAMPAIGNS - LIST
       ------------------------------------------------------- */

  ipcMain.handle('campaigns:list', () => listSavedCampaigns());

  /* -------------------------------------------------------
       CAMPAIGNS - DETAILS
       ------------------------------------------------------- */

  ipcMain.handle('campaigns:get-details', (_event, campaignId: string) => {
    const result = getSavedCampaignDetails(campaignId);

    if (!result) {
      throw new Error('Campaign was not found.');
    }

    return result;
  });

  /* -------------------------------------------------------
       CAMPAIGNS - IMAGE PREVIEW
       ------------------------------------------------------- */

  ipcMain.handle(
    'campaigns:get-media-preview',
    (_event, mediaAssetId: string) => getCampaignMediaPreview(mediaAssetId),
  );

  /* -------------------------------------------------------
       CAMPAIGNS - UPDATE DRAFT
       ------------------------------------------------------- */

  ipcMain.handle(
    'campaigns:update-draft',
    (
      _event,

      options: {
        campaignId: string;

        name: string;

        description?: string | null;

        messages: Array<{
          type:
            | 'text'
            | 'image'
            | 'image-caption'
            | 'document'
            | 'document-caption';

          text?: string | null;

          caption?: string | null;

          filePath?: string | null;

          fileName?: string | null;

          fileExtension?: string | null;

          fileSizeBytes?: number | null;

          existingMediaAssetId?: string | null;
        }>;
      },
    ) => updateCampaignDraft(options),
  );

  /* -------------------------------------------------------
       CAMPAIGNS - DELETE
       ------------------------------------------------------- */

  ipcMain.handle('campaigns:delete', (_event, campaignId: string) =>
    deleteCampaignDraft(campaignId),
  );

  /* -------------------------------------------------------
       VERSION
       ------------------------------------------------------- */

  ipcMain.handle('app:get-version', () => app.getVersion());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/* =========================================================
   CLOSE
   ========================================================= */

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
