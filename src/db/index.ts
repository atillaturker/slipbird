import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { pendingMigrations } from './migrations';

const DATABASE_NAME = 'slipbird.db';

let database: SQLiteDatabase | null = null;

/** Opens the app database once, migrated to the latest schema. */
export function getDb(): SQLiteDatabase {
  if (database) return database;
  const db = openDatabaseSync(DATABASE_NAME);
  db.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = db.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  for (const migration of pendingMigrations(version)) {
    db.withTransactionSync(() => {
      db.execSync(migration.sql);
      db.execSync(`PRAGMA user_version = ${migration.version}`);
    });
  }
  // A scan interrupted by the app being closed never finishes: offer retake/manual entry instead.
  db.runSync("UPDATE receipts SET status = 'failed' WHERE status = 'processing'");
  database = db;
  return db;
}
