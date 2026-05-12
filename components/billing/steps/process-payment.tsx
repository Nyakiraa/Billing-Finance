"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { formatCurrency } from "@/lib/utils"
import type { Invoice, Payment } from "@/lib/types"

interface ProcessPaymentProps {
  invoice: Invoice
  payment: Payment | null
  onUpdatePayment: (payment: Payment) => void
  onBack: () => void
  onNext: () => void
}

type PaymentMethod = "Cash" | "Credit Card" | "PhilHealth" | "HMO" | "Split Payment"

export function ProcessPayment({
  invoice,
  payment,
  onUpdatePayment,
  onBack,
  onNext,
}: ProcessPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(payment?.payment_method || "Cash")
  const [amountTendered, setAmountTendered] = useState(payment?.amount_tendered || invoice.total_amount_due)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  const change = Math.max(0, amountTendered - invoice.total_amount_due)
  const isValidPayment = amountTendered >= invoice.total_amount_due

  const handleConfirmPayment = async () => {
    setIsProcessing(true)
    setPaymentError(false)

    // Short confirmation delay only (no random failures — payment is recorded in-app)
    await new Promise((resolve) => setTimeout(resolve, 200))

    setPaymentSuccess(true)
    onUpdatePayment({
      amount_due: invoice.total_amount_due,
      payment_method: paymentMethod,
      amount_tendered: amountTendered,
      change,
    })
    setTimeout(() => {
      onNext()
    }, 250)

    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      {paymentError && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Payment unsuccessful - please retry or choose another method
          </AlertDescription>
        </Alert>
      )}

      {paymentSuccess && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription>Payment successful! Generating receipt...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Amount Due</Label>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(invoice.total_amount_due)}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="Cash" id="cash" />
                  <Label htmlFor="cash" className="flex-1 cursor-pointer font-medium">
                    Cash
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="Credit Card" id="credit" />
                  <Label htmlFor="credit" className="flex-1 cursor-pointer font-medium">
                    Credit Card
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="PhilHealth" id="philhealth" />
                  <Label htmlFor="philhealth" className="flex-1 cursor-pointer font-medium">
                    PhilHealth
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="HMO" id="hmo" />
                  <Label htmlFor="hmo" className="flex-1 cursor-pointer font-medium">
                    HMO
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="Split Payment" id="split" />
                  <Label htmlFor="split" className="flex-1 cursor-pointer font-medium">
                    Split Payment
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {paymentMethod === "Cash" && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <Label>Amount Tendered</Label>
                  <Input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(Number(e.target.value))}
                    min={0}
                    className="text-lg"
                  />
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Change</span>
                    <span className={`text-2xl font-bold ${change > 0 ? "text-green-600" : "text-foreground"}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                </div>

                {!isValidPayment && (
                  <p className="text-sm text-destructive">
                    Amount tendered must be at least {formatCurrency(invoice.total_amount_due)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-mono font-medium">{invoice.invoice_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Patient Name</span>
                <span className="font-medium">{invoice.patient_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between py-2 border-b border-border text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">VAT</span>
                <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border text-green-600">
                <span>Insurance Coverage</span>
                <span>-{formatCurrency(invoice.insurance_coverage)}</span>
              </div>
              <div className="flex justify-between py-3 bg-primary/5 rounded-lg px-3 -mx-3">
                <span className="text-lg font-semibold">Total Amount Due</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(invoice.total_amount_due)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg" disabled={isProcessing}>
          Back
        </Button>
        <Button
          onClick={handleConfirmPayment}
          disabled={!isValidPayment || isProcessing || paymentSuccess}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white min-w-[180px]"
        >
          {isProcessing ? "Processing..." : "Confirm Payment"}
        </Button>
      </div>
    </div>
  )
}
