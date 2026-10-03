import fs from 'node:fs';
import path from 'node:path';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import type { ParsedContactFile, RawContactRow } from '../../types/imports';

/* =========================================================
   HELPERS
   ========================================================= */

function cleanValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeRow(row: Record<string, unknown>): RawContactRow {
  const result: RawContactRow = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim();

    if (!cleanKey) {
      continue;
    }

    result[cleanKey] = cleanValue(value);
  }

  return result;
}

function collectColumns(rows: RawContactRow[]): string[] {
  const columns = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }

  return Array.from(columns);
}

/* =========================================================
   CSV
   ========================================================= */

function parseCsv(filePath: string): ParsedContactFile {
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const parsed = Papa.parse<Record<string, unknown>>(fileContent, {
    header: true,
    skipEmptyLines: 'greedy',

    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(parsed.errors[0]?.message ?? 'Unable to parse CSV file.');
  }

  const rows = parsed.data
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== ''));

  if (rows.length === 0) {
    throw new Error('The CSV file does not contain any data rows.');
  }

  const columns = parsed.meta.fields?.filter(Boolean) ?? collectColumns(rows);

  return {
    fileName: path.basename(filePath),
    fileType: 'csv',
    columns,
    rows,
  };
}

/* =========================================================
   EXCEL
   ========================================================= */

function parseExcel(filePath: string): ParsedContactFile {
  const workbook = XLSX.readFile(filePath, {
    cellDates: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Excel file does not contain a worksheet.');
  }

  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error('Unable to read the first worksheet.');
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  const rows = rawRows
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== ''));

  if (rows.length === 0) {
    throw new Error('The Excel file does not contain any data rows.');
  }

  const extension = path.extname(filePath).toLowerCase();

  return {
    fileName: path.basename(filePath),

    fileType: extension === '.xls' ? 'xls' : 'xlsx',

    columns: collectColumns(rows),

    rows,
  };
}

/* =========================================================
   MARKDOWN
   ========================================================= */

function splitMarkdownRow(line: string): string[] {
  let clean = line.trim();

  if (clean.startsWith('|')) {
    clean = clean.slice(1);
  }

  if (clean.endsWith('|')) {
    clean = clean.slice(0, -1);
  }

  return clean.split('|').map((value) => value.trim());
}

function isMarkdownSeparator(line: string): boolean {
  const cells = splitMarkdownRow(line);

  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdown(filePath: string): ParsedContactFile {
  const content = fs.readFileSync(filePath, 'utf8');

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('The Markdown file is empty.');
  }

  /* =======================================================
     MARKDOWN TABLE

     Example:

     | Name  | Phone        |
     |-------|--------------|
     | Kasun | 0771234567   |
     ======================================================= */

  if (
    lines.length >= 2 &&
    lines[0].includes('|') &&
    isMarkdownSeparator(lines[1])
  ) {
    const headers = splitMarkdownRow(lines[0]);

    const rows: RawContactRow[] = [];

    for (const line of lines.slice(2)) {
      if (!line.includes('|')) {
        continue;
      }

      const values = splitMarkdownRow(line);

      const row: RawContactRow = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      const hasContent = Object.values(row).some(
        (value) => value.trim() !== '',
      );

      if (hasContent) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      throw new Error('The Markdown table does not contain any contact rows.');
    }

    return {
      fileName: path.basename(filePath),
      fileType: 'md',
      columns: headers,
      rows,
    };
  }

  /* =======================================================
     SIMPLE PHONE LIST

     Examples:

     0771234567
     +94771234567
     071 234 5678

     Also accepts:

     - 0771234567
     - +94771234567

     or:

     1. 0771234567
     2. +94771234567
     ======================================================= */

  const candidateLines = lines
    .filter((line) => !line.startsWith('#'))
    .map((line) =>
      line
        .replace(/^[-*]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim(),
    )
    .filter(Boolean);

  const phoneLikeLines = candidateLines.filter((line) => {
    /*
     * Only allow characters normally used
     * when writing phone numbers.
     */
    const allowedCharacters = /^[+()\d\s.-]+$/.test(line);

    /*
     * There should be enough digits to
     * plausibly represent a phone number.
     */
    const digitCount = line.replace(/\D/g, '').length;

    return allowedCharacters && digitCount >= 9 && digitCount <= 15;
  });

  /*
   * A simple contact-list Markdown file should
   * mostly contain phone-number entries.
   *
   * This prevents ordinary Markdown documents
   * that happen to contain a few example phone
   * numbers from being accepted.
   */
  const phoneRatio =
    candidateLines.length === 0
      ? 0
      : phoneLikeLines.length / candidateLines.length;

  if (phoneLikeLines.length === 0 || phoneRatio < 0.7) {
    throw new Error(
      'This Markdown file does not appear to contain a contact list.',
    );
  }

  const rows: RawContactRow[] = phoneLikeLines.map((phone) => ({
    phone,
  }));

  return {
    fileName: path.basename(filePath),
    fileType: 'md',
    columns: ['phone'],
    rows,
  };
}

/* =========================================================
   MAIN FUNCTION
   ========================================================= */

export function parseContactFile(filePath: string): ParsedContactFile {
  if (!fs.existsSync(filePath)) {
    throw new Error('Selected file does not exist.');
  }

  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.csv':
      return parseCsv(filePath);

    case '.xlsx':
    case '.xls':
      return parseExcel(filePath);

    case '.md':
      return parseMarkdown(filePath);

    default:
      throw new Error('Unsupported file type. Use CSV, MD, XLSX, or XLS.');
  }
}
