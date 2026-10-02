import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
} from 'electron';
import path from 'node:path';
import { parseContactFile } from './services/imports/file-parser';
import {
  detectContactColumns,
} from './services/imports/column-detector';
import {
  validateContacts,
} from './services/imports/contact-validator';
import started from 'electron-squirrel-startup';
import {
  closeDatabase,
  initializeDatabase,
} from './db/database';
import { getDatabaseHealth } from './db/health';


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
  ipcMain.handle(
  'database:get-health',
  () => {
    console.log('[IPC] database:get-health called');

    const result = getDatabaseHealth();

    console.log(
      '[IPC] database health result:',
      result,
    );

    return result;
  },
);

  ipcMain.handle(
  'imports:choose-file',
  async () => {
    const result =
      await dialog.showOpenDialog({
        title: 'Choose Contact File',

        properties: ['openFile'],

        filters: [
          {
            name: 'Contact Files',
            extensions: [
              'csv',
              'md',
              'xlsx',
              'xls',
            ],
          },
        ],
      });

    if (
      result.canceled ||
      result.filePaths.length === 0
    ) {
      return {
        canceled: true,
      };
    }

    const filePath =
      result.filePaths[0];

    const parsed =
      parseContactFile(filePath);

    const detectedColumns =
  detectContactColumns(
    parsed.columns,
    parsed.rows,
  );

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
    const parsed =
      parseContactFile(
        options.filePath,
      );

    if (
      !parsed.columns.includes(
        options.phoneColumn,
      )
    ) {
      throw new Error(
        'Selected phone column does not exist in the file.',
      );
    }

    if (
      options.nameColumn &&
      !parsed.columns.includes(
        options.nameColumn,
      )
    ) {
      throw new Error(
        'Selected name column does not exist in the file.',
      );
    }

    return validateContacts({
      rows: parsed.rows,

      phoneColumn:
        options.phoneColumn,

      nameColumn:
        options.nameColumn ?? null,
    });
  },
);

const validationResult =
  detectedColumns.phoneColumn
    ? validateContacts({
        rows: parsed.rows,
        phoneColumn:
          detectedColumns.phoneColumn,
        nameColumn:
          detectedColumns.nameColumn,
      })
    : null;

return {
  canceled: false,

  filePath,

  fileName:
    parsed.fileName,

  fileType:
    parsed.fileType,

  columns:
    parsed.columns,

  suggestedPhoneColumn:
    detectedColumns.phoneColumn,

  suggestedNameColumn:
    detectedColumns.nameColumn,

  sampleRows:
    parsed.rows.slice(0, 5),

  validationResult,
  };
  },
);

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
  closeDatabase();
});
