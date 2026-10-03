import { randomUUID } from 'node:crypto';

import { getDatabase } from '../../db/database';

export type DeliveryCampaignListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sendMode: string;
  timezone: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalRecipients: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  notContactable: number;
  messageCount: number;
  mediaCount: number;
  uncertainCount: number;
};

export type ExecutionMessage = {
  id: string;
  position: number;
  type: 'text' | 'image' | 'image-caption' | 'document' | 'document-caption';
  textContent: string | null;
  caption: string | null;
  mediaPath: string | null;
};

export type ExecutionRecipient = {
  id: string;
  name: string | null;
  normalizedPhone: string;
  status: string;
};

export type CampaignExecutionData = {
  id: string;
  name: string;
  status: string;
  recipients: ExecutionRecipient[];
  messages: ExecutionMessage[];
};

function createEvent(
  campaignId: string,
  eventType: string,
  message: string,
  options?: {
    recipientId?: string | null;
    deliveryId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  const db = getDatabase();

  db.prepare(`
    INSERT INTO campaign_events (
      id,
      campaign_id,
      campaign_recipient_id,
      message_delivery_id,
      event_type,
      message,
      metadata_json,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    campaignId,
    options?.recipientId ?? null,
    options?.deliveryId ?? null,
    eventType,
    message,
    options?.metadata ? JSON.stringify(options.metadata) : null,
    new Date().toISOString(),
  );
}

export function recordCampaignEvent(
  campaignId: string,
  eventType: string,
  message: string,
  options?: {
    recipientId?: string | null;
    deliveryId?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  createEvent(campaignId, eventType, message, options);
}

function mapCampaignRow(row: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  send_mode: string;
  timezone: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  total_recipients: number;
  processed_count: number;
  success_count: number;
  failure_count: number;
  not_contactable: number;
  message_count: number;
  media_count: number;
  uncertain_count: number;
}): DeliveryCampaignListItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    sendMode: row.send_mode,
    timezone: row.timezone,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalRecipients: Number(row.total_recipients),
    processedCount: Number(row.processed_count),
    successCount: Number(row.success_count),
    failureCount: Number(row.failure_count),
    notContactable: Number(row.not_contactable),
    messageCount: Number(row.message_count),
    mediaCount: Number(row.media_count),
    uncertainCount: Number(row.uncertain_count),
  };
}

function getCampaignList(statuses: string[]) {
  const db = getDatabase();

  const placeholders = statuses.map(() => '?').join(', ');

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
        c.started_at,
        c.completed_at,
        c.created_at,
        c.updated_at,
        c.total_recipients,
        c.processed_count,
        c.success_count,
        c.failure_count,
        c.not_contactable,

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
        ) AS media_count,

        (
          SELECT COUNT(*)
          FROM message_deliveries md
          WHERE md.campaign_id = c.id
            AND md.status = 'unknown'
        ) AS uncertain_count

      FROM campaigns c

      WHERE c.status IN (${placeholders})

      ORDER BY
        CASE c.status
          WHEN 'running' THEN 0
          WHEN 'paused' THEN 1
          WHEN 'queued' THEN 2
          WHEN 'scheduled' THEN 3
          ELSE 4
        END,
        c.scheduled_at ASC,
        c.updated_at DESC
    `)
    .all(...statuses) as Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    send_mode: string;
    timezone: string;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
    total_recipients: number;
    processed_count: number;
    success_count: number;
    failure_count: number;
    not_contactable: number;
    message_count: number;
    media_count: number;
    uncertain_count: number;
  }>;

  return rows.map(mapCampaignRow);
}

export function listDeliveryCampaigns() {
  return getCampaignList(['scheduled', 'queued', 'running', 'paused']);
}

export function listCampaignHistory() {
  return getCampaignList(['completed', 'failed', 'cancelled']);
}

export function getNextQueuedCampaignId(): string | null {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT id
      FROM campaigns
      WHERE status = 'queued'
      ORDER BY updated_at ASC
      LIMIT 1
    `)
    .get() as
    | {
        id: string;
      }
    | undefined;

  return row?.id ?? null;
}

export function claimQueuedCampaign(campaignId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  const result = db
    .prepare(`
      UPDATE campaigns
      SET
        status = 'running',
        started_at = COALESCE(
          started_at,
          ?
        ),
        completed_at = NULL,
        updated_at = ?
      WHERE id = ?
        AND status = 'queued'
    `)
    .run(now, now, campaignId);

  if (Number(result.changes) > 0) {
    createEvent(campaignId, 'campaign_started', 'Campaign execution started.');

    return true;
  }

  return false;
}

export function initializeMessageDeliveries(campaignId: string) {
  const db = getDatabase();

  const recipients = db
    .prepare(`
      SELECT id
      FROM campaign_recipients
      WHERE campaign_id = ?
      ORDER BY created_at ASC, rowid ASC
    `)
    .all(campaignId) as Array<{
    id: string;
  }>;

  const messages = db
    .prepare(`
      SELECT id, position
      FROM campaign_messages
      WHERE campaign_id = ?
      ORDER BY position ASC
    `)
    .all(campaignId) as Array<{
    id: string;
    position: number;
  }>;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO message_deliveries (
      id,
      campaign_id,
      campaign_recipient_id,
      campaign_message_id,
      position,
      status,
      attempt_count,
      created_at,
      updated_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      'pending',
      0,
      ?,
      ?
    )
  `);

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    for (const recipient of recipients) {
      for (const message of messages) {
        insert.run(
          randomUUID(),
          campaignId,
          recipient.id,
          message.id,
          message.position,
          now,
          now,
        );
      }
    }

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

export function getCampaignExecutionData(
  campaignId: string,
): CampaignExecutionData {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        id,
        name,
        status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;
        name: string;
        status: string;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  const messages = db
    .prepare(`
      SELECT
        cm.id,
        cm.position,
        cm.type,
        cm.text_content,
        cm.caption,
        ma.local_path

      FROM campaign_messages cm

      LEFT JOIN media_assets ma
        ON ma.id = cm.media_asset_id

      WHERE cm.campaign_id = ?

      ORDER BY cm.position ASC
    `)
    .all(campaignId) as Array<{
    id: string;
    position: number;
    type: ExecutionMessage['type'];
    text_content: string | null;
    caption: string | null;
    local_path: string | null;
  }>;

  const recipients = db
    .prepare(`
      SELECT
        id,
        name,
        normalized_phone,
        status

      FROM campaign_recipients

      WHERE campaign_id = ?

      ORDER BY created_at ASC, rowid ASC
    `)
    .all(campaignId) as Array<{
    id: string;
    name: string | null;
    normalized_phone: string;
    status: string;
  }>;

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,

    messages: messages.map((message) => ({
      id: message.id,
      position: Number(message.position),
      type: message.type,
      textContent: message.text_content,
      caption: message.caption,
      mediaPath: message.local_path,
    })),

    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      normalizedPhone: recipient.normalized_phone,
      status: recipient.status,
    })),
  };
}

export function getCampaignStatus(campaignId: string) {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        status: string;
      }
    | undefined;

  return row?.status ?? null;
}

export function getDeliveryStatus(recipientId: string, messageId: string) {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT
        id,
        status,
        attempt_count

      FROM message_deliveries

      WHERE campaign_recipient_id = ?
        AND campaign_message_id = ?

      LIMIT 1
    `)
    .get(recipientId, messageId) as
    | {
        id: string;
        status: string;
        attempt_count: number;
      }
    | undefined;

  return row ?? null;
}

export function markRecipientProcessing(recipientId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaign_recipients
    SET
      status = 'processing',
      started_at = COALESCE(
        started_at,
        ?
      ),
      completed_at = NULL,
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = ?
    WHERE id = ?
      AND status = 'pending'
  `).run(now, now, recipientId);
}

export function markRecipientSuccess(recipientId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaign_recipients
    SET
      status = 'success',
      completed_at = ?,
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(now, now, recipientId);
}

export function markRecipientFailed(
  recipientId: string,
  code: string,
  message: string,
) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaign_recipients
    SET
      status = 'failed',
      completed_at = ?,
      last_error_code = ?,
      last_error_message = ?,
      updated_at = ?
    WHERE id = ?
  `).run(now, code, message, now, recipientId);
}

export function markRecipientNotContactable(
  campaignId: string,
  recipientId: string,
) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    db.prepare(`
      UPDATE campaign_recipients
      SET
        status = 'not_contactable',
        completed_at = ?,
        last_error_code = 'NOT_ON_WHATSAPP',
        last_error_message = 'WhatsApp reported that this number is not available.',
        updated_at = ?
      WHERE id = ?
    `).run(now, now, recipientId);

    db.prepare(`
      UPDATE message_deliveries
      SET
        status = 'skipped',
        finished_at = ?,
        last_error_code = 'NOT_ON_WHATSAPP',
        last_error_message = 'Recipient is not available on WhatsApp.',
        updated_at = ?
      WHERE campaign_recipient_id = ?
        AND status = 'pending'
    `).run(now, now, recipientId);

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  createEvent(
    campaignId,
    'recipient_not_contactable',
    'Recipient was reported as unavailable on WhatsApp.',
    {
      recipientId,
    },
  );
}

export function markDeliverySending(deliveryId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE message_deliveries
    SET
      status = 'sending',
      attempt_count =
        attempt_count + 1,
      started_at = ?,
      finished_at = NULL,
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(now, now, deliveryId);
}

export function markDeliverySent(deliveryId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE message_deliveries
    SET
      status = 'sent',
      sent_at = ?,
      finished_at = ?,
      last_error_code = NULL,
      last_error_message = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(now, now, now, deliveryId);
}

export function markDeliveryFailed(
  deliveryId: string,
  code: string,
  message: string,
) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE message_deliveries
    SET
      status = 'failed',
      finished_at = ?,
      last_error_code = ?,
      last_error_message = ?,
      updated_at = ?
    WHERE id = ?
  `).run(now, code, message, now, deliveryId);
}

export function recalculateCampaignCounters(campaignId: string) {
  const db = getDatabase();

  const counts = db
    .prepare(`
      SELECT
        SUM(
          CASE
            WHEN status = 'success'
            THEN 1
            ELSE 0
          END
        ) AS success_count,

        SUM(
          CASE
            WHEN status = 'failed'
            THEN 1
            ELSE 0
          END
        ) AS failure_count,

        SUM(
          CASE
            WHEN status = 'not_contactable'
            THEN 1
            ELSE 0
          END
        ) AS not_contactable,

        SUM(
          CASE
            WHEN status IN (
              'success',
              'failed',
              'not_contactable'
            )
            THEN 1
            ELSE 0
          END
        ) AS processed_count

      FROM campaign_recipients

      WHERE campaign_id = ?
    `)
    .get(campaignId) as {
    success_count: number | null;
    failure_count: number | null;
    not_contactable: number | null;
    processed_count: number | null;
  };

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      success_count = ?,
      failure_count = ?,
      not_contactable = ?,
      processed_count = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    Number(counts.success_count ?? 0),
    Number(counts.failure_count ?? 0),
    Number(counts.not_contactable ?? 0),
    Number(counts.processed_count ?? 0),
    now,
    campaignId,
  );
}

export function finishCampaignIfComplete(campaignId: string) {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        status: string;
      }
    | undefined;

  if (!campaign || campaign.status === 'cancelled') {
    return false;
  }

  const remaining = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM campaign_recipients
      WHERE campaign_id = ?
        AND status IN (
          'pending',
          'processing'
        )
    `)
    .get(campaignId) as {
    count: number;
  };

  if (Number(remaining.count) > 0) {
    return false;
  }

  recalculateCampaignCounters(campaignId);

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'completed',
      completed_at = ?,
      updated_at = ?
    WHERE id = ?
      AND status IN (
        'running',
        'paused',
        'queued'
      )
  `).run(now, now, campaignId);

  createEvent(
    campaignId,
    'campaign_completed',
    'Campaign processing completed.',
  );

  return true;
}

export function pauseRunningCampaign(
  campaignId: string,
  message = 'Campaign paused by the user.',
) {
  const db = getDatabase();

  const now = new Date().toISOString();

  const result = db
    .prepare(`
      UPDATE campaigns
      SET
        status = 'paused',
        updated_at = ?
      WHERE id = ?
        AND status = 'running'
    `)
    .run(now, campaignId);

  if (Number(result.changes) === 0) {
    throw new Error('Only a running campaign can be paused.');
  }

  createEvent(campaignId, 'campaign_paused', message);

  return {
    campaignId,
    status: 'paused',
  };
}

export function pauseCampaignForSenderProblem(
  campaignId: string,
  message: string,
) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'paused',
      updated_at = ?
    WHERE id = ?
      AND status = 'running'
  `).run(now, campaignId);

  createEvent(campaignId, 'campaign_sender_paused', message);
}

export function resumeCampaign(campaignId: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  const result = db
    .prepare(`
      UPDATE campaigns
      SET
        status = 'queued',
        completed_at = NULL,
        updated_at = ?
      WHERE id = ?
        AND status = 'paused'
    `)
    .run(now, campaignId);

  if (Number(result.changes) === 0) {
    throw new Error('Only a paused campaign can be resumed.');
  }

  createEvent(
    campaignId,
    'campaign_resumed',
    'Campaign returned to the delivery queue.',
  );

  return {
    campaignId,
    status: 'queued',
  };
}

export function cancelCampaignExecution(campaignId: string) {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        status: string;
      }
    | undefined;

  if (!row) {
    throw new Error('Campaign was not found.');
  }

  if (!['queued', 'running', 'paused'].includes(row.status)) {
    throw new Error(
      'This campaign cannot be cancelled from its current state.',
    );
  }

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    db.prepare(`
      UPDATE campaigns
      SET
        status = 'cancelled',
        completed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(now, now, campaignId);

    db.prepare(`
      UPDATE campaign_recipients
      SET
        status = 'cancelled',
        completed_at = ?,
        updated_at = ?
      WHERE campaign_id = ?
        AND status = 'pending'
    `).run(now, now, campaignId);

    db.prepare(`
      UPDATE message_deliveries
      SET
        status = 'cancelled',
        finished_at = ?,
        updated_at = ?
      WHERE campaign_id = ?
        AND status = 'pending'
    `).run(now, now, campaignId);

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  createEvent(
    campaignId,
    'campaign_cancelled',
    'Campaign execution was cancelled.',
  );

  return {
    campaignId,
    status: 'cancelled',
  };
}

export function retryFailedCampaign(campaignId: string) {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT status
      FROM campaigns
      WHERE id = ?
      LIMIT 1
    `)
    .get(campaignId) as
    | {
        status: string;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  if (!['completed', 'failed', 'paused'].includes(campaign.status)) {
    throw new Error(
      'Retry is available only for completed, failed, or paused campaigns.',
    );
  }

  const retryable = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM campaign_recipients
      WHERE campaign_id = ?
        AND status = 'failed'
    `)
    .get(campaignId) as {
    count: number;
  };

  const uncertain = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM message_deliveries
      WHERE campaign_id = ?
        AND status = 'unknown'
    `)
    .get(campaignId) as {
    count: number;
  };

  if (
    Number(retryable.count) === 0 &&
    Number(uncertain.count) === 0 &&
    campaign.status !== 'failed'
  ) {
    throw new Error('This campaign has no failed or uncertain work to retry.');
  }

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    db.prepare(`
      UPDATE message_deliveries
      SET
        status = 'pending',
        started_at = NULL,
        finished_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = ?
      WHERE campaign_id = ?
        AND status IN (
          'failed',
          'unknown'
        )
    `).run(now, campaignId);

    db.prepare(`
      UPDATE campaign_recipients
      SET
        status = 'pending',
        started_at = NULL,
        completed_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        updated_at = ?
      WHERE campaign_id = ?
        AND status = 'failed'
    `).run(now, campaignId);

    db.prepare(`
      UPDATE campaigns
      SET
        status = 'queued',
        completed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(now, campaignId);

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  recalculateCampaignCounters(campaignId);

  createEvent(
    campaignId,
    'campaign_retry_queued',
    'Failed or uncertain campaign work was returned to the queue.',
  );

  return {
    campaignId,
    status: 'queued',
  };
}

export function markCampaignFailed(campaignId: string, message: string) {
  const db = getDatabase();

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE campaigns
    SET
      status = 'failed',
      completed_at = ?,
      updated_at = ?
    WHERE id = ?
  `).run(now, now, campaignId);

  createEvent(campaignId, 'campaign_failed', message);
}

export function recoverInterruptedCampaigns() {
  const db = getDatabase();

  const rows = db
    .prepare(`
      SELECT id
      FROM campaigns
      WHERE status = 'running'
    `)
    .all() as Array<{
    id: string;
  }>;

  if (rows.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    for (const row of rows) {
      db.prepare(`
        UPDATE message_deliveries
        SET
          status = 'unknown',
          finished_at = ?,
          last_error_code = 'INTERRUPTED',
          last_error_message = 'Application stopped while this message was being processed. Delivery state is uncertain.',
          updated_at = ?
        WHERE campaign_id = ?
          AND status = 'sending'
      `).run(now, now, row.id);

      db.prepare(`
        UPDATE campaign_recipients
        SET
          status = 'failed',
          completed_at = ?,
          last_error_code = 'INTERRUPTED',
          last_error_message = 'Application stopped while this recipient was being processed.',
          updated_at = ?
        WHERE campaign_id = ?
          AND status = 'processing'
      `).run(now, now, row.id);

      db.prepare(`
        UPDATE campaigns
        SET
          status = 'paused',
          updated_at = ?
        WHERE id = ?
      `).run(now, row.id);
    }

    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }

  for (const row of rows) {
    recalculateCampaignCounters(row.id);

    createEvent(
      row.id,
      'campaign_recovered_paused',
      'Campaign was paused after an application restart. Any in-flight message was marked uncertain.',
    );
  }

  return rows.length;
}
