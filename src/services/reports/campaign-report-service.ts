import { app, dialog } from 'electron';

import { writeFileSync } from 'node:fs';

import path from 'node:path';

import { getDatabase } from '../../db/database';

export type CampaignReportSummary = {
  id: string;

  name: string;

  description: string | null;

  status: string;

  sendMode: string;

  timezone: string;

  createdAt: string;

  updatedAt: string;

  scheduledAt: string | null;

  startedAt: string | null;

  completedAt: string | null;

  totalRecipients: number;

  processedCount: number;

  successCount: number;

  failureCount: number;

  notContactable: number;

  uncertainCount: number;

  successRate: number;
};

export type CampaignReportRecipient = {
  id: string;

  name: string | null;

  normalizedPhone: string;

  originalPhone: string | null;

  status: string;

  startedAt: string | null;

  completedAt: string | null;

  lastErrorCode: string | null;

  lastErrorMessage: string | null;

  deliveryCount: number;

  sentCount: number;

  failedCount: number;

  uncertainCount: number;

  skippedCount: number;
};

export type CampaignReportDelivery = {
  recipientId: string;

  recipientName: string | null;

  normalizedPhone: string;

  originalPhone: string | null;

  recipientStatus: string;

  recipientStartedAt: string | null;

  recipientCompletedAt: string | null;

  recipientErrorCode: string | null;

  recipientErrorMessage: string | null;

  deliveryId: string | null;

  messageId: string | null;

  messagePosition: number | null;

  messageType: string | null;

  textContent: string | null;

  caption: string | null;

  mediaFilename: string | null;

  deliveryStatus: string | null;

  attemptCount: number;

  deliveryStartedAt: string | null;

  sentAt: string | null;

  finishedAt: string | null;

  deliveryErrorCode: string | null;

  deliveryErrorMessage: string | null;
};

export type CampaignReport = {
  summary: CampaignReportSummary;

  recipients: CampaignReportRecipient[];

  deliveries: CampaignReportDelivery[];
};

export type CampaignReportExportKind = 'summary' | 'details';

function calculateSuccessRate(successCount: number, totalRecipients: number) {
  if (totalRecipients <= 0) {
    return 0;
  }

  return Number(((successCount / totalRecipients) * 100).toFixed(2));
}

export function getCampaignReport(campaignId: string): CampaignReport {
  const db = getDatabase();

  const campaign = db
    .prepare(`
      SELECT
        c.id,
        c.name,
        c.description,
        c.status,
        c.send_mode,
        c.timezone,
        c.created_at,
        c.updated_at,
        c.scheduled_at,
        c.started_at,
        c.completed_at,
        c.total_recipients,
        c.processed_count,
        c.success_count,
        c.failure_count,
        c.not_contactable,

        (
          SELECT COUNT(*)
          FROM message_deliveries md
          WHERE md.campaign_id = c.id
            AND md.status = 'unknown'
        ) AS uncertain_count

      FROM campaigns c

      WHERE c.id = ?

      LIMIT 1
    `)
    .get(campaignId) as
    | {
        id: string;

        name: string;

        description: string | null;

        status: string;

        send_mode: string;

        timezone: string;

        created_at: string;

        updated_at: string;

        scheduled_at: string | null;

        started_at: string | null;

        completed_at: string | null;

        total_recipients: number;

        processed_count: number;

        success_count: number;

        failure_count: number;

        not_contactable: number;

        uncertain_count: number;
      }
    | undefined;

  if (!campaign) {
    throw new Error('Campaign was not found.');
  }

  const totalRecipients = Number(campaign.total_recipients);

  const successCount = Number(campaign.success_count);

  const recipients = db
    .prepare(`
      SELECT
        cr.id,
        cr.name,
        cr.normalized_phone,
        cr.original_phone,
        cr.status,
        cr.started_at,
        cr.completed_at,
        cr.last_error_code,
        cr.last_error_message,

        COUNT(md.id) AS delivery_count,

        COALESCE(
          SUM(
            CASE
              WHEN md.status = 'sent'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS sent_count,

        COALESCE(
          SUM(
            CASE
              WHEN md.status = 'failed'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS failed_count,

        COALESCE(
          SUM(
            CASE
              WHEN md.status = 'unknown'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS uncertain_count,

        COALESCE(
          SUM(
            CASE
              WHEN md.status = 'skipped'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS skipped_count

      FROM campaign_recipients cr

      LEFT JOIN message_deliveries md
        ON md.campaign_recipient_id = cr.id

      WHERE cr.campaign_id = ?

      GROUP BY
        cr.id,
        cr.name,
        cr.normalized_phone,
        cr.original_phone,
        cr.status,
        cr.started_at,
        cr.completed_at,
        cr.last_error_code,
        cr.last_error_message,
        cr.created_at

      ORDER BY
        cr.created_at ASC,
        cr.id ASC
    `)
    .all(campaignId) as Array<{
    id: string;

    name: string | null;

    normalized_phone: string;

    original_phone: string | null;

    status: string;

    started_at: string | null;

    completed_at: string | null;

    last_error_code: string | null;

    last_error_message: string | null;

    delivery_count: number;

    sent_count: number;

    failed_count: number;

    uncertain_count: number;

    skipped_count: number;
  }>;

  const deliveries = db
    .prepare(`
      SELECT
        cr.id AS recipient_id,

        cr.name AS recipient_name,

        cr.normalized_phone,

        cr.original_phone,

        cr.status AS recipient_status,

        cr.started_at AS recipient_started_at,

        cr.completed_at AS recipient_completed_at,

        cr.last_error_code AS recipient_error_code,

        cr.last_error_message AS recipient_error_message,

        md.id AS delivery_id,

        cm.id AS message_id,

        cm.position AS message_position,

        cm.type AS message_type,

        cm.text_content,

        cm.caption,

        ma.original_filename AS media_filename,

        md.status AS delivery_status,

        COALESCE(
          md.attempt_count,
          0
        ) AS attempt_count,

        md.started_at AS delivery_started_at,

        md.sent_at,

        md.finished_at,

        md.last_error_code AS delivery_error_code,

        md.last_error_message AS delivery_error_message

      FROM campaign_recipients cr

      LEFT JOIN message_deliveries md
        ON md.campaign_recipient_id = cr.id

      LEFT JOIN campaign_messages cm
        ON cm.id = md.campaign_message_id

      LEFT JOIN media_assets ma
        ON ma.id = cm.media_asset_id

      WHERE cr.campaign_id = ?

      ORDER BY
        cr.created_at ASC,
        cr.id ASC,
        md.position ASC
    `)
    .all(campaignId) as Array<{
    recipient_id: string;

    recipient_name: string | null;

    normalized_phone: string;

    original_phone: string | null;

    recipient_status: string;

    recipient_started_at: string | null;

    recipient_completed_at: string | null;

    recipient_error_code: string | null;

    recipient_error_message: string | null;

    delivery_id: string | null;

    message_id: string | null;

    message_position: number | null;

    message_type: string | null;

    text_content: string | null;

    caption: string | null;

    media_filename: string | null;

    delivery_status: string | null;

    attempt_count: number;

    delivery_started_at: string | null;

    sent_at: string | null;

    finished_at: string | null;

    delivery_error_code: string | null;

    delivery_error_message: string | null;
  }>;

  return {
    summary: {
      id: campaign.id,

      name: campaign.name,

      description: campaign.description,

      status: campaign.status,

      sendMode: campaign.send_mode,

      timezone: campaign.timezone,

      createdAt: campaign.created_at,

      updatedAt: campaign.updated_at,

      scheduledAt: campaign.scheduled_at,

      startedAt: campaign.started_at,

      completedAt: campaign.completed_at,

      totalRecipients,

      processedCount: Number(campaign.processed_count),

      successCount,

      failureCount: Number(campaign.failure_count),

      notContactable: Number(campaign.not_contactable),

      uncertainCount: Number(campaign.uncertain_count),

      successRate: calculateSuccessRate(successCount, totalRecipients),
    },

    recipients: recipients.map((recipient) => ({
      id: recipient.id,

      name: recipient.name,

      normalizedPhone: recipient.normalized_phone,

      originalPhone: recipient.original_phone,

      status: recipient.status,

      startedAt: recipient.started_at,

      completedAt: recipient.completed_at,

      lastErrorCode: recipient.last_error_code,

      lastErrorMessage: recipient.last_error_message,

      deliveryCount: Number(recipient.delivery_count),

      sentCount: Number(recipient.sent_count),

      failedCount: Number(recipient.failed_count),

      uncertainCount: Number(recipient.uncertain_count),

      skippedCount: Number(recipient.skipped_count),
    })),

    deliveries: deliveries.map((delivery) => ({
      recipientId: delivery.recipient_id,

      recipientName: delivery.recipient_name,

      normalizedPhone: delivery.normalized_phone,

      originalPhone: delivery.original_phone,

      recipientStatus: delivery.recipient_status,

      recipientStartedAt: delivery.recipient_started_at,

      recipientCompletedAt: delivery.recipient_completed_at,

      recipientErrorCode: delivery.recipient_error_code,

      recipientErrorMessage: delivery.recipient_error_message,

      deliveryId: delivery.delivery_id,

      messageId: delivery.message_id,

      messagePosition:
        delivery.message_position === null
          ? null
          : Number(delivery.message_position),

      messageType: delivery.message_type,

      textContent: delivery.text_content,

      caption: delivery.caption,

      mediaFilename: delivery.media_filename,

      deliveryStatus: delivery.delivery_status,

      attemptCount: Number(delivery.attempt_count),

      deliveryStartedAt: delivery.delivery_started_at,

      sentAt: delivery.sent_at,

      finishedAt: delivery.finished_at,

      deliveryErrorCode: delivery.delivery_error_code,

      deliveryErrorMessage: delivery.delivery_error_message,
    })),
  };
}

function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return '""';
  }

  const text = String(value).replace(/"/g, '""');

  return `"${text}"`;
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(',');
}

function buildSummaryCsv(report: CampaignReport) {
  const summary = report.summary;

  return [
    csvRow(['Field', 'Value']),

    csvRow(['Campaign ID', summary.id]),

    csvRow(['Campaign Name', summary.name]),

    csvRow(['Description', summary.description]),

    csvRow(['Status', summary.status]),

    csvRow(['Send Mode', summary.sendMode]),

    csvRow(['Timezone', summary.timezone]),

    csvRow(['Created At', summary.createdAt]),

    csvRow(['Scheduled At', summary.scheduledAt]),

    csvRow(['Started At', summary.startedAt]),

    csvRow(['Completed At', summary.completedAt]),

    csvRow(['Total Recipients', summary.totalRecipients]),

    csvRow(['Processed', summary.processedCount]),

    csvRow(['Successful', summary.successCount]),

    csvRow(['Failed', summary.failureCount]),

    csvRow(['Not Contactable', summary.notContactable]),

    csvRow(['Uncertain Deliveries', summary.uncertainCount]),

    csvRow(['Success Rate', `${summary.successRate}%`]),
  ].join('\r\n');
}

function buildDetailsCsv(report: CampaignReport) {
  const header = csvRow([
    'Campaign Name',
    'Campaign Status',
    'Recipient Name',
    'WhatsApp Number',
    'Original Number',
    'Recipient Status',
    'Recipient Started At',
    'Recipient Completed At',
    'Recipient Error Code',
    'Recipient Error Message',
    'Message Position',
    'Message Type',
    'Text Content',
    'Caption',
    'Media Filename',
    'Delivery Status',
    'Attempt Count',
    'Delivery Started At',
    'Sent At',
    'Finished At',
    'Delivery Error Code',
    'Delivery Error Message',
  ]);

  const rows = report.deliveries.map((delivery) =>
    csvRow([
      report.summary.name,

      report.summary.status,

      delivery.recipientName,

      delivery.normalizedPhone,

      delivery.originalPhone,

      delivery.recipientStatus,

      delivery.recipientStartedAt,

      delivery.recipientCompletedAt,

      delivery.recipientErrorCode,

      delivery.recipientErrorMessage,

      delivery.messagePosition,

      delivery.messageType,

      delivery.textContent,

      delivery.caption,

      delivery.mediaFilename,

      delivery.deliveryStatus,

      delivery.attemptCount,

      delivery.deliveryStartedAt,

      delivery.sentAt,

      delivery.finishedAt,

      delivery.deliveryErrorCode,

      delivery.deliveryErrorMessage,
    ]),
  );

  return [header, ...rows].join('\r\n');
}

function safeFilename(value: string) {
  const cleaned = Array.from(value)
    .map((character) => {
      const isControlCharacter = character.charCodeAt(0) < 32;

      const isWindowsReservedCharacter = '<>:"/\\|?*'.includes(character);

      if (isControlCharacter || isWindowsReservedCharacter) {
        return '-';
      }

      return character;
    })
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return cleaned || 'campaign-report';
}

export async function exportCampaignReportCsv(
  campaignId: string,
  kind: CampaignReportExportKind,
) {
  if (kind !== 'summary' && kind !== 'details') {
    throw new Error('Invalid campaign report export type.');
  }

  const report = getCampaignReport(campaignId);

  const suffix = kind === 'summary' ? 'summary' : 'details';

  const defaultFilename = `${safeFilename(report.summary.name)}-${suffix}.csv`;

  const result = await dialog.showSaveDialog({
    title:
      kind === 'summary'
        ? 'Export Campaign Summary'
        : 'Export Campaign Details',

    defaultPath: path.join(app.getPath('downloads'), defaultFilename),

    filters: [
      {
        name: 'CSV Files',

        extensions: ['csv'],
      },
    ],
  });

  if (result.canceled || !result.filePath) {
    return {
      canceled: true as const,
    };
  }

  let filePath = result.filePath;

  if (!filePath.toLowerCase().endsWith('.csv')) {
    filePath += '.csv';
  }

  const content =
    kind === 'summary' ? buildSummaryCsv(report) : buildDetailsCsv(report);

  writeFileSync(filePath, `\uFEFF${content}`, 'utf8');

  return {
    canceled: false as const,

    filePath,

    fileName: path.basename(filePath),
  };
}
