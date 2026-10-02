import type {
  ContactValidationResult,
} from './imports';

export {};

declare global {
  interface Window {
    appAPI: {
      getVersion: () =>
        Promise<string>;

      getDatabaseHealth: () =>
        Promise<{
          connected: boolean;
          tables: string[];
          tableCount: number;
        }>;

      chooseContactFile: () =>
        Promise<{
          canceled: boolean;

          filePath?: string;

          fileName?: string;

          fileType?: string;

          columns?: string[];

          suggestedPhoneColumn?:
            | string
            | null;

          suggestedNameColumn?:
            | string
            | null;

          sampleRows?: Array<
            Record<string, string>
          >;

          validationResult?:
            | ContactValidationResult
            | null;
        }>;

      validateContactFile: (
        options: {
          filePath: string;
          phoneColumn: string;
          nameColumn?: string | null;
        },
      ) =>
        Promise<ContactValidationResult>;

      saveContactImport: (
        options: {
          filePath: string;
          phoneColumn: string;
          nameColumn?: string | null;
          sourceNote?: string | null;
        },
      ) =>
        Promise<{
          importId: string;
          totalRows: number;
          validRows: number;
          invalidRows: number;
          duplicateRows: number;
        }>;

      listSavedImports: () =>
        Promise<
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

      getSavedImportDetails: (
        importId: string,
      ) =>
        Promise<{
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

            normalizedPhone:
              | string
              | null;

            validationStatus: string;

            validationReason:
              | string
              | null;

            isDuplicate: boolean;

            rowNumber:
              | number
              | null;
          }>;
        }>;

      deleteSavedImport: (
        importId: string,
      ) =>
        Promise<{
          importId: string;
          deletedContacts: number;
          detachedCampaigns: number;
        }>;
    };
  }
}