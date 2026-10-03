import { getDatabase } from '../../db/database';

export type SenderSettings = {
  messageDelayMinMs: number;
  messageDelayMaxMs: number;
  recipientDelayMinMs: number;
  recipientDelayMaxMs: number;
  navigationTimeoutMs: number;
  actionTimeoutMs: number;
  mediaUploadTimeoutMs: number;
};

export const DEFAULT_SENDER_SETTINGS: SenderSettings = {
  messageDelayMinMs: 7000,
  messageDelayMaxMs: 10000,
  recipientDelayMinMs: 10000,
  recipientDelayMaxMs: 18000,
  navigationTimeoutMs: 31000,
  actionTimeoutMs: 16000,
  mediaUploadTimeoutMs: 61000,
};

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.round(parsed);
}

function normalizeSenderSettings(
  value: Partial<SenderSettings>,
): SenderSettings {
  return {
    messageDelayMinMs: toPositiveInteger(
      value.messageDelayMinMs,
      DEFAULT_SENDER_SETTINGS.messageDelayMinMs,
    ),

    messageDelayMaxMs: toPositiveInteger(
      value.messageDelayMaxMs,
      DEFAULT_SENDER_SETTINGS.messageDelayMaxMs,
    ),

    recipientDelayMinMs: toPositiveInteger(
      value.recipientDelayMinMs,
      DEFAULT_SENDER_SETTINGS.recipientDelayMinMs,
    ),

    recipientDelayMaxMs: toPositiveInteger(
      value.recipientDelayMaxMs,
      DEFAULT_SENDER_SETTINGS.recipientDelayMaxMs,
    ),

    navigationTimeoutMs: toPositiveInteger(
      value.navigationTimeoutMs,
      DEFAULT_SENDER_SETTINGS.navigationTimeoutMs,
    ),

    actionTimeoutMs: toPositiveInteger(
      value.actionTimeoutMs,
      DEFAULT_SENDER_SETTINGS.actionTimeoutMs,
    ),

    mediaUploadTimeoutMs: toPositiveInteger(
      value.mediaUploadTimeoutMs,
      DEFAULT_SENDER_SETTINGS.mediaUploadTimeoutMs,
    ),
  };
}

function validateSenderSettings(settings: SenderSettings) {
  if (settings.messageDelayMinMs < 7000) {
    throw new Error(
      'The minimum same-recipient message delay cannot be below 7 seconds.',
    );
  }

  if (settings.messageDelayMaxMs < settings.messageDelayMinMs) {
    throw new Error(
      'Maximum message delay must be greater than or equal to the minimum.',
    );
  }

  if (settings.recipientDelayMinMs < 1000) {
    throw new Error('Minimum recipient delay must be at least 1 second.');
  }

  if (settings.recipientDelayMaxMs < settings.recipientDelayMinMs) {
    throw new Error(
      'Maximum recipient delay must be greater than or equal to the minimum.',
    );
  }

  if (settings.navigationTimeoutMs < 5000) {
    throw new Error('Navigation timeout must be at least 5 seconds.');
  }

  if (settings.actionTimeoutMs < 5000) {
    throw new Error('Action timeout must be at least 5 seconds.');
  }

  if (settings.mediaUploadTimeoutMs < 10000) {
    throw new Error('Media upload timeout must be at least 10 seconds.');
  }
}

export function getSenderSettings(): SenderSettings {
  const db = getDatabase();

  const row = db
    .prepare(`
      SELECT value_json
      FROM app_settings
      WHERE key = 'sender'
      LIMIT 1
    `)
    .get() as
    | {
        value_json: string;
      }
    | undefined;

  if (!row) {
    return {
      ...DEFAULT_SENDER_SETTINGS,
    };
  }

  try {
    const parsed = JSON.parse(row.value_json) as Partial<SenderSettings>;

    const settings = normalizeSenderSettings(parsed);

    validateSenderSettings(settings);

    return settings;
  } catch {
    return {
      ...DEFAULT_SENDER_SETTINGS,
    };
  }
}

export function updateSenderSettings(settings: SenderSettings): SenderSettings {
  const db = getDatabase();

  const normalized = normalizeSenderSettings(settings);

  validateSenderSettings(normalized);

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO app_settings (
      key,
      value_json,
      updated_at
    )
    VALUES ('sender', ?, ?)

    ON CONFLICT(key)
    DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(JSON.stringify(normalized), now);

  return normalized;
}
