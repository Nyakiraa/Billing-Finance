import type { AuditEntry, BillRecord } from "./types";
import { getDb } from "@/lib/db/sqlite";

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject(value: unknown, fallback: Record<string, unknown>): Record<string, unknown> {
  if (typeof value !== "string") return fallback;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return fallback;
  } catch {
    return fallback;
  }
}

function rowToBill(row: any): BillRecord {
  return {
    ...row,
    services_rendered: parseJsonArray<string>(row.services_rendered, []),
    is_insurance_claimed: Boolean(row.is_insurance_claimed),
    is_voided: Boolean(row.is_voided),
    voided_at: row.voided_at ?? null,
  } as BillRecord;
}

export async function getAllBills(): Promise<BillRecord[]> {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM bills ORDER BY created_at DESC").all();
  return rows.map(rowToBill);
}

export async function getBillById(billId: string): Promise<BillRecord | undefined> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM bills WHERE bill_id = ?").get(billId);
  return row ? rowToBill(row) : undefined;
}

export async function saveBill(bill: BillRecord): Promise<BillRecord> {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO bills (
      bill_id, patient_id, patient_name, visit_date, services_rendered,
      total_amount, insurance_provider, insurance_coverage, patient_balance,
      payment_method, payment_status, billing_date, due_date, is_insurance_claimed,
      attending_doctor_id, is_voided, voided_at, created_at, updated_at
    ) VALUES (
      @bill_id, @patient_id, @patient_name, @visit_date, @services_rendered,
      @total_amount, @insurance_provider, @insurance_coverage, @patient_balance,
      @payment_method, @payment_status, @billing_date, @due_date, @is_insurance_claimed,
      @attending_doctor_id, @is_voided, @voided_at, @created_at, @updated_at
    )
    ON CONFLICT(bill_id) DO UPDATE SET
      patient_id=excluded.patient_id,
      patient_name=excluded.patient_name,
      visit_date=excluded.visit_date,
      services_rendered=excluded.services_rendered,
      total_amount=excluded.total_amount,
      insurance_provider=excluded.insurance_provider,
      insurance_coverage=excluded.insurance_coverage,
      patient_balance=excluded.patient_balance,
      payment_method=excluded.payment_method,
      payment_status=excluded.payment_status,
      billing_date=excluded.billing_date,
      due_date=excluded.due_date,
      is_insurance_claimed=excluded.is_insurance_claimed,
      attending_doctor_id=excluded.attending_doctor_id,
      is_voided=excluded.is_voided,
      voided_at=excluded.voided_at,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at
  `);

  stmt.run({
    ...bill,
    services_rendered: JSON.stringify(bill.services_rendered ?? []),
    is_insurance_claimed: bill.is_insurance_claimed ? 1 : 0,
    is_voided: bill.is_voided ? 1 : 0,
    voided_at: bill.voided_at ?? null,
  });

  const saved = db.prepare("SELECT * FROM bills WHERE bill_id = ?").get(bill.bill_id);
  if (!saved) throw new Error(`Failed to save bill ${bill.bill_id}`);
  return rowToBill(saved);
}

export async function findBillByPatientAndVisit(
  patientId: string,
  visitDate: string,
): Promise<BillRecord | undefined> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM bills WHERE patient_id = ? AND visit_date = ? AND is_voided = 0 LIMIT 1")
    .get(patientId, visitDate);
  return row ? rowToBill(row) : undefined;
}

export async function appendAuditLog(entry: AuditEntry): Promise<void> {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO bill_audits (audit_id, bill_id, action, actor_id, actor_role, timestamp, changes)
      VALUES (@audit_id, @bill_id, @action, @actor_id, @actor_role, @timestamp, @changes)
    `,
  ).run({
    ...entry,
    changes: JSON.stringify(entry.changes ?? {}),
  });
}

export async function getAuditLogsByBillId(billId: string): Promise<AuditEntry[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM bill_audits WHERE bill_id = ? ORDER BY timestamp ASC")
    .all(billId);

  return rows.map((row: any) => ({
    ...row,
    changes: parseJsonObject(row.changes, {}),
  })) as AuditEntry[];
}
