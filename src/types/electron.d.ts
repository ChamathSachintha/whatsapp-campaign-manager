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
    };
  }
}