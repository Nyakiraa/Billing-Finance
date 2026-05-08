"use client"

import { useEffect, useState } from "react"
import { Printer, RotateCcw, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, generateReceiptId } from "@/lib/mock-data"
import type { Invoice, Payment, Receipt } from "@/lib/types"

interface GenerateReceiptProps {
  invoice: Invoice
  payment: Payment
  onNewTransaction: () => void
}

export function GenerateReceipt({ invoice, payment, onNewTransaction }: GenerateReceiptProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  // Send audit log to admin system
  const sendAuditLog = async (receiptData: Receipt) => {
    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "billing-system",
          action_type: "RECORD_CREATED",
          details: `Receipt ${receiptData.receipt_id} generated for patient ${receiptData.patient_name}. Invoice: ${receiptData.invoice_id}. Amount: ${receiptData.amount_paid}. Payment method: ${receiptData.payment_method}.`,
          ip_addr: "0.0.0.0",
          subsystem: "Billing",
        }),
      })
    } catch (error) {
      console.error("Failed to send audit log:", error)
    }
  }

  useEffect(() => {
    if (!receipt) {
      const now = new Date()
      const newReceipt: Receipt = {
        receipt_id: generateReceiptId(),
        patient_name: invoice.patient_name,
        invoice_id: invoice.invoice_id,
        date_time: now.toISOString(),
        amount_paid: payment.amount_tendered >= invoice.total_amount_due ? invoice.total_amount_due : payment.amount_tendered,
        payment_method: payment.payment_method,
        processed_by: "Admin User",
        balance_remaining: 0,
        status: "Paid",
      }
      setReceipt(newReceipt)
      
      // Send audit log when receipt is generated
      sendAuditLog(newReceipt)
    }
  }, [receipt, invoice, payment])

  if (!receipt) return null

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="bg-green-100 rounded-full p-4">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
        <p className="text-muted-foreground mt-1">Transaction has been completed successfully</p>
      </div>

      <Card className="max-w-lg mx-auto">
        <CardContent className="p-0">
          {/* Receipt Header */}
          <div className="bg-primary p-6 text-primary-foreground text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold">H</span>
              </div>
              <span className="font-bold">Smart Healthcare Medical Center</span>
            </div>
            <h1 className="text-2xl font-bold">OFFICIAL RECEIPT</h1>
          </div>

          {/* Receipt Content */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-dashed border-border">
              <div>
                <span className="text-sm text-muted-foreground">Receipt No.</span>
                <p className="font-mono font-bold text-lg">{receipt.receipt_id}</p>
              </div>
              <Badge className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-1">
                PAID
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient Name</span>
                <span className="font-medium">{receipt.patient_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice ID</span>
                <span className="font-mono text-sm">{receipt.invoice_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium">{formatDateTime(receipt.date_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{receipt.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processed By</span>
                <span className="font-medium">{receipt.processed_by}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed border-border space-y-3">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Amount Paid</span>
                <span className="font-bold text-green-600">{formatCurrency(receipt.amount_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Remaining</span>
                <span className="font-medium">{formatCurrency(receipt.balance_remaining)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Thank you for your payment. This serves as your official receipt.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                For inquiries, please contact our billing department at +63 2 8888 1234
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Button variant="outline" size="lg">
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
        <Button onClick={onNewTransaction} size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          New Transaction
        </Button>
      </div>
    </div>
  )
}
