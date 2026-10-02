import type {
  ContactValidationResult,
  RawContactRow,
  ValidatedContact,
} from '../../types/imports';

import {
  normalizeSriLankanPhone,
} from './phone-normalizer';

export type ValidateContactsOptions = {
  rows: RawContactRow[];

  phoneColumn: string;

  nameColumn?: string | null;
};

export function validateContacts(
  options: ValidateContactsOptions,
): ContactValidationResult {
  const {
    rows,
    phoneColumn,
    nameColumn,
  } = options;

  const seenNumbers =
    new Set<string>();

  const contacts: ValidatedContact[] =
    [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const originalPhone =
      row[phoneColumn]?.trim() ?? '';

    const name =
      nameColumn
        ? row[nameColumn]?.trim() ?? ''
        : '';

    const normalization =
      normalizeSriLankanPhone(
        originalPhone,
      );

    if (
      !normalization.valid ||
      !normalization.normalized
    ) {
      contacts.push({
        rowNumber,
        name,
        originalPhone,
        normalizedPhone: null,
        status: 'invalid',
        reason:
          normalization.reason ??
          'Invalid phone number.',
        sourceRow: row,
      });

      return;
    }

    const normalizedPhone =
      normalization.normalized;

    if (
      seenNumbers.has(
        normalizedPhone,
      )
    ) {
      contacts.push({
        rowNumber,
        name,
        originalPhone,
        normalizedPhone,
        status: 'duplicate',
        reason:
          'Duplicate phone number in this import file.',
        sourceRow: row,
      });

      return;
    }

    seenNumbers.add(
      normalizedPhone,
    );

    contacts.push({
      rowNumber,
      name,
      originalPhone,
      normalizedPhone,
      status: 'valid',
      reason: null,
      sourceRow: row,
    });
  });

  const validRows =
    contacts.filter(
      (contact) =>
        contact.status === 'valid',
    ).length;

  const invalidRows =
    contacts.filter(
      (contact) =>
        contact.status === 'invalid',
    ).length;

  const duplicateRows =
    contacts.filter(
      (contact) =>
        contact.status ===
        'duplicate',
    ).length;

  return {
    contacts,

    summary: {
      totalRows:
        contacts.length,

      validRows,

      invalidRows,

      duplicateRows,
    },
  };
}