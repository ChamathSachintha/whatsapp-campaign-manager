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

        sampleRows?: Array<
          Record<string, string>
        >;
      }>;
    };
  }
}