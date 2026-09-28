/**
 * Schema migrations, applied in order. `PRAGMA user_version` stores how many have run.
 * Never edit a shipped migration; add a new one.
 */
export const migrations: readonly string[] = [
  // 1 — initial schema (docs/SPEC.md §2) + receipts.searchText for accent/case-folded search.
  `
  CREATE TABLE receipts (
    id TEXT PRIMARY KEY NOT NULL,
    merchant TEXT,
    merchantNormalized TEXT,
    date TEXT NOT NULL,
    time TEXT,
    totalMinor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    paymentMethod TEXT,
    note TEXT,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    ocrText TEXT,
    ettn TEXT,
    documentNumber TEXT,
    imagePaths TEXT NOT NULL DEFAULT '[]',
    searchText TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX receipts_date ON receipts (date DESC, time DESC, createdAt DESC);
  CREATE INDEX receipts_category ON receipts (category);
  CREATE INDEX receipts_status ON receipts (status);
  CREATE INDEX receipts_ettn ON receipts (ettn) WHERE ettn IS NOT NULL;

  CREATE TABLE receipt_items (
    id TEXT PRIMARY KEY NOT NULL,
    receiptId TEXT NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty REAL,
    amountMinor INTEGER NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX receipt_items_receipt ON receipt_items (receiptId, position);

  CREATE TABLE receipt_taxes (
    id TEXT PRIMARY KEY NOT NULL,
    receiptId TEXT NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
    rate REAL,
    amountMinor INTEGER NOT NULL
  );
  CREATE INDEX receipt_taxes_receipt ON receipt_taxes (receiptId);

  CREATE TABLE budgets (
    category TEXT PRIMARY KEY NOT NULL,
    limitMinor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE merchant_rules (
    merchantNormalized TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  `,
];

/** The migrations still to run for a database at `version`, with the version each one sets. */
export function pendingMigrations(version: number): { version: number; sql: string }[] {
  return migrations.slice(Math.max(0, version)).map((sql, i) => ({ version: version + i + 1, sql }));
}
