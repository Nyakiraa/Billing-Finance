"use client"

import { Fragment, useEffect, useState } from "react"
import { Download, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency, formatDate, generateInvoiceId } from "@/lib/mock-data"
import type { Patient, ChargeEntry, TaxComputation, Invoice } from "@/lib/types"

interface GenerateInvoiceProps {
  patient: Patient
  chargeEntry: ChargeEntry
  taxComputation: TaxComputation
  invoice: Invoice | null
  onUpdateInvoice: (invoice: Invoice) => void
  onBack: () => void
  onNext: () => void
}

export function GenerateInvoice({
  patient,
  chargeEntry,
  taxComputation,
  invoice,
  onUpdateInvoice,
  onBack,
  onNext,
}: GenerateInvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<Invoice | null>(invoice)

  useEffect(() => {
    if (!invoiceData) {
      const today = new Date()
      const dueDate = new Date(today)
      dueDate.setDate(dueDate.getDate() + 14)

      const newInvoice: Invoice = {
        invoice_id: generateInvoiceId(),
        date_issued: today.toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        patient_id: patient.patient_id,
        patient_name: patient.full_name,
        patient_info: {
          address: "123 Sample Street, Manila, Philippines",
          contact: "+63 912 345 6789",
        },
        line_items: chargeEntry.line_items,
        subtotal: taxComputation.subtotal,
        discount_type: taxComputation.discount_type,
        discount_amount: taxComputation.discount_amount,
        tax_amount: taxComputation.tax_amount,
        insurance_coverage: taxComputation.insurance_coverage,
        total_amount_due: taxComputation.total_amount_due,
        status: "Unpaid",
      }
      setInvoiceData(newInvoice)
      onUpdateInvoice(newInvoice)
    }
  }, [invoiceData, patient, chargeEntry, taxComputation, onUpdateInvoice])

  if (!invoiceData) return null

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "service":
        return "Services"
      case "medication":
        return "Medications"
      case "fee":
        return "Professional Fees"
      default:
        return category
    }
  }

  // Group line items by category
  const groupedItems = invoiceData.line_items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof invoiceData.line_items>
  )

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Invoice Header */}
          <div className="bg-primary p-8 text-primary-foreground">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl font-bold">H</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Smart Healthcare Medical Center</h2>
                    <p className="text-primary-foreground/80 text-sm">Excellence in Healthcare</p>
                  </div>
                </div>
                <p className="text-sm text-primary-foreground/70">
                  123 Medical Drive, Makati City, Philippines
                </p>
                <p className="text-sm text-primary-foreground/70">Tel: +63 2 8888 1234</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  {invoiceData.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Bill To:</h3>
                <p className="font-semibold text-lg">{invoiceData.patient_name}</p>
                <p className="text-sm text-muted-foreground">{invoiceData.patient_id}</p>
                <p className="text-sm text-muted-foreground">{invoiceData.patient_info.address}</p>
                <p className="text-sm text-muted-foreground">{invoiceData.patient_info.contact}</p>
              </div>
              <div className="text-right">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Invoice Number:</span>
                    <p className="font-mono font-semibold">{invoiceData.invoice_id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Date Issued:</span>
                    <p className="font-medium">{formatDate(invoiceData.date_issued)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <p className="font-medium text-destructive">{formatDate(invoiceData.due_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-lg border border-border overflow-hidden mb-8">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedItems).map(([category, items]) => (
                    <Fragment key={category}>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={4} className="font-semibold text-primary">
                          {getCategoryLabel(category)}
                        </TableCell>
                      </TableRow>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-8">{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoiceData.subtotal)}</span>
                </div>

                {invoiceData.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({invoiceData.discount_type})</span>
                    <span>-{formatCurrency(invoiceData.discount_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (12%)</span>
                  <span className="font-medium">{formatCurrency(invoiceData.tax_amount)}</span>
                </div>

                <div className="flex justify-between text-green-600">
                  <span>Insurance Coverage</span>
                  <span>-{formatCurrency(invoiceData.insurance_coverage)}</span>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount Due</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(invoiceData.total_amount_due)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                Thank you for choosing Smart Healthcare Medical Center. For inquiries, please contact our billing department.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Download Invoice
          </Button>
          <Button onClick={onNext} size="lg">
            <CreditCard className="w-4 h-4 mr-2" />
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
