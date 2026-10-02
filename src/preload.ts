import {
  contextBridge,
  ipcRenderer,
} from 'electron';

contextBridge.exposeInMainWorld(
  'appAPI',
  {
    getVersion: () =>
      ipcRenderer.invoke(
        'app:get-version',
      ),

    getDatabaseHealth: () =>
      ipcRenderer.invoke(
        'database:get-health',
      ),

    chooseContactFile: () =>
      ipcRenderer.invoke(
        'imports:choose-file',
      ),

    validateContactFile: (
      options: {
        filePath: string;
        phoneColumn: string;
        nameColumn?: string | null;
      },
    ) =>
      ipcRenderer.invoke(
        'imports:validate-file',
        options,
      ),

    saveContactImport: (
      options: {
        filePath: string;
        phoneColumn: string;
        nameColumn?: string | null;
        sourceNote?: string | null;
      },
    ) =>
      ipcRenderer.invoke(
        'imports:save',
        options,
      ),

    listSavedImports: () =>
      ipcRenderer.invoke(
        'imports:list',
      ),

    getSavedImportDetails: (
      importId: string,
    ) =>
      ipcRenderer.invoke(
        'imports:get-details',
        importId,
      ),

    deleteSavedImport: (
      importId: string,
    ) =>
      ipcRenderer.invoke(
        'imports:delete',
        importId,
      ),
  },
);