import { getDatabase } from './database';

export type DatabaseHealth = {
  connected: boolean;
  tables: string[];
  tableCount: number;
};

export function getDatabaseHealth(): DatabaseHealth {
  const db = getDatabase();

  const statement = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `);

  const rows = statement.all() as Array<{
    name: string;
  }>;

  return {
    connected: true,
    tables: rows.map((row) => row.name),
    tableCount: rows.length,
  };
}
