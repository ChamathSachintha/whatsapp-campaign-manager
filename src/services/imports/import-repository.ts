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

export type SavedImportContact = {
  id: string;
  name: string;
  originalPhone: string;
  normalizedPhone: string | null;
  validationStatus: string;
  validationReason: string | null;
  isDuplicate: boolean;
  rowNumber: number | null;
};

export type SavedImportDetails = {
  id: string;
  filename: string;
  fileType: string;
  importedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  contacts: SavedImportContact[];
};

export type DeleteSavedImportResult = {
  importId: string;
  deletedContacts: number;
  detachedCampaigns: number;
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
export function getSavedImportDetails(
  importId: string,
): SavedImportDetails | null {
  const db =
    getDatabase();

  const importStatement =
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
      WHERE id = ?
      LIMIT 1
    `);

  const importRow =
    importStatement.get(
      importId,
    ) as
      | {
          id: string;
          filename: string;
          file_type: string;
          imported_at: string;
          total_rows: number;
          valid_rows: number;
          invalid_rows: number;
          duplicate_rows: number;
        }
      | undefined;

  if (!importRow) {
    return null;
  }

  const contactStatement =
    db.prepare(`
      SELECT
        id,
        name,
        original_phone,
        normalized_phone,
        validation_status,
        validation_reason,
        is_duplicate,
        row_number
      FROM import_contacts
      WHERE import_id = ?
      ORDER BY row_number ASC
    `);

  const contactRows =
    contactStatement.all(
      importId,
    ) as Array<{
      id: string;
      name: string | null;
      original_phone: string;
      normalized_phone:
        | string
        | null;
      validation_status: string;
      validation_reason:
        | string
        | null;
      is_duplicate: number;
      row_number:
        | number
        | null;
    }>;

  return {
    id:
      importRow.id,

    filename:
      importRow.filename,

    fileType:
      importRow.file_type,

    importedAt:
      importRow.imported_at,

    totalRows:
      importRow.total_rows,

    validRows:
      importRow.valid_rows,

    invalidRows:
      importRow.invalid_rows,

    duplicateRows:
      importRow.duplicate_rows,

    contacts:
      contactRows.map(
        (row) => ({
          id:
            row.id,

          name:
            row.name ?? '',

          originalPhone:
            row.original_phone,

          normalizedPhone:
            row.normalized_phone,

          validationStatus:
            row.validation_status,

          validationReason:
            row.validation_reason,

          isDuplicate:
            row.is_duplicate === 1,

          rowNumber:
            row.row_number,
        }),
      ),
  };
}

export function deleteSavedImport(
  importId: string,
): DeleteSavedImportResult {
  const db =
    getDatabase();

  const existingImport =
    db.prepare(`
      SELECT id
      FROM imports
      WHERE id = ?
      LIMIT 1
    `).get(
      importId,
    ) as
      | {
          id: string;
        }
      | undefined;

  if (!existingImport) {
    throw new Error(
      'Saved import was not found.',
    );
  }

  const contactCountRow =
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM import_contacts
      WHERE import_id = ?
    `).get(
      importId,
    ) as {
      count: number;
    };

  const campaignCountRow =
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM campaigns
      WHERE import_id = ?
    `).get(
      importId,
    ) as {
      count: number;
    };

  const deletedContacts =
    Number(
      contactCountRow.count,
    );

  const detachedCampaigns =
    Number(
      campaignCountRow.count,
    );

  try {
    db.exec(
      'BEGIN IMMEDIATE TRANSACTION;',
    );

    /*
     * Because of the database foreign keys:
     *
     * import_contacts
     *   -> ON DELETE CASCADE
     *
     * campaigns
     *   -> ON DELETE SET NULL
     *
     * deleting the import safely handles
     * both relationships automatically.
     */
    db.prepare(`
      DELETE FROM imports
      WHERE id = ?
    `).run(
      importId,
    );

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
    deletedContacts,
    detachedCampaigns,
  };
}