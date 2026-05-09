"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
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
    month: "short",
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

interface RecentBillsSectionProps {
  bills: BillRecord[]
  isLoading: boolean
  onSelectBill: (bill: BillRecord) => void
}

export function RecentBillsSection({ bills, isLoading, onSelectBill }: RecentBillsSectionProps) {
  // Sort bills by billing_date in descending order and get the 5 most recent
  const recentBills = [...bills]
    .sort((a, b) => new Date(b.billing_date).getTime() - new Date(a.billing_date).getTime())
    .slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recently Generated Bills</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : recentBills.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No bills found</p>
        ) : (
          <div className="space-y-3">
            {recentBills.map((bill) => (
              <button
                key={bill.bill_id}
                onClick={() => onSelectBill(bill)}
                className="w-full text-left p-4 bg-muted/50 hover:bg-muted/80 rounded-lg transition-colors border border-transparent hover:border-muted-foreground/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium text-sm">{bill.bill_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bill.billing_date)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{bill.patient_name}</p>
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(bill.total_amount)}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPaymentStatusColor(bill.payment_status)}`}
                      >
                        {bill.payment_status}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
