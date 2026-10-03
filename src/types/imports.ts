export type RawContactRow = Record<string, string>;

export type ParsedContactFile = {
  fileName: string;

  fileType: 'csv' | 'md' | 'xlsx' | 'xls';

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

  validationResult?: ContactValidationResult | null;
};

/* =========================================================
   CONTACT VALIDATION
   ========================================================= */

export type ContactRowStatus = 'valid' | 'invalid' | 'duplicate';

export type ValidatedContact = {
  rowNumber: number;

  name: string;

  originalPhone: string;

  normalizedPhone: string | null;

  status: ContactRowStatus;

  reason: string | null;

  sourceRow: RawContactRow;
};

export type ContactValidationSummary = {
  totalRows: number;

  validRows: number;

  invalidRows: number;

  duplicateRows: number;
};

export type ContactValidationResult = {
  contacts: ValidatedContact[];

  summary: ContactValidationSummary;
};
