import { getInvoice, listInvoices, type Invoice, type InvoiceItem } from "@/lib/invoices-store"

export type ReceiptRecord = {
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

function toReceiptId(invoiceId: string): string {
  return `RCT-${invoiceId}`
}

function toReceipt(invoice: Invoice): ReceiptRecord {
  return {
    receipt_id: toReceiptId(invoice.invoice_id),
    invoice_id: invoice.invoice_id,
    patient_id: invoice.patient_id,
    patient_name: invoice.patient_name,
    amount_paid: Number(invoice.total_amount ?? 0),
    balance_remaining: 0,
    payment_method: "N/A",
    status: "Paid",
    issued_at: invoice.updated_at || invoice.created_at || invoice.invoice_date,
    updated_at: invoice.updated_at || invoice.created_at || invoice.invoice_date,
    items: invoice.items ?? [],
  }
}

export async function listReceiptsFromPaidInvoices(): Promise<ReceiptRecord[]> {
  const invoices = await listInvoices()
  return invoices
    .filter((invoice) => invoice.status === "paid")
    .map(toReceipt)
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
}

export async function getReceiptById(receiptId: string): Promise<ReceiptRecord | undefined> {
  if (!receiptId.startsWith("RCT-")) return undefined
  const invoiceId = receiptId.slice(4)
  if (!invoiceId) return undefined

  const invoice = await getInvoice(invoiceId)
  if (!invoice || invoice.status !== "paid") return undefined

  return toReceipt(invoice)
}

