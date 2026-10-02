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
  },
);