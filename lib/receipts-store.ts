import { listBills } from "@/lib/billing/service"
import type { BillRecord } from "@/lib/billing/types"
import type { InvoiceItem } from "@/lib/invoices-store"

export type ReceiptRecord = {
  bill_id: string
  receipt_id: string
  invoice_id: string
  patient_id: string
  patient_name: string
  amount_paid: number
  balance_remaining: number
  payment_method: string
  status: "Paid"
  issued_at: string
  updated_at: string
  items: InvoiceItem[]
}

function toReceipt(bill: BillRecord): ReceiptRecord {
  const invoiceId = bill.bill_id.replace(/^BILL-/, "INV-")
  return {
    bill_id: bill.bill_id,
    receipt_id: bill.bill_id,
    invoice_id: invoiceId,
    patient_id: bill.patient_id,
    patient_name: bill.patient_name,
    amount_paid: Number(bill.total_amount ?? 0),
    balance_remaining: Number(bill.patient_balance ?? 0),
    payment_method: bill.payment_method || "N/A",
    status: "Paid",
    issued_at: bill.visit_date,
    updated_at: bill.updated_at || bill.created_at || bill.visit_date,
    items: (bill.services_rendered || []).map((service) => ({ serviceName: service } satisfies InvoiceItem)),
  }
}

export async function listReceiptsFromPaidInvoices(): Promise<ReceiptRecord[]> {
  const bills = await listBills()
  return bills
    .filter((bill) => !bill.is_voided && bill.payment_status === "Paid")
    .map(toReceipt)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export async function getReceiptById(receiptId: string): Promise<ReceiptRecord | undefined> {
  const receipts = await listReceiptsFromPaidInvoices()
  return receipts.find((receipt) => receipt.bill_id === receiptId || receipt.receipt_id === receiptId)
}

