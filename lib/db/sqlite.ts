import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let db: Database.Database | null = null;

function ensureSchema(database: Database.Database) {
  database.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS bills (
      bill_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      services_rendered TEXT NOT NULL,
      total_amount REAL NOT NULL,
      insurance_provider TEXT NOT NULL,
      insurance_coverage REAL NOT NULL,
      patient_balance REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      billing_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      is_insurance_claimed INTEGER NOT NULL,
      attending_doctor_id TEXT NOT NULL,
      is_voided INTEGER NOT NULL,
      voided_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bills_patient_visit ON bills(patient_id, visit_date);
    CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);

    CREATE TABLE IF NOT EXISTS bill_audits (
      audit_id TEXT PRIMARY KEY,
      bill_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      changes TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bill_audits_bill_id ON bill_audits(bill_id);
    CREATE INDEX IF NOT EXISTS idx_bill_audits_timestamp ON bill_audits(timestamp);

    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id TEXT PRIMARY KEY,
      _id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      health_record_id TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      items TEXT NOT NULL,
      prescription_names TEXT NOT NULL,
      is_released INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      invoice_date TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
  `);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "billing-finance.sqlite");

  db = new Database(dbPath);
  ensureSchema(db);
  return db;
}

