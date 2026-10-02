import type { ContactValidationResult } from './imports';

export {};

declare global {
  interface Window {
    appAPI: {
      getVersion: () => Promise<string>;

      getDatabaseHealth: () => Promise<{
        connected: boolean;

        tables: string[];

        tableCount: number;
      }>;

      chooseContactFile: () => Promise<{
        canceled: boolean;

        filePath?: string;

        fileName?: string;

        fileType?: string;

        columns?: string[];

        suggestedPhoneColumn?: string | null;

        suggestedNameColumn?: string | null;

        sampleRows?: Array<Record<string, string>>;

        validationResult?: ContactValidationResult | null;
      }>;

      validateContactFile: (options: {
        filePath: string;

        phoneColumn: string;

        nameColumn?: string | null;
      }) => Promise<ContactValidationResult>;

      saveContactImport: (options: {
        filePath: string;

        phoneColumn: string;

        nameColumn?: string | null;

        sourceNote?: string | null;
      }) => Promise<{
        importId: string;

        totalRows: number;

        validRows: number;

        invalidRows: number;

        duplicateRows: number;
      }>;

      listSavedImports: () => Promise<
        Array<{
          id: string;

          filename: string;

          fileType: string;

          importedAt: string;

          totalRows: number;

          validRows: number;

          invalidRows: number;

          duplicateRows: number;
        }>
      >;

      getSavedImportDetails: (importId: string) => Promise<{
        id: string;

        filename: string;

        fileType: string;

        importedAt: string;

        totalRows: number;

        validRows: number;

        invalidRows: number;

        duplicateRows: number;

        contacts: Array<{
          id: string;

          name: string;

          originalPhone: string;

          normalizedPhone: string | null;

          validationStatus: string;

          validationReason: string | null;

          isDuplicate: boolean;

          rowNumber: number | null;
        }>;
      }>;

      deleteSavedImport: (importId: string) => Promise<{
        importId: string;

        deletedContacts: number;

        detachedCampaigns: number;
      }>;

      chooseCampaignAttachment: (type: 'image' | 'document') => Promise<
        | {
            canceled: true;
          }
        | {
            canceled: false;

            filePath: string;

            fileName: string;

            extension: string;

            sizeBytes: number;
          }
      >;

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
      }) => Promise<{
        campaignId: string;

        recipientCount: number;

        messageCount: number;

        mediaCount: number;
      }>;

      listSavedCampaigns: () => Promise<
        Array<{
          id: string;

          name: string;

          description: string | null;

          status: string;

          importId: string | null;

          createdAt: string;

          updatedAt: string;

          recipientCount: number;

          messageCount: number;

          mediaCount: number;
        }>
      >;

      getSavedCampaignDetails: (campaignId: string) => Promise<{
        id: string;

        name: string;

        description: string | null;

        status: string;

        importId: string | null;

        importFilename: string | null;

        createdAt: string;

        updatedAt: string;

        totalRecipients: number;

        eligibleRecipients: number;

        processedCount: number;

        successCount: number;

        failureCount: number;

        messages: Array<{
          id: string;

          position: number;

          type: string;

          textContent: string | null;

          caption: string | null;

          media: {
            id: string;

            originalFilename: string;

            mimeType: string | null;

            fileSize: number | null;
          } | null;
        }>;

        recipients: Array<{
          id: string;

          name: string | null;

          normalizedPhone: string;

          originalPhone: string | null;

          status: string;
        }>;
      }>;

      getCampaignMediaPreview: (mediaAssetId: string) => Promise<{
        mediaAssetId: string;

        fileName: string;

        mimeType: string;

        dataUrl: string;
      }>;

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
      }) => Promise<{
        campaignId: string;

        messageCount: number;

        mediaCount: number;
      }>;

      deleteCampaign: (campaignId: string) => Promise<{
        campaignId: string;

        deletedMessages: number;

        deletedRecipients: number;

        deletedMedia: number;
      }>;
    };
  }
}
