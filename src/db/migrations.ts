import type { DatabaseSync } from 'node:sqlite';

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_hash TEXT,
      source_note TEXT,

      imported_at TEXT NOT NULL,

      total_rows INTEGER NOT NULL DEFAULT 0,
      valid_rows INTEGER NOT NULL DEFAULT 0,
      invalid_rows INTEGER NOT NULL DEFAULT 0,
      duplicate_rows INTEGER NOT NULL DEFAULT 0,
      suppressed_rows INTEGER NOT NULL DEFAULT 0
    );


    CREATE TABLE IF NOT EXISTS import_contacts (
      id TEXT PRIMARY KEY,

      import_id TEXT NOT NULL,

      name TEXT,

      original_phone TEXT NOT NULL,
      normalized_phone TEXT,

      validation_status TEXT NOT NULL,
      validation_reason TEXT,

      is_duplicate INTEGER NOT NULL DEFAULT 0,
      is_suppressed INTEGER NOT NULL DEFAULT 0,

      row_number INTEGER,
      raw_data_json TEXT,

      created_at TEXT NOT NULL,

      FOREIGN KEY (import_id)
        REFERENCES imports(id)
        ON DELETE CASCADE
    );


    CREATE TABLE IF NOT EXISTS suppression_list (
      id TEXT PRIMARY KEY,

      normalized_phone TEXT NOT NULL UNIQUE,

      reason TEXT,
      source TEXT,

      created_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,

      name TEXT NOT NULL,
      description TEXT,

      import_id TEXT,

      status TEXT NOT NULL,

      delivery_profile TEXT
        NOT NULL DEFAULT 'standard',

      send_mode TEXT
        NOT NULL DEFAULT 'now',

      timezone TEXT
        NOT NULL DEFAULT 'Asia/Colombo',

      scheduled_at TEXT,
      started_at TEXT,
      completed_at TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      total_recipients INTEGER
        NOT NULL DEFAULT 0,

      eligible_recipients INTEGER
        NOT NULL DEFAULT 0,

      processed_count INTEGER
        NOT NULL DEFAULT 0,

      success_count INTEGER
        NOT NULL DEFAULT 0,

      failure_count INTEGER
        NOT NULL DEFAULT 0,

      not_contactable INTEGER
        NOT NULL DEFAULT 0,

      suppressed_count INTEGER
        NOT NULL DEFAULT 0,

      FOREIGN KEY (import_id)
        REFERENCES imports(id)
        ON DELETE SET NULL
    );


    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,

      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      local_path TEXT NOT NULL,

      mime_type TEXT,
      file_size INTEGER,
      sha256 TEXT,

      created_at TEXT NOT NULL
    );


    CREATE TABLE IF NOT EXISTS campaign_messages (
      id TEXT PRIMARY KEY,

      campaign_id TEXT NOT NULL,

      position INTEGER NOT NULL,
      type TEXT NOT NULL,

      text_content TEXT,
      caption TEXT,

      media_asset_id TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

      FOREIGN KEY (media_asset_id)
        REFERENCES media_assets(id)
        ON DELETE SET NULL
    );


    CREATE TABLE IF NOT EXISTS campaign_recipients (
      id TEXT PRIMARY KEY,

      campaign_id TEXT NOT NULL,
      import_contact_id TEXT,

      name TEXT,

      normalized_phone TEXT NOT NULL,
      original_phone TEXT,

      status TEXT NOT NULL DEFAULT 'pending',

      started_at TEXT,
      completed_at TEXT,

      last_error_code TEXT,
      last_error_message TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

      FOREIGN KEY (import_contact_id)
        REFERENCES import_contacts(id)
        ON DELETE SET NULL
    );


    CREATE TABLE IF NOT EXISTS message_deliveries (
      id TEXT PRIMARY KEY,

      campaign_id TEXT NOT NULL,
      campaign_recipient_id TEXT NOT NULL,
      campaign_message_id TEXT NOT NULL,

      position INTEGER NOT NULL,

      status TEXT NOT NULL DEFAULT 'pending',

      attempt_count INTEGER NOT NULL DEFAULT 0,

      started_at TEXT,
      sent_at TEXT,
      finished_at TEXT,

      last_error_code TEXT,
      last_error_message TEXT,

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,

      FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

      FOREIGN KEY (campaign_recipient_id)
        REFERENCES campaign_recipients(id)
        ON DELETE CASCADE,

      FOREIGN KEY (campaign_message_id)
        REFERENCES campaign_messages(id)
        ON DELETE CASCADE
    );


    CREATE TABLE IF NOT EXISTS campaign_events (
      id TEXT PRIMARY KEY,

      campaign_id TEXT NOT NULL,

      campaign_recipient_id TEXT,
      message_delivery_id TEXT,

      event_type TEXT NOT NULL,

      message TEXT,
      metadata_json TEXT,

      created_at TEXT NOT NULL,

      FOREIGN KEY (campaign_id)
        REFERENCES campaigns(id)
        ON DELETE CASCADE
    );


    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,

      value_json TEXT NOT NULL,

      updated_at TEXT NOT NULL
    );


    CREATE INDEX IF NOT EXISTS idx_import_contacts_import
      ON import_contacts(import_id);


    CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign
      ON campaign_messages(campaign_id);


    CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign
      ON campaign_recipients(campaign_id);


    CREATE INDEX IF NOT EXISTS idx_campaign_recipients_phone
      ON campaign_recipients(normalized_phone);


    CREATE INDEX IF NOT EXISTS idx_message_deliveries_campaign
      ON message_deliveries(campaign_id);


    CREATE INDEX IF NOT EXISTS idx_message_deliveries_recipient
      ON message_deliveries(campaign_recipient_id);


    CREATE INDEX IF NOT EXISTS idx_campaign_status
      ON campaigns(status);


    CREATE INDEX IF NOT EXISTS idx_campaign_schedule
      ON campaigns(scheduled_at);
  `);

  console.log('[Database] Migrations completed');
}