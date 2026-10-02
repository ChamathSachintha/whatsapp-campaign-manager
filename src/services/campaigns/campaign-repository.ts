import {
  app,
} from 'electron';

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import path from 'node:path';

import {
  getDatabase,
} from '../../db/database';

/* =========================================================
   TYPES
   ========================================================= */

export type CampaignDraftMessageType =
  | 'text'
  | 'image'
  | 'image-caption'
  | 'document'
  | 'document-caption';

export type CampaignDraftMessage = {
  type: CampaignDraftMessageType;

  text?: string | null;

  caption?: string | null;

  filePath?: string | null;

  fileName?: string | null;

  fileExtension?: string | null;

  fileSizeBytes?: number | null;
};

export type SaveCampaignDraftOptions = {
  name: string;

  description?: string | null;

  importId: string;

  messages: CampaignDraftMessage[];
};

export type SaveCampaignDraftResult = {
  campaignId: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

/* =========================================================
   MIME TYPE
   ========================================================= */

function getMimeType(
  extension: string,
): string {
  const ext =
    extension
      .replace('.', '')
      .toLowerCase();

  const mimeTypes: Record<
    string,
    string
  > = {
    png: 'image/png',

    jpg: 'image/jpeg',

    jpeg: 'image/jpeg',

    webp: 'image/webp',

    gif: 'image/gif',

    pdf: 'application/pdf',

    doc:
      'application/msword',

    docx:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    xls:
      'application/vnd.ms-excel',

    xlsx:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    ppt:
      'application/vnd.ms-powerpoint',

    pptx:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    txt:
      'text/plain',

    csv:
      'text/csv',

    zip:
      'application/zip',
  };

  return (
    mimeTypes[ext] ??
    'application/octet-stream'
  );
}

/* =========================================================
   HASH FILE
   ========================================================= */

function getFileSha256(
  filePath: string,
): string {
  const fileBuffer =
    readFileSync(
      filePath,
    );

  return createHash(
    'sha256',
  )
    .update(
      fileBuffer,
    )
    .digest(
      'hex',
    );
}

/* =========================================================
   VALIDATE MESSAGE
   ========================================================= */

function validateMessage(
  message: CampaignDraftMessage,
  index: number,
) {
  const position =
    index + 1;

  if (
    message.type === 'text'
  ) {
    if (
      !message.text?.trim()
    ) {
      throw new Error(
        `Message ${position} requires text content.`,
      );
    }

    return;
  }

  if (
    !message.filePath
  ) {
    throw new Error(
      `Message ${position} requires an attachment.`,
    );
  }

  if (
    !existsSync(
      message.filePath,
    )
  ) {
    throw new Error(
      `The attachment for message ${position} can no longer be found.`,
    );
  }

  if (
    message.type ===
      'image-caption' ||
    message.type ===
      'document-caption'
  ) {
    if (
      !message.caption?.trim()
    ) {
      throw new Error(
        `Message ${position} requires a caption.`,
      );
    }
  }
}

/* =========================================================
   SAVE CAMPAIGN DRAFT
   ========================================================= */

export function saveCampaignDraft(
  options: SaveCampaignDraftOptions,
): SaveCampaignDraftResult {
  const db =
    getDatabase();

  const name =
    options.name.trim();

  const description =
    options.description?.trim() ||
    null;

  /* -------------------------------------------------------
     VALIDATION
     ------------------------------------------------------- */

  if (!name) {
    throw new Error(
      'Campaign name is required.',
    );
  }

  if (
    name.length > 100
  ) {
    throw new Error(
      'Campaign name cannot exceed 100 characters.',
    );
  }

  if (
    description &&
    description.length > 500
  ) {
    throw new Error(
      'Campaign description cannot exceed 500 characters.',
    );
  }

  if (
    !options.importId
  ) {
    throw new Error(
      'A recipient import must be selected.',
    );
  }

  if (
    options.messages.length ===
    0
  ) {
    throw new Error(
      'Add at least one campaign message.',
    );
  }

  options.messages.forEach(
    validateMessage,
  );

  /* -------------------------------------------------------
     CHECK IMPORT
     ------------------------------------------------------- */

  const savedImport =
    db.prepare(`
      SELECT id
      FROM imports
      WHERE id = ?
      LIMIT 1
    `).get(
      options.importId,
    ) as
      | {
          id: string;
        }
      | undefined;

  if (!savedImport) {
    throw new Error(
      'The selected contact import no longer exists.',
    );
  }

  /* -------------------------------------------------------
     LOAD VALID RECIPIENTS
     ------------------------------------------------------- */

  const recipients =
    db.prepare(`
      SELECT
        id,
        name,
        original_phone,
        normalized_phone
      FROM import_contacts
      WHERE import_id = ?
        AND validation_status = 'valid'
        AND is_duplicate = 0
        AND normalized_phone IS NOT NULL
        AND normalized_phone <> ''
      ORDER BY row_number ASC
    `).all(
      options.importId,
    ) as Array<{
      id: string;
      name: string | null;
      original_phone: string;
      normalized_phone: string;
    }>;

  if (
    recipients.length === 0
  ) {
    throw new Error(
      'The selected contact import has no valid recipients.',
    );
  }

  /* -------------------------------------------------------
     IDS / PATHS
     ------------------------------------------------------- */

  const campaignId =
    randomUUID();

  const now =
    new Date().toISOString();

  const campaignMediaDirectory =
    path.join(
      app.getPath(
        'userData',
      ),
      'campaign-media',
      campaignId,
    );

  const copiedFiles: string[] =
    [];

  let mediaCount = 0;

  /* -------------------------------------------------------
     PREPARED STATEMENTS
     ------------------------------------------------------- */

  const insertCampaign =
    db.prepare(`
      INSERT INTO campaigns (
        id,
        name,
        description,
        import_id,
        status,
        delivery_profile,
        send_mode,
        timezone,
        scheduled_at,
        started_at,
        completed_at,
        created_at,
        updated_at,
        total_recipients,
        eligible_recipients,
        processed_count,
        success_count,
        failure_count,
        not_contactable,
        suppressed_count
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        'draft',
        'standard',
        'now',
        'Asia/Colombo',
        NULL,
        NULL,
        NULL,
        ?,
        ?,
        ?,
        ?,
        0,
        0,
        0,
        0,
        0
      )
    `);

  const insertMediaAsset =
    db.prepare(`
      INSERT INTO media_assets (
        id,
        original_filename,
        stored_filename,
        local_path,
        mime_type,
        file_size,
        sha256,
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
        ?
      )
    `);

  const insertMessage =
    db.prepare(`
      INSERT INTO campaign_messages (
        id,
        campaign_id,
        position,
        type,
        text_content,
        caption,
        media_asset_id,
        created_at,
        updated_at
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
        ?
      )
    `);

  const insertRecipient =
    db.prepare(`
      INSERT INTO campaign_recipients (
        id,
        campaign_id,
        import_contact_id,
        name,
        normalized_phone,
        original_phone,
        status,
        started_at,
        completed_at,
        last_error_code,
        last_error_message,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'pending',
        NULL,
        NULL,
        NULL,
        NULL,
        ?,
        ?
      )
    `);

  /* -------------------------------------------------------
     TRANSACTION
     ------------------------------------------------------- */

  try {
    db.exec(
      'BEGIN IMMEDIATE TRANSACTION;',
    );

    insertCampaign.run(
      campaignId,
      name,
      description,
      options.importId,
      now,
      now,
      recipients.length,
      recipients.length,
    );

    /* -----------------------------------------------------
       SAVE MESSAGE SEQUENCE
       ----------------------------------------------------- */

    options.messages.forEach(
      (
        message,
        index,
      ) => {
        const messageId =
          randomUUID();

        let mediaAssetId:
          | string
          | null = null;

        /* -----------------------------------------------
           ATTACHMENT
           ----------------------------------------------- */

        if (
          message.filePath
        ) {
          mkdirSync(
            campaignMediaDirectory,
            {
              recursive: true,
            },
          );

          const extension =
            message.fileExtension?.replace(
              '.',
              '',
            ) ||
            path
              .extname(
                message.filePath,
              )
              .replace(
                '.',
                '',
              );

          const storedFilename =
            `${randomUUID()}${
              extension
                ? `.${extension}`
                : ''
            }`;

          const storedPath =
            path.join(
              campaignMediaDirectory,
              storedFilename,
            );

          copyFileSync(
            message.filePath,
            storedPath,
          );

          copiedFiles.push(
            storedPath,
          );

          mediaAssetId =
            randomUUID();

          const originalFilename =
            message.fileName ||
            path.basename(
              message.filePath,
            );

          const fileSize =
            message.fileSizeBytes ??
            null;

          const sha256 =
            getFileSha256(
              storedPath,
            );

          insertMediaAsset.run(
            mediaAssetId,
            originalFilename,
            storedFilename,
            storedPath,
            getMimeType(
              extension,
            ),
            fileSize,
            sha256,
            now,
          );

          mediaCount += 1;
        }

        /* -----------------------------------------------
           MESSAGE
           ----------------------------------------------- */

        insertMessage.run(
          messageId,

          campaignId,

          index + 1,

          message.type,

          message.type ===
          'text'
            ? message.text?.trim() ||
                null
            : null,

          message.type ===
              'image-caption' ||
            message.type ===
              'document-caption'
            ? message.caption?.trim() ||
                null
            : null,

          mediaAssetId,

          now,

          now,
        );
      },
    );

    /* -----------------------------------------------------
       SNAPSHOT RECIPIENTS
       ----------------------------------------------------- */

    recipients.forEach(
      (recipient) => {
        insertRecipient.run(
          randomUUID(),

          campaignId,

          recipient.id,

          recipient.name,

          recipient.normalized_phone,

          recipient.original_phone,

          now,

          now,
        );
      },
    );

    db.exec(
      'COMMIT;',
    );
  } catch (error) {
    try {
      db.exec(
        'ROLLBACK;',
      );
    } catch {
      // Ignore rollback failure.
    }

    /*
     * Remove files copied during a
     * failed transaction.
     */
    copiedFiles.forEach(
      (filePath) => {
        try {
          rmSync(
            filePath,
            {
              force: true,
            },
          );
        } catch {
          // Ignore cleanup failure.
        }
      },
    );

    try {
      rmSync(
        campaignMediaDirectory,
        {
          recursive: true,
          force: true,
        },
      );
    } catch {
      // Ignore cleanup failure.
    }

    throw error;
  }

  /* -------------------------------------------------------
     RESULT
     ------------------------------------------------------- */

  return {
    campaignId,

    recipientCount:
      recipients.length,

    messageCount:
      options.messages.length,

    mediaCount,
  };
}