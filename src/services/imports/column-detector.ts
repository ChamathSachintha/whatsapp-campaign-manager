import type { RawContactRow } from '../../types/imports';

import { normalizeSriLankanPhone } from './phone-normalizer';

export type DetectedContactColumns = {
  phoneColumn: string | null;
  nameColumn: string | null;
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* =========================================================
   PHONE COLUMN DETECTION
   ========================================================= */

function getPhoneHeaderScore(column: string): number {
  const normalized = normalizeHeader(column);

  const exactMatches = [
    'phone',
    'phonenumber',
    'mobile',
    'mobilenumber',
    'whatsapp',
    'whatsappnumber',
    'contactnumber',
    'telephone',
    'telephonenumber',
  ];

  if (exactMatches.includes(normalized)) {
    return 100;
  }

  if (normalized.includes('whatsapp')) {
    return 95;
  }

  if (normalized.includes('mobile')) {
    return 90;
  }

  if (normalized.includes('phone')) {
    return 90;
  }

  if (normalized.includes('telephone')) {
    return 85;
  }

  if (normalized.includes('contact') && normalized.includes('number')) {
    return 85;
  }

  return 0;
}

function getPhoneValueScore(column: string, rows: RawContactRow[]): number {
  const sampleRows = rows.slice(0, 20);

  let nonEmpty = 0;
  let valid = 0;

  for (const row of sampleRows) {
    const value = row[column]?.trim();

    if (!value) {
      continue;
    }

    nonEmpty++;

    const result = normalizeSriLankanPhone(value);

    if (result.valid) {
      valid++;
    }
  }

  if (nonEmpty === 0) {
    return 0;
  }

  return (valid / nonEmpty) * 100;
}

function detectPhoneColumn(
  columns: string[],
  rows: RawContactRow[],
): string | null {
  let bestColumn: string | null = null;

  let bestScore = 0;

  for (const column of columns) {
    const headerScore = getPhoneHeaderScore(column);

    const valueScore = getPhoneValueScore(column, rows);

    const score = headerScore + valueScore;

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  /*
   * Require a reasonable confidence level.
   * This avoids randomly selecting an
   * unrelated numeric column.
   */
  if (bestScore < 60) {
    return null;
  }

  return bestColumn;
}

/* =========================================================
   NAME COLUMN DETECTION
   ========================================================= */

function getNameHeaderScore(column: string): number {
  const normalized = normalizeHeader(column);

  const exactMatches = [
    'name',
    'fullname',
    'contactname',
    'volunteername',
    'participantname',
    'membername',
    'studentname',
    'customername',
  ];

  if (exactMatches.includes(normalized)) {
    return 100;
  }

  if (normalized.includes('fullname')) {
    return 95;
  }

  if (normalized.includes('name')) {
    return 80;
  }

  return 0;
}

function detectNameColumn(columns: string[]): string | null {
  let bestColumn: string | null = null;

  let bestScore = 0;

  for (const column of columns) {
    const score = getNameHeaderScore(column);

    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  if (bestScore < 70) {
    return null;
  }

  return bestColumn;
}

/* =========================================================
   MAIN FUNCTION
   ========================================================= */

export function detectContactColumns(
  columns: string[],
  rows: RawContactRow[],
): DetectedContactColumns {
  return {
    phoneColumn: detectPhoneColumn(columns, rows),

    nameColumn: detectNameColumn(columns),
  };
}
