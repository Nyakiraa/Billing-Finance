import { getDb } from "@/lib/db/sqlite"

export type InvoiceItem = {
  medicineId?: string
  medicineName?: string
  prescribedDosage?: string
  prescribedQuantity?: number
  unitPrice?: number
  totalPrice?: number
  serviceName?: string
  quantity?: number
}

export type Invoice = {
  _id: string
  invoice_id: string
  patient_id: string
  patient_name: string
  health_record_id: string
  diagnosis: string
  items: InvoiceItem[]
  prescription_names: string[]
  is_released: boolean
  total_amount: number
  invoice_date: string
  status: "pending" | "paid" | "cancelled" | "refunded"
  created_by: string
  created_at: string
  updated_at: string
  updated_by?: string
}

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (typeof value !== "string") return fallback
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as T[]) : fallback
  } catch {
    return fallback
  }
}

function rowToInvoice(row: any): Invoice {
  return {
    ...row,
    items: parseJsonArray<InvoiceItem>(row.items, []),
    prescription_names: parseJsonArray<string>(row.prescription_names, []),
    is_released: Boolean(row.is_released),
  } as Invoice
}

export async function listInvoices(): Promise<Invoice[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all()
  return rows.map(rowToInvoice)
}

export async function getInvoice(invoiceId: string): Promise<Invoice | undefined> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM invoices WHERE invoice_id = ?").get(invoiceId)
  return row ? rowToInvoice(row) : undefined
}

export async function upsertInvoice(invoice: Invoice): Promise<Invoice> {
  const db = getDb()
  db.prepare(
    `
      INSERT INTO invoices (
        invoice_id, _id, patient_id, patient_name, health_record_id, diagnosis,
        items, prescription_names, is_released, total_amount, invoice_date,
        status, created_by, created_at, updated_at, updated_by
      ) VALUES (
        @invoice_id, @_id, @patient_id, @patient_name, @health_record_id, @diagnosis,
        @items, @prescription_names, @is_released, @total_amount, @invoice_date,
        @status, @created_by, @created_at, @updated_at, @updated_by
      )
      ON CONFLICT(invoice_id) DO UPDATE SET
        _id=excluded._id,
        patient_id=excluded.patient_id,
        patient_name=excluded.patient_name,
        health_record_id=excluded.health_record_id,
        diagnosis=excluded.diagnosis,
        items=excluded.items,
        prescription_names=excluded.prescription_names,
        is_released=excluded.is_released,
        total_amount=excluded.total_amount,
        invoice_date=excluded.invoice_date,
        status=excluded.status,
        created_by=excluded.created_by,
        created_at=excluded.created_at,
        updated_at=excluded.updated_at,
        updated_by=excluded.updated_by
    `,
  ).run({
    ...invoice,
    items: JSON.stringify(invoice.items ?? []),
    prescription_names: JSON.stringify(invoice.prescription_names ?? []),
    is_released: invoice.is_released ? 1 : 0,
  })

  const saved = db.prepare("SELECT * FROM invoices WHERE invoice_id = ?").get(invoice.invoice_id)
  if (!saved) throw new Error(`Failed to save invoice ${invoice.invoice_id}`)
  return rowToInvoice(saved)
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const db = getDb()
  const result = db.prepare("DELETE FROM invoices WHERE invoice_id = ?").run(invoiceId)
  return result.changes > 0
}

