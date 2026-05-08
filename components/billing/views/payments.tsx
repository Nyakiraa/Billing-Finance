"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, RefreshCw, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/mock-data"
import type { InvoicesApiResponse } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PaymentsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch paid invoices as payment records
  const { data, error, isLoading, mutate } = useSWR<InvoicesApiResponse>(
    `/api/invoices?page=${currentPage}&limit=20`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  )

  const invoices = data?.data?.invoices || []
  const totalPages = data?.pagination?.pages || 1
  
  // Filter only paid invoices as payments
  const paidInvoices = invoices.filter((inv) => inv.status === "paid")

  const filteredPayments = paidInvoices.filter(
    (payment) =>
      payment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      Cash: "bg-green-100 text-green-800",
      "Credit Card": "bg-blue-100 text-blue-800",
      PhilHealth: "bg-amber-100 text-amber-800",
      HMO: "bg-purple-100 text-purple-800",
      "Split Payment": "bg-pink-100 text-pink-800",
      Insurance: "bg-indigo-100 text-indigo-800",
    }
    return (
      <Badge variant="secondary" className={colors[method] || "bg-gray-100 text-gray-800"}>
        {method || "N/A"}
      </Badge>
    )
  }

  const totalPayments = paidInvoices.reduce((sum, p) => sum + p.total_amount, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalPayments)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold mt-1">{paidInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Average Payment</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalPayments / paidInvoices.length || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => mutate()}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && paidInvoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load payments. Please try again.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No paid invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.invoice_id}>
                          <TableCell className="font-mono text-sm">{payment.invoice_id}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {payment.patient_id}
                          </TableCell>
                          <TableCell className="font-medium">{payment.patient_name}</TableCell>
                          <TableCell>{formatDateTime(payment.updated_at || payment.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(payment.items || []).slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {item.medicineName}
                                </Badge>
                              ))}
                              {(payment.items || []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(payment.items || []).length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            {formatCurrency(payment.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
