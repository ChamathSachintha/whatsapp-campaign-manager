export type RawContactRow = Record<string, string>;

export type ParsedContactFile = {
  fileName: string;
  fileType: 'csv' | 'md' | 'xlsx' | 'xls';
  columns: string[];
  rows: RawContactRow[];
};