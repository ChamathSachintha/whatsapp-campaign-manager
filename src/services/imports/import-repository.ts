import fs from 'node:fs';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

export type SavedImportListItem = {
  id: string;
  filename: string;
  fileType: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
};

import {
  getDatabase,
} from '../../db/database';

import type {
  ContactValidationResult,
} from '../../types/imports';

export type SaveImportOptions = {
  filePath: string;

  fileName: string;

  fileType: string;

  validationResult:
    ContactValidationResult;

  sourceNote?: string | null;
};

export type SavedImportResult = {
  importId: string;

  totalRows: number;

  validRows: number;

  invalidRows: number;

  duplicateRows: number;
};

/* =========================================================
   FILE HASH
   ========================================================= */

function createFileHash(
  filePath: string,
): string {
  const fileBuffer =
    fs.readFileSync(filePath);

  return createHash('sha256')
    .update(fileBuffer)
    .digest('hex');
}

/* =========================================================
   SAVE IMPORT
   ========================================================= */

export function saveValidatedImport(
  options: SaveImportOptions,
): SavedImportResult {
  const db =
    getDatabase();

  const importId =
    randomUUID();

  const now =
    new Date().toISOString();

  const fileHash =
    createFileHash(
      options.filePath,
    );

  const {
    totalRows,
    validRows,
    invalidRows,
    duplicateRows,
  } =
    options.validationResult.summary;

  const insertImport =
    db.prepare(`
      INSERT INTO imports (
        id,
        filename,
        file_type,
        file_hash,
        source_note,
        imported_at,
        total_rows,
        valid_rows,
        invalid_rows,
        duplicate_rows,
        suppressed_rows
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        0
      )
    `);

  const insertContact =
    db.prepare(`
      INSERT INTO import_contacts (
        id,
        import_id,
        name,
        original_phone,
        normalized_phone,
        validation_status,
        validation_reason,
        is_duplicate,
        is_suppressed,
        row_number,
        raw_data_json,
        created_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        0,
        ?,
        ?,
        ?
      )
    `);

  try {
    db.exec(
      'BEGIN IMMEDIATE TRANSACTION;',
    );

    insertImport.run(
      importId,
      options.fileName,
      options.fileType,
      fileHash,
      options.sourceNote ?? null,
      now,
      totalRows,
      validRows,
      invalidRows,
      duplicateRows,
    );

    for (
      const contact of
        options.validationResult.contacts
    ) {
      insertContact.run(
        randomUUID(),

        importId,

        contact.name ||
          null,

        contact.originalPhone,

        contact.normalizedPhone,

        contact.status,

        contact.reason,

        contact.status ===
          'duplicate'
          ? 1
          : 0,

        contact.rowNumber,

        JSON.stringify(
          contact.sourceRow,
        ),

        now,
      );
    }

    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback failure.
    }

    throw error;
  }

  return {
    importId,

    totalRows,

    validRows,

    invalidRows,

    duplicateRows,
  };
}

export function listSavedImports():
  SavedImportListItem[] {
  const db =
    getDatabase();

  const statement =
    db.prepare(`
      SELECT
        id,
        filename,
        file_type,
        imported_at,
        total_rows,
        valid_rows,
        invalid_rows,
        duplicate_rows
      FROM imports
      ORDER BY imported_at DESC
    `);

  const rows =
    statement.all() as Array<{
      id: string;
      filename: string;
      file_type: string;
      imported_at: string;
      total_rows: number;
      valid_rows: number;
      invalid_rows: number;
      duplicate_rows: number;
    }>;

  return rows.map(
    (row) => ({
      id: row.id,

      filename:
        row.filename,

      fileType:
        row.file_type,

      importedAt:
        row.imported_at,

      totalRows:
        row.total_rows,

      validRows:
        row.valid_rows,

      invalidRows:
        row.invalid_rows,

      duplicateRows:
        row.duplicate_rows,
    }),
  );
}