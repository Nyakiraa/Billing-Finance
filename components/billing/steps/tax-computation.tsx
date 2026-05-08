"use client"

import { useState, useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/mock-data"
import type { Patient, ChargeEntry, TaxComputation as TaxComputationType } from "@/lib/types"

interface TaxComputationProps {
  patient: Patient
  chargeEntry: ChargeEntry
  taxComputation: TaxComputationType | null
  onUpdateTaxComputation: (computation: TaxComputationType) => void
  onBack: () => void
  onNext: () => void
}

const TAX_RATE = 0.12 // 12% VAT

export function TaxComputation({
  patient,
  chargeEntry,
  taxComputation,
  onUpdateTaxComputation,
  onBack,
  onNext,
}: TaxComputationProps) {
  const [discountType, setDiscountType] = useState<"None" | "Senior" | "PWD" | "Promo">(
    taxComputation?.discount_type || "None"
  )
  const [isDataComplete, setIsDataComplete] = useState(true)

  const subtotal = chargeEntry.subtotal
  
  // Calculate insurance coverage based on patient's coverage percentage
  const insuranceCoveragePercentage = patient.insurance_coverage_percentage || 0
  const insuranceProvider = patient.insurance_provider || "Self-Pay"

  // Calculate discount based on type
  const getDiscountAmount = () => {
    switch (discountType) {
      case "Senior":
      case "PWD":
        return subtotal * 0.2 // 20% discount
      case "Promo":
        return subtotal * 0.1 // 10% discount
      default:
        return 0
    }
  }

  const discountAmount = getDiscountAmount()
  const discountedSubtotal = subtotal - discountAmount
  const taxAmount = discountedSubtotal * TAX_RATE
  const totalBeforeInsurance = discountedSubtotal + taxAmount
  // Insurance coverage is a percentage of the total before insurance
  const insuranceCoverage = (totalBeforeInsurance * insuranceCoveragePercentage) / 100
  const totalAmountDue = Math.max(0, totalBeforeInsurance - insuranceCoverage)

  useEffect(() => {
    // Check if data is complete
    const complete =
      chargeEntry.attending_physician !== "" &&
      chargeEntry.ward_room !== "" &&
      chargeEntry.date_of_admission !== "" &&
      chargeEntry.date_of_discharge !== "" &&
      chargeEntry.line_items.length > 0

    setIsDataComplete(complete)

    onUpdateTaxComputation({
      subtotal,
      discount_type: discountType,
      discount_amount: discountAmount,
      tax_rate: TAX_RATE,
      tax_amount: taxAmount,
      insurance_coverage: insuranceCoverage,
      total_amount_due: totalAmountDue,
    })
  }, [subtotal, discountType, discountAmount, taxAmount, insuranceCoverage, totalAmountDue, chargeEntry, onUpdateTaxComputation])

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "service":
        return "Services"
      case "medication":
        return "Medications"
      case "fee":
        return "Fees"
      default:
        return category
    }
  }

  // Group line items by category
  const groupedItems = chargeEntry.line_items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, typeof chargeEntry.line_items>
  )

  return (
    <div className="space-y-6">
      {!isDataComplete && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Incomplete data - please complete all required fields before proceeding</span>
            <Button variant="outline" size="sm" onClick={onBack}>
              Request Data
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Charges Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedItems).map(([category, items]) => (
                  <>
                    <TableRow key={category} className="bg-muted/30">
                      <TableCell colSpan={5} className="font-semibold">
                        {getCategoryLabel(category)}
                      </TableCell>
                    </TableRow>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell></TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax & Discount Computation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Senior">Senior Citizen (20%)</SelectItem>
                    <SelectItem value="PWD">PWD (20%)</SelectItem>
                    <SelectItem value="Promo">Promo (10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Insurance Coverage</Label>
                <Input
                  type="number"
                  value={insuranceCoverage}
                  onChange={(e) => setInsuranceCoverage(Number(e.target.value))}
                  min="0"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discountType})</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (12%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Insurance Coverage</span>
                <span className="text-green-600">-{formatCurrency(insuranceCoverage)}</span>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount Due</span>
                  <span className="text-3xl font-bold text-primary">{formatCurrency(totalAmountDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <Button onClick={onNext} disabled={!isDataComplete} size="lg">
          Generate Invoice
        </Button>
      </div>
    </div>
  )
}
