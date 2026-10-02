export type RawContactRow =
  Record<string, string>;

export type ParsedContactFile = {
  fileName: string;

  fileType:
    | 'csv'
    | 'md'
    | 'xlsx'
    | 'xls';

  columns: string[];

  rows: RawContactRow[];
};

export type ContactFileInspection = {
  canceled: boolean;

  filePath?: string;

  fileName?: string;

  fileType?: string;

  columns?: string[];

  suggestedPhoneColumn?: string | null;

  suggestedNameColumn?: string | null;

  sampleRows?: RawContactRow[];
};