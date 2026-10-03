import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appAPI', {
  getAppCloseStatus: () => ipcRenderer.invoke('app:get-close-status'),
  respondToAppClose: (action: import('./types/app-lifecycle').AppCloseAction) =>
    ipcRenderer.invoke('app:close-response', action),
  onAppCloseRequested: (
    callback: (status: import('./types/app-lifecycle').AppCloseStatus) => void,
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: import('./types/app-lifecycle').AppCloseStatus,
    ) => callback(status);
    ipcRenderer.on('app:close-requested', listener);
    return () => ipcRenderer.removeListener('app:close-requested', listener);
  },
  getDatabaseHealth: () => ipcRenderer.invoke('database:get-health'),

  chooseContactFile: () => ipcRenderer.invoke('imports:choose-file'),

  validateContactFile: (options: {
    filePath: string;

    phoneColumn: string;

    nameColumn?: string | null;
  }) => ipcRenderer.invoke('imports:validate-file', options),

  saveContactImport: (options: {
    filePath: string;

    phoneColumn: string;

    nameColumn?: string | null;

    sourceNote?: string | null;
  }) => ipcRenderer.invoke('imports:save', options),

  listSavedImports: () => ipcRenderer.invoke('imports:list'),

  getSavedImportDetails: (importId: string) =>
    ipcRenderer.invoke('imports:get-details', importId),

  deleteSavedImport: (importId: string) =>
    ipcRenderer.invoke('imports:delete', importId),

  chooseCampaignAttachment: (type: 'image' | 'document') =>
    ipcRenderer.invoke('campaigns:choose-attachment', type),

  saveCampaignDraft: (options: {
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
  }) => ipcRenderer.invoke('campaigns:save-draft', options),

  listSavedCampaigns: () => ipcRenderer.invoke('campaigns:list'),
  reuseCampaignDraft: (
    options: import('./services/campaigns/campaign-repository').SaveCampaignDraftOptions & {
      sourceCampaignId: string;
    },
  ) => ipcRenderer.invoke('campaigns:reuse', options),
  removeExpiredCampaignHistory: () =>
    ipcRenderer.invoke('history:remove-expired'),

  getSavedCampaignDetails: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:get-details', campaignId),

  getCampaignMediaPreview: (mediaAssetId: string) =>
    ipcRenderer.invoke('campaigns:get-media-preview', mediaAssetId),

  updateCampaignDraft: (options: {
    campaignId: string;
    importId?: string;

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
  }) => ipcRenderer.invoke('campaigns:update-draft', options),

  deleteCampaign: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:delete', campaignId),

  queueCampaignNow: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:queue-now', campaignId),

  scheduleCampaign: (options: {
    campaignId: string;

    scheduledLocalDateTime: string;
  }) => ipcRenderer.invoke('campaigns:schedule', options),

  rescheduleCampaign: (options: {
    campaignId: string;

    scheduledLocalDateTime: string;
  }) => ipcRenderer.invoke('campaigns:reschedule', options),

  cancelCampaignSchedule: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:cancel-schedule', campaignId),

  returnQueuedCampaignToDraft: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:return-to-draft', campaignId),

  listScheduledCampaigns: () => ipcRenderer.invoke('campaigns:list-scheduled'),

  listDeliveryCampaigns: () => ipcRenderer.invoke('delivery:list'),

  pauseCampaign: (campaignId: string) =>
    ipcRenderer.invoke('delivery:pause', campaignId),

  resumeCampaign: (campaignId: string) =>
    ipcRenderer.invoke('delivery:resume', campaignId),

  cancelCampaignExecution: (campaignId: string) =>
    ipcRenderer.invoke('delivery:cancel', campaignId),

  retryFailedCampaign: (campaignId: string) =>
    ipcRenderer.invoke('delivery:retry', campaignId),

  listCampaignHistory: () => ipcRenderer.invoke('history:list'),

  getCampaignReport: (campaignId: string) =>
    ipcRenderer.invoke('reports:get', campaignId),

  exportCampaignReportCsv: (options: {
    campaignId: string;

    kind: 'summary' | 'details';
  }) => ipcRenderer.invoke('reports:export-csv', options),

  getSenderSettings: () => ipcRenderer.invoke('sender:get-settings'),

  updateSenderSettings: (settings: {
    messageDelayMinMs: number;

    messageDelayMaxMs: number;

    recipientDelayMinMs: number;

    recipientDelayMaxMs: number;

    navigationTimeoutMs: number;

    actionTimeoutMs: number;

    mediaUploadTimeoutMs: number;
  }) => ipcRenderer.invoke('sender:update-settings', settings),

  connectWhatsApp: () => ipcRenderer.invoke('whatsapp:connect'),

  disconnectWhatsApp: () => ipcRenderer.invoke('whatsapp:disconnect'),

  getWhatsAppStatus: () => ipcRenderer.invoke('whatsapp:get-status'),
});
