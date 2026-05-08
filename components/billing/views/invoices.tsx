"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, Eye, Download, RefreshCw, Loader2 } from "lucide-react"
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
import { formatCurrency, formatDate } from "@/lib/mock-data"
import type { InvoicesApiResponse } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function InvoicesView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

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
  const totalResults = data?.pagination?.total || 0

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500 hover:bg-green-600">Paid</Badge>
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      case "refunded":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold mt-1">{totalResults}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {invoices.filter((i) => i.status === "paid").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {invoices.filter((i) => i.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(invoices.reduce((sum, i) => sum + i.total_amount, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>All Invoices</CardTitle>
              <Badge variant="outline">{totalResults} total</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
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
          {isLoading && invoices.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load invoices. Please try again.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.invoice_id}>
                          <TableCell className="font-mono text-sm">{invoice.invoice_id}</TableCell>
                          <TableCell className="font-medium">{invoice.patient_name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {invoice.patient_id}
                          </TableCell>
                          <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(invoice.items || []).slice(0, 2).map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {item.medicineName}
                                </Badge>
                              ))}
                              {(invoice.items || []).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(invoice.items || []).length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
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
