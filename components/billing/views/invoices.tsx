"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, Eye, Download, RefreshCw, Loader2, FileText, Calendar, User, DollarSign } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { formatCurrency, formatDate } from "@/lib/mock-data"
import type { InvoicesApiResponse, ExternalInvoice } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function InvoicesView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedInvoice, setSelectedInvoice] = useState<ExternalInvoice | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<InvoicesApiResponse>(
    `/api/invoices?page=${currentPage}&limit=10`,
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

  const handleViewInvoice = (invoice: ExternalInvoice) => {
    setSelectedInvoice(invoice)
    setViewDialogOpen(true)
  }

  const handleDownloadInvoice = (invoice: ExternalInvoice) => {
    // Create a printable invoice content
    const printContent = generateInvoiceHTML(invoice)
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const generateInvoiceHTML = (invoice: ExternalInvoice) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .invoice-details { margin-bottom: 20px; }
            .patient-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; }
            .status { padding: 4px 8px; border-radius: 4px; display: inline-block; }
            .status-paid { background-color: #d4edda; color: #155724; }
            .status-pending { background-color: #fff3cd; color: #856404; }
            .status-cancelled { background-color: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Smart Healthcare Management System</h1>
            <h2>Invoice</h2>
          </div>
          
          <div class="invoice-details">
            <p><strong>Invoice ID:</strong> ${invoice.invoice_id}</p>
            <p><strong>Date:</strong> ${formatDate(invoice.invoice_date)}</p>
            <p><strong>Status:</strong> <span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span></p>
          </div>
          
          <div class="patient-info">
            <h3>Patient Information</h3>
            <p><strong>Patient ID:</strong> ${invoice.patient_id}</p>
            <p><strong>Patient Name:</strong> ${invoice.patient_name}</p>
            <p><strong>Health Record ID:</strong> ${invoice.health_record_id}</p>
            ${invoice.diagnosis ? `<p><strong>Diagnosis:</strong> ${invoice.diagnosis}</p>` : ''}
          </div>
          
          <h3>Items</h3>
          <table>
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Dosage</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.medicineName}</td>
                  <td>${item.prescribedDosage}</td>
                  <td>${item.prescribedQuantity}</td>
                  <td>${formatCurrency(item.unitPrice)}</td>
                  <td>${formatCurrency(item.totalPrice)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p><strong>Total Amount: ${formatCurrency(invoice.total_amount)}</strong></p>
          </div>
          
          <div style="margin-top: 40px; font-size: 12px; color: #666;">
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Created by: ${invoice.created_by}</p>
          </div>
        </body>
      </html>
    `
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
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
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

      {/* Invoice Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details - {selectedInvoice?.invoice_id}
            </DialogTitle>
            <DialogDescription>
              Complete invoice information and billing details
            </DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Invoice ID</span>
                  </div>
                  <p className="font-mono text-sm">{selectedInvoice.invoice_id}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Date Issued</span>
                  </div>
                  <p className="text-sm">{formatDate(selectedInvoice.invoice_date)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Total Amount</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(selectedInvoice.total_amount)}</p>
                </div>
              </div>

              <Separator />

              {/* Patient Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient ID</p>
                    <p className="font-mono text-sm">{selectedInvoice.patient_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name</p>
                    <p className="font-medium">{selectedInvoice.patient_name}</p>
                  </div>
                  {selectedInvoice.diagnosis && (
                    <div>
                      <p className="text-sm text-muted-foreground">Diagnosis</p>
                      <p className="text-sm">{selectedInvoice.diagnosis}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Invoice Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Invoice Items</h3>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Medicine Name</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.medicineName}</TableCell>
                          <TableCell>{item.prescribedDosage}</TableCell>
                          <TableCell className="text-right">{item.prescribedQuantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(item.totalPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Prescription Names */}
              {selectedInvoice.prescription_names && selectedInvoice.prescription_names.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Prescriptions</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedInvoice.prescription_names.map((prescription, index) => (
                        <Badge key={index} variant="secondary">
                          {prescription}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Footer Information */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Created by:</strong> {selectedInvoice.created_by}</p>
                <p><strong>Created at:</strong> {new Date(selectedInvoice.created_at).toLocaleString()}</p>
                <p><strong>Last updated:</strong> {new Date(selectedInvoice.updated_at).toLocaleString()}</p>
                {selectedInvoice.updated_by && (
                  <p><strong>Updated by:</strong> {selectedInvoice.updated_by}</p>
                )}
                <p><strong>Released:</strong> {selectedInvoice.is_released ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
