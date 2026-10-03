import { app } from 'electron';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { runMigrations } from './migrations';

let database: DatabaseSync | null = null;

export function initializeDatabase(): DatabaseSync {
  if (database) {
    return database;
  }

  const databasePath = path.join(
    app.getPath('userData'),
    'campaign-manager.db',
  );

  console.log('[Database] Path:', databasePath);

  database = new DatabaseSync(databasePath);

  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
  `);

  runMigrations(database);

  console.log('[Database] Connected');

  return database;
}

export function getDatabase(): DatabaseSync {
  if (!database) {
    throw new Error('Database has not been initialized.');
  }

  return database;
}

export function closeDatabase(): void {
  if (!database) {
    return;
  }

  database.close();
  database = null;

  console.log('[Database] Closed');
}
