import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),

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

  getSavedCampaignDetails: (campaignId: string) =>
    ipcRenderer.invoke('campaigns:get-details', campaignId),

  getCampaignMediaPreview: (mediaAssetId: string) =>
    ipcRenderer.invoke('campaigns:get-media-preview', mediaAssetId),

  updateCampaignDraft: (options: {
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
});
