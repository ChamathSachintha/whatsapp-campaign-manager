import { app } from 'electron';

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';

import { createHash, randomUUID } from 'node:crypto';

import path from 'node:path';

import { getDatabase } from '../../db/database';

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

  existingMediaAssetId?: string | null;
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

export type UpdateCampaignDraftOptions = {
  campaignId: string;

  name: string;

  description?: string | null;

  messages: CampaignDraftMessage[];
};

export type UpdateCampaignDraftResult = {
  campaignId: string;

  messageCount: number;

  mediaCount: number;
};

export type DeleteCampaignResult = {
  campaignId: string;

  deletedMessages: number;

  deletedRecipients: number;

  deletedMedia: number;
};

export type SavedCampaignListItem = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  importId: string | null;

  createdAt: string;

  updatedAt: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

export type SavedCampaignMessageDetails = {
  id: string;

  position: number;

  type: string;

  textContent: string | null;

  caption: string | null;

  media: {
    id: string;

    originalFilename: string;

    mimeType: string | null;

    fileSize: number | null;
  } | null;
};

export type SavedCampaignRecipientDetails = {
  id: string;

  name: string | null;

  normalizedPhone: string;

  originalPhone: string | null;

  status: string;
};

export type SavedCampaignDetails = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  importId: string | null;

  importFilename: string | null;

  createdAt: string;

  updatedAt: string;

  totalRecipients: number;

  eligibleRecipients: number;

  processedCount: number;

  successCount: number;

  failureCount: number;

  messages: SavedCampaignMessageDetails[];

  recipients: SavedCampaignRecipientDetails[];
};

export type CampaignMediaPreview = {
  mediaAssetId: string;

  fileName: string;

  mimeType: string;

  dataUrl: string;
};

export type ScheduledCampaignListItem = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  sendMode: string;

  timezone: string;

  scheduledAt: string | null;

  createdAt: string;

  updatedAt: string;

  recipientCount: number;

  messageCount: number;

  mediaCount: number;
};

const CAMPAIGN_TIMEZONE = 'Asia/Colombo';

const COLOMBO_OFFSET = '+05:30';

function getMimeType(extension: string): string {
  const ext = extension.replace('.', '').toLowerCase();

  const mimeTypes: Record<string, string> = {
    png: 'image/png',

    jpg: 'image/jpeg',

    jpeg: 'image/jpeg',

    webp: 'image/webp',

    gif: 'image/gif',

    pdf: 'application/pdf',

    doc: 'application/msword',

    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    xls: 'application/vnd.ms-excel',

    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    ppt: 'application/vnd.ms-powerpoint',

    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    txt: 'text/plain',

    csv: 'text/csv',

    zip: 'application/zip',
  };

  return mimeTypes[ext] ?? 'application/octet-stream';
}

function getFileSha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function validateCampaignText(
  nameValue: string,
  descriptionValue?: string | null,
) {
  const name = nameValue.trim();

  const description = descriptionValue?.trim() || null;

  if (!name) {
    throw new Error('Campaign name is required.');
  }

  if (name.length > 100) {
    throw new Error('Campaign name cannot exceed 100 characters.');
  }

  if (description && description.length > 500) {
    throw new Error('Campaign description cannot exceed 500 characters.');
  }

  return {
    name,
    description,
  };
}

function validateMessage(
  message: CampaignDraftMessage,
  index: number,
  allowExistingMedia: boolean,
) {
  const position = index + 1;

  if (message.type === 'text') {
    if (!message.text?.trim()) {
      throw new Error(`Message ${position} requires text content.`);
    }

    return;
  }

  const hasNewFile = Boolean(message.filePath);

  const hasExistingMedia =
    allowExistingMedia && Boolean(message.existingMediaAssetId);

  if (!hasNewFile && !hasExistingMedia) {
    throw new Error(`Message ${position} requires an attachment.`);
  }

  if (message.filePath && !existsSync(message.filePath)) {
    throw new Error(
      `The attachment for message ${position} can no longer be found.`,
    );
  }

  if (message.type === 'image-caption' || message.type === 'document-caption') {
    if (!message.caption?.trim()) {
      throw new Error(`Message ${position} requires a caption.`);
    }
  }
}

function removeFileQuietly(filePath: string) {
  try {
    rmSync(filePath, {
      force: true,
    });
  } catch {
    // Ignore cleanup errors.
  }
}

function storeMediaAsset(
  campaignId: string,
  message: CampaignDraftMessage,
  createdAt: string,
  copiedFiles: string[],
): string {
  if (!message.filePath) {
    throw new Error('Attachment path is missing.');
  }

  const db = getDatabase();

  const mediaDirectory = path.join(
    app.getPath('userData'),
    'campaign-media',
    campaignId,
  );

  mkdirSync(mediaDirectory, {
    recursive: true,
  });

  const extension = (message.fileExtension || path.extname(message.filePath))
    .replace('.', '')
    .toLowerCase();

  const storedFilename = `${randomUUID()}${extension ? `.${extension}` : ''}`;

  const storedPath = path.join(mediaDirectory, storedFilename);

  copyFileSync(message.filePath, storedPath);

  copiedFiles.push(storedPath);

  const mediaAssetId = randomUUID();

  const originalFilename = message.fileName || path.basename(message.filePath);

  const fileSize = message.fileSizeBytes ?? statSync(storedPath).size;

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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    mediaAssetId,
    originalFilename,
    storedFilename,
    storedPath,
    getMimeType(extension),
    fileSize,
    getFileSha256(storedPath),
    createdAt,
  );

  return mediaAssetId;
}

function assertCampaignReadyForDelivery(
  campaignId: string,
  allowedStatuses: string[],
) {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        c.id,
        c.status,

        (
          SELECT COUNT(*)
          FROM campaign_messages cm
          WHERE cm.campaign_id = c.id
        ) AS message_count,

        (
          SELECT COUNT(*)
          FROM campaign_recipients cr
          WHERE cr.campaign_id = c.id
        ) AS recipient_count

      FROM campaigns c
      WHERE c.id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        status: string;

        message_count: number;

        recipient_count: number;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (!allowedStatuses.includes(campaign.status)) {
    throw new Error(
      `Campaign cannot perform this delivery action while status is "${campaign.status}".`,
    );
  }

  if (Number(campaign.message_count) < 1) {
    throw new Error('Campaign must contain at least one message.');
  }

  if (Number(campaign.recipient_count) < 1) {
    throw new Error('Campaign must contain at least one recipient.');
  }

  return campaign;
}

function colomboLocalDateTimeToUtc(localDateTime: string) {
  const value = localDateTime.trim();

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    throw new Error('Scheduled date and time are invalid.');
  }

  const withSeconds = value.length === 19 ? value : `${value}:00`;

  const date = new Date(`${withSeconds}${COLOMBO_OFFSET}`);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Scheduled date and time are invalid.');
  }

  return date.toISOString();
}

/* =========================================================
   SAVE DRAFT
   ========================================================= */

export function saveCampaignDraft(
  options: SaveCampaignDraftOptions,
): SaveCampaignDraftResult {
  const db = getDatabase();

  const { name, description } = validateCampaignText(
    options.name,
    options.description,
  );

  if (!options.importId) {
    throw new Error('A recipient import must be selected.');
  }

  if (options.messages.length === 0) {
    throw new Error('Add at least one campaign message.');
  }

  options.messages.forEach((message, index) =>
    validateMessage(message, index, false),
  );

  const savedImport = db
    .prepare(`
      SELECT id
      FROM imports
      WHERE id = ?
      LIMIT 1
    `)
    .get(options.importId) as
    | {
        id: string;
      }
    | undefined;

  if (!savedImport) {
    throw new Error('The selected contact import no longer exists.');
  }

  const recipients = db
    .prepare(`
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
    `)
    .all(options.importId) as Array<{
    id: string;

    name: string | null;

    original_phone: string;

    normalized_phone: string;
  }>;

  if (recipients.length === 0) {
    throw new Error('The selected contact import has no valid recipients.');
  }

  const campaignId = randomUUID();

  const now = new Date().toISOString();

  const copiedFiles: string[] = [];

  let mediaCount = 0;

  const insertCampaign = db.prepare(`
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

  const insertMessage = db.prepare(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const insertRecipient = db.prepare(`
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

  try {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');

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

    options.messages.forEach((message, index) => {
      let mediaAssetId: string | null = null;

      if (message.type !== 'text') {
        mediaAssetId = storeMediaAsset(campaignId, message, now, copiedFiles);

        mediaCount += 1;
      }

      insertMessage.run(
        randomUUID(),
        campaignId,
        index + 1,
        message.type,
        message.type === 'text' ? message.text?.trim() || null : null,
        message.type === 'image-caption' || message.type === 'document-caption'
          ? message.caption?.trim() || null
          : null,
        mediaAssetId,
        now,
        now,
      );
    });

    recipients.forEach((recipient) => {
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
    });

    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback errors.
    }

    copiedFiles.forEach(removeFileQuietly);

    try {
      rmSync(path.join(app.getPath('userData'), 'campaign-media', campaignId), {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore cleanup errors.
    }

    throw error;
  }

  return {
    campaignId,

    recipientCount: recipients.length,

    messageCount: options.messages.length,

    mediaCount,
  };
}

/* =========================================================
   LIST CAMPAIGNS
   ========================================================= */

export function listSavedCampaigns(): SavedCampaignListItem[] {
  const db = getDatabase();

  const rows = db
    .prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.import_id,
        c.created_at,
        c.updated_at,
        c.total_recipients,

        (
          SELECT COUNT(*)
          FROM campaign_messages cm
          WHERE cm.campaign_id = c.id
        ) AS message_count,

        (
          SELECT COUNT(*)
          FROM campaign_messages cm
          WHERE cm.campaign_id = c.id
            AND cm.media_asset_id IS NOT NULL
        ) AS media_count

      FROM campaigns c

      ORDER BY c.created_at DESC
    `)
    .all() as Array<{
    id: string;

    name: string;

    description: string | null;

    status: string;

    import_id: string | null;

    created_at: string;

    updated_at: string;

    total_recipients: number;

    message_count: number;

    media_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,

    name: row.name,

    description: row.description,

    status: row.status,

    importId: row.import_id,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    recipientCount: Number(row.total_recipients),

    messageCount: Number(row.message_count),

    mediaCount: Number(row.media_count),
  }));
}

/* =========================================================
   DETAILS
   ========================================================= */

export function getSavedCampaignDetails(
  campaignId: string,
): SavedCampaignDetails | null {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.import_id,
        c.created_at,
        c.updated_at,
        c.total_recipients,
        c.eligible_recipients,
        c.processed_count,
        c.success_count,
        c.failure_count,
        i.filename AS import_filename
      FROM campaigns c
      LEFT JOIN imports i
        ON i.id = c.import_id
      WHERE c.id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        name: string;

        description: string | null;

        status: string;

        import_id: string | null;

        import_filename: string | null;

        created_at: string;

        updated_at: string;

        total_recipients: number;

        eligible_recipients: number;

        processed_count: number;

        success_count: number;

        failure_count: number;
      }
    | undefined;

  if (!campaign) {
    return null;
  }

  const messageRows = db
    .prepare(`
      SELECT
        cm.id,
        cm.position,
        cm.type,
        cm.text_content,
        cm.caption,
        cm.media_asset_id,
        ma.original_filename,
        ma.mime_type,
        ma.file_size
      FROM campaign_messages cm
      LEFT JOIN media_assets ma
        ON ma.id = cm.media_asset_id
      WHERE cm.campaign_id = ?
      ORDER BY cm.position ASC
    `)
    .all(campaignId) as Array<{
    id: string;

    position: number;

    type: string;

    text_content: string | null;

    caption: string | null;

    media_asset_id: string | null;

    original_filename: string | null;

    mime_type: string | null;

    file_size: number | null;
  }>;

  const recipientRows = db
    .prepare(`
      SELECT
        id,
        name,
        normalized_phone,
        original_phone,
        status
      FROM campaign_recipients
      WHERE campaign_id = ?
      ORDER BY created_at ASC, rowid ASC
    `)
    .all(campaignId) as Array<{
    id: string;

    name: string | null;

    normalized_phone: string;

    original_phone: string | null;

    status: string;
  }>;

  return {
    id: campaign.id,

    name: campaign.name,

    description: campaign.description,

    status: campaign.status,

    importId: campaign.import_id,

    importFilename: campaign.import_filename,

    createdAt: campaign.created_at,

    updatedAt: campaign.updated_at,

    totalRecipients: Number(campaign.total_recipients),

    eligibleRecipients: Number(campaign.eligible_recipients),

    processedCount: Number(campaign.processed_count),

    successCount: Number(campaign.success_count),

    failureCount: Number(campaign.failure_count),

    messages: messageRows.map((message) => ({
      id: message.id,

      position: Number(message.position),

      type: message.type,

      textContent: message.text_content,

      caption: message.caption,

      media:
        message.media_asset_id && message.original_filename
          ? {
              id: message.media_asset_id,

              originalFilename: message.original_filename,

              mimeType: message.mime_type,

              fileSize:
                message.file_size !== null ? Number(message.file_size) : null,
            }
          : null,
    })),

    recipients: recipientRows.map((recipient) => ({
      id: recipient.id,

      name: recipient.name,

      normalizedPhone: recipient.normalized_phone,

      originalPhone: recipient.original_phone,

      status: recipient.status,
    })),
  };
}

/* =========================================================
   MEDIA PREVIEW
   ========================================================= */

export function getCampaignMediaPreview(
  mediaAssetId: string,
): CampaignMediaPreview {
  const db = getDatabase();

  const media = db
    .prepare(`
      SELECT
        id,
        original_filename,
        local_path,
        mime_type
      FROM media_assets
      WHERE id = ?
      LIMIT 1
    `)
    .get(mediaAssetId) as
    | {
        id: string;

        original_filename: string;

        local_path: string;

        mime_type: string | null;
      }
    | undefined;

  if (!media) {
    throw new Error('Media file was not found.');
  }

  if (!existsSync(media.local_path)) {
    throw new Error('Stored campaign media file is missing.');
  }

  const mimeType =
    media.mime_type || getMimeType(path.extname(media.local_path));

  if (!mimeType.startsWith('image/')) {
    throw new Error('Only image attachments can be previewed as images.');
  }

  const base64 = readFileSync(media.local_path).toString('base64');

  return {
    mediaAssetId: media.id,

    fileName: media.original_filename,

    mimeType,

    dataUrl: `data:${mimeType};base64,${base64}`,
  };
}

/* =========================================================
   UPDATE DRAFT
   ========================================================= */

export function updateCampaignDraft(
  options: UpdateCampaignDraftOptions,
): UpdateCampaignDraftResult {
  const db = getDatabase();

  const { name, description } = validateCampaignText(
    options.name,
    options.description,
  );

  if (options.messages.length === 0) {
    throw new Error('Campaign must contain at least one message.');
  }

  options.messages.forEach((message, index) =>
    validateMessage(message, index, true),
  );

  const campaign = db
    .prepare(`
      SELECT
        id,
        status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(options.campaignId) as
    | {
        id: string;

        status: string;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (campaign.status !== 'draft') {
    throw new Error('Only draft campaigns can be edited.');
  }

  const oldMediaRows = db
    .prepare(`
      SELECT DISTINCT
        ma.id,
        ma.local_path
      FROM campaign_messages cm
      INNER JOIN media_assets ma
        ON ma.id = cm.media_asset_id
      WHERE cm.campaign_id = ?
    `)
    .all(options.campaignId) as Array<{
    id: string;

    local_path: string;
  }>;

  const oldMediaIds = new Set(oldMediaRows.map((media) => media.id));

  for (const message of options.messages) {
    if (
      message.existingMediaAssetId &&
      !oldMediaIds.has(message.existingMediaAssetId)
    ) {
      throw new Error(
        'One of the selected existing attachments does not belong to this campaign.',
      );
    }
  }

  const now = new Date().toISOString();

  const copiedFiles: string[] = [];

  const reusedMediaIds = new Set<string>();

  const filesToRemove: string[] = [];

  const insertMessage = db.prepare(`
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  try {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');

    db.prepare(`
      DELETE FROM campaign_messages
      WHERE campaign_id = ?
    `).run(options.campaignId);

    options.messages.forEach((message, index) => {
      let mediaAssetId: string | null = null;

      if (message.type !== 'text') {
        if (message.filePath) {
          mediaAssetId = storeMediaAsset(
            options.campaignId,
            message,
            now,
            copiedFiles,
          );
        } else if (message.existingMediaAssetId) {
          mediaAssetId = message.existingMediaAssetId;

          reusedMediaIds.add(mediaAssetId);
        }
      }

      insertMessage.run(
        randomUUID(),
        options.campaignId,
        index + 1,
        message.type,
        message.type === 'text' ? message.text?.trim() || null : null,
        message.type === 'image-caption' || message.type === 'document-caption'
          ? message.caption?.trim() || null
          : null,
        mediaAssetId,
        now,
        now,
      );
    });

    oldMediaRows.forEach((media) => {
      if (reusedMediaIds.has(media.id)) {
        return;
      }

      db.prepare(`
          DELETE FROM media_assets
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM campaign_messages
              WHERE media_asset_id = ?
            )
        `).run(media.id, media.id);

      filesToRemove.push(media.local_path);
    });

    db.prepare(`
      UPDATE campaigns
      SET
        name = ?,
        description = ?,
        updated_at = ?
      WHERE id = ?
    `).run(name, description, now, options.campaignId);

    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback errors.
    }

    copiedFiles.forEach(removeFileQuietly);

    throw error;
  }

  filesToRemove.forEach(removeFileQuietly);

  return {
    campaignId: options.campaignId,

    messageCount: options.messages.length,

    mediaCount: options.messages.filter((message) => message.type !== 'text')
      .length,
  };
}

/* =========================================================
   DELETE DRAFT
   ========================================================= */

export function deleteCampaignDraft(campaignId: string): DeleteCampaignResult {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        id,
        status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        status: string;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (campaign.status !== 'draft') {
    throw new Error('Only draft campaigns can be deleted.');
  }

  const messageCountRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM campaign_messages
      WHERE campaign_id = ?
    `)
    .get(campaignId) as {
    count: number;
  };

  const recipientCountRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM campaign_recipients
      WHERE campaign_id = ?
    `)
    .get(campaignId) as {
    count: number;
  };

  const mediaRows = db
    .prepare(`
      SELECT DISTINCT
        ma.id,
        ma.local_path
      FROM campaign_messages cm
      INNER JOIN media_assets ma
        ON ma.id = cm.media_asset_id
      WHERE cm.campaign_id = ?
    `)
    .all(campaignId) as Array<{
    id: string;

    local_path: string;
  }>;

  try {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');

    db.prepare(`
      DELETE FROM campaigns
      WHERE id = ?
    `).run(campaignId);

    mediaRows.forEach((media) => {
      db.prepare(`
          DELETE FROM media_assets
          WHERE id = ?
            AND NOT EXISTS (
              SELECT 1
              FROM campaign_messages
              WHERE media_asset_id = ?
            )
        `).run(media.id, media.id);
    });

    db.exec('COMMIT;');
  } catch (error) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignore rollback errors.
    }

    throw error;
  }

  try {
    rmSync(path.join(app.getPath('userData'), 'campaign-media', campaignId), {
      recursive: true,
      force: true,
    });
  } catch {
    // Ignore physical file cleanup error.
  }

  return {
    campaignId,

    deletedMessages: Number(messageCountRow.count),

    deletedRecipients: Number(recipientCountRow.count),

    deletedMedia: mediaRows.length,
  };
}

/* =========================================================
   QUEUE NOW
   ========================================================= */

export function queueCampaignNow(campaignId: string) {
  const db = getDatabase();

  assertCampaignReadyForDelivery(campaignId, ['draft', 'scheduled']);

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'queued',
      send_mode = 'now',
      timezone = ?,
      scheduled_at = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(CAMPAIGN_TIMEZONE, now, campaignId);

  return {
    campaignId,

    status: 'queued',

    sendMode: 'now',

    scheduledAt: null,

    timezone: CAMPAIGN_TIMEZONE,
  };
}

/* =========================================================
   SCHEDULE
   ========================================================= */

export function scheduleCampaign(
  campaignId: string,
  scheduledLocalDateTime: string,
) {
  const db = getDatabase();

  assertCampaignReadyForDelivery(campaignId, ['draft']);

  const scheduledAt = colomboLocalDateTimeToUtc(scheduledLocalDateTime);

  if (new Date(scheduledAt).getTime() <= Date.now()) {
    throw new Error('Scheduled time must be in the future.');
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'scheduled',
      send_mode = 'scheduled',
      timezone = ?,
      scheduled_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(CAMPAIGN_TIMEZONE, scheduledAt, now, campaignId);

  return {
    campaignId,

    status: 'scheduled',

    sendMode: 'scheduled',

    scheduledAt,

    timezone: CAMPAIGN_TIMEZONE,
  };
}

/* =========================================================
   RESCHEDULE
   ========================================================= */

export function rescheduleCampaign(
  campaignId: string,
  scheduledLocalDateTime: string,
) {
  const db = getDatabase();

  assertCampaignReadyForDelivery(campaignId, ['scheduled']);

  const scheduledAt = colomboLocalDateTimeToUtc(scheduledLocalDateTime);

  if (new Date(scheduledAt).getTime() <= Date.now()) {
    throw new Error('Scheduled time must be in the future.');
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      send_mode = 'scheduled',
      timezone = ?,
      scheduled_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(CAMPAIGN_TIMEZONE, scheduledAt, now, campaignId);

  return {
    campaignId,

    status: 'scheduled',

    sendMode: 'scheduled',

    scheduledAt,

    timezone: CAMPAIGN_TIMEZONE,
  };
}

/* =========================================================
   CANCEL SCHEDULE
   ========================================================= */

export function cancelCampaignSchedule(campaignId: string) {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        id,
        status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        status: string;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (campaign.status !== 'scheduled') {
    throw new Error('Only scheduled campaigns can cancel their schedule.');
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'draft',
      send_mode = 'now',
      scheduled_at = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(now, campaignId);

  return {
    campaignId,

    status: 'draft',
  };
}

/* =========================================================
   QUEUED -> DRAFT
   ========================================================= */

export function returnQueuedCampaignToDraft(campaignId: string) {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        id,
        status,
        processed_count,
        started_at
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        status: string;

        processed_count: number;

        started_at: string | null;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (campaign.status !== 'queued') {
    throw new Error('Only queued campaigns can be returned to draft.');
  }

  if (Number(campaign.processed_count) > 0 || campaign.started_at) {
    throw new Error(
      'This campaign has already started processing and cannot return to draft.',
    );
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'draft',
      send_mode = 'now',
      scheduled_at = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(now, campaignId);

  return {
    campaignId,

    status: 'draft',
  };
}

/* =========================================================
   PROCESS DUE CAMPAIGNS
   ========================================================= */

export function processDueCampaigns() {
  const db = getDatabase();

  const now = new Date().toISOString();

  const result = db
    .prepare(`
      UPDATE campaigns
      SET
        status = 'queued',
        updated_at = ?
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= ?
    `)
    .run(now, now);

  return Number(result.changes);
}

/* =========================================================
   SCHEDULED / QUEUED LIST
   ========================================================= */

export function listScheduledCampaigns(): ScheduledCampaignListItem[] {
  const db = getDatabase();

  const rows = db
    .prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.send_mode,
        c.timezone,
        c.scheduled_at,
        c.created_at,
        c.updated_at,
        c.total_recipients,

        (
          SELECT COUNT(*)
          FROM campaign_messages cm
          WHERE cm.campaign_id = c.id
        ) AS message_count,

        (
          SELECT COUNT(*)
          FROM campaign_messages cm
          WHERE cm.campaign_id = c.id
            AND cm.media_asset_id IS NOT NULL
        ) AS media_count

      FROM campaigns c

      WHERE c.status IN (
        'scheduled',
        'queued'
      )

      ORDER BY
        CASE
          WHEN c.status = 'scheduled'
          THEN 0
          ELSE 1
        END,

        CASE
          WHEN c.scheduled_at IS NULL
          THEN 1
          ELSE 0
        END,

        c.scheduled_at ASC,

        c.updated_at DESC
    `)
    .all() as Array<{
    id: string;

    name: string;

    description: string | null;

    status: string;

    send_mode: string;

    timezone: string;

    scheduled_at: string | null;

    created_at: string;

    updated_at: string;

    total_recipients: number;

    message_count: number;

    media_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,

    name: row.name,

    description: row.description,

    status: row.status,

    sendMode: row.send_mode,

    timezone: row.timezone,

    scheduledAt: row.scheduled_at,

    createdAt: row.created_at,

    updatedAt: row.updated_at,

    recipientCount: Number(row.total_recipients),

    messageCount: Number(row.message_count),

    mediaCount: Number(row.media_count),
  }));
}
