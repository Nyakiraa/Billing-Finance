"use client"

import { X, Printer, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { BillRecord } from "@/lib/billing/types"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function getPaymentStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-green-500/10 text-green-600 border-green-600"
    case "pending":
      return "bg-amber-500/10 text-amber-600 border-amber-600"
    case "unpaid":
      return "bg-red-500/10 text-red-600 border-red-600"
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-600"
  }
}

interface BillDetailsModalProps {
  bill: BillRecord
  onClose: () => void
}

export function BillDetailsModal({ bill, onClose }: BillDetailsModalProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a simple text-based receipt download
    const content = `
RECEIPT / BILL
${bill.bill_id}
${"=".repeat(50)}

PATIENT INFORMATION
Patient Name: ${bill.patient_name}
Patient ID: ${bill.patient_id}
Insurance Provider: ${bill.insurance_provider}

BILLING DETAILS
Visit Date: ${formatDate(bill.visit_date)}
Billing Date: ${formatDate(bill.billing_date)}
Due Date: ${formatDate(bill.due_date)}
Attending Doctor: ${bill.attending_doctor_id}

SERVICES RENDERED
${bill.services_rendered.join(", ")}

AMOUNT DETAILS
Total Amount: ${formatCurrency(bill.total_amount)}
Insurance Coverage: ${formatCurrency(bill.insurance_coverage)}
Patient Balance: ${formatCurrency(bill.patient_balance)}

PAYMENT STATUS
Status: ${bill.payment_status}
Payment Method: ${bill.payment_method}
Is Insurance Claimed: ${bill.is_insurance_claimed ? "Yes" : "No"}

${"=".repeat(50)}
Generated: ${new Date().toLocaleString("en-PH")}
    `.trim()

    const element = document.createElement("a")
    element.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`)
    element.setAttribute("download", `${bill.bill_id}.txt`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-background border-b flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{bill.bill_id}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{bill.patient_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Patient Information */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Patient Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient Name</p>
                <p className="font-medium">{bill.patient_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Patient ID</p>
                <p className="font-medium">{bill.patient_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Insurance Provider</p>
                <p className="font-medium">{bill.insurance_provider}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Attending Doctor</p>
                <p className="font-medium">{bill.attending_doctor_id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Billing Details */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Billing Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Visit Date</p>
                <p className="font-medium">{formatDate(bill.visit_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Billing Date</p>
                <p className="font-medium">{formatDate(bill.billing_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(bill.due_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ward/Room</p>
                <p className="font-medium">-</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Services Rendered */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Services Rendered
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              {bill.services_rendered.map((service, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Financial Summary */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Financial Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold">{formatCurrency(bill.total_amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Insurance Coverage</span>
                <span className="font-semibold text-green-600">
                  -{formatCurrency(bill.insurance_coverage)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Patient Balance Due</span>
                <span className="font-bold text-lg">{formatCurrency(bill.patient_balance)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
              Payment Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Payment Status</p>
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getPaymentStatusColor(bill.payment_status)}`}
                  >
                    {bill.payment_status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p className="font-medium mt-1">{bill.payment_method}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Insurance Claimed</p>
                <p className="font-medium mt-1">
                  {bill.is_insurance_claimed ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1 gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
