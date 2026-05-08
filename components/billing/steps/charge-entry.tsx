"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Plus, Trash2, Loader2, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  mockPhysicians,
  mockServicesFromAdmin,
  mockDoctorFeesFromStaffMgmt,
  formatCurrency,
} from "@/lib/mock-data"
import type { Patient, ChargeEntry as ChargeEntryType, LineItem, InvoicesApiResponse, ExternalInvoice, ExternalInvoiceItem } from "@/lib/types"

interface ChargeEntryProps {
  patient: Patient
  chargeEntry: ChargeEntryType | null
  onUpdateChargeEntry: (entry: ChargeEntryType) => void
  onBack: () => void
  onNext: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ChargeEntry({ patient, chargeEntry, onUpdateChargeEntry, onBack, onNext }: ChargeEntryProps) {
  const [attendingPhysician, setAttendingPhysician] = useState(chargeEntry?.attending_physician || patient.attending_physician || "")
  const [attendingDoctorId, setAttendingDoctorId] = useState(chargeEntry?.attending_doctor_id || "")
  const [wardRoom, setWardRoom] = useState(chargeEntry?.ward_room || patient.ward_room)
  const [dateOfAdmission, setDateOfAdmission] = useState(chargeEntry?.date_of_admission || "2024-03-20")
  const [dateOfDischarge, setDateOfDischarge] = useState(chargeEntry?.date_of_discharge || "2024-03-23")
  const [lineItems, setLineItems] = useState<LineItem[]>(chargeEntry?.line_items || [])
  const [selectedInvoice, setSelectedInvoice] = useState<ExternalInvoice | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Fetch invoices for the selected patient
  const { data: invoicesData, error: invoicesError, isLoading: invoicesLoading, mutate } = useSWR<InvoicesApiResponse>(
    `/api/invoices?patient_id=${patient.patient_id}&limit=50`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const patientInvoices = invoicesData?.data?.invoices || []

  // Convert items from invoice to line items with unique IDs
  const convertItemsToLineItems = (invoice: ExternalInvoice): LineItem[] => {
    if (!invoice.items || invoice.items.length === 0) {
      return []
    }
    return invoice.items.map((item, index) => ({
      id: `${invoice.invoice_id}-${item.medicineId}-${index}-${Date.now()}`,
      category: "medication" as const,
      item_name: `${item.medicineName} (${item.prescribedDosage})`,
      quantity: item.prescribedQuantity,
      unit_price: item.unitPrice,
      total: item.totalPrice,
    }))
  }

  // Load items from selected invoice - appends medicines to existing line items
  const loadItemsFromInvoice = (invoice: ExternalInvoice) => {
    setSelectedInvoice(invoice)
    const medicineItems = convertItemsToLineItems(invoice)
    
    // Add default services and doctor fees if no existing line items
    if (lineItems.length === 0) {
      setLineItems([
        ...mockServicesFromAdmin.slice(0, 2),
        ...medicineItems,
        ...mockDoctorFeesFromStaffMgmt.slice(0, 1),
      ])
    } else {
      // Append new medicine items to existing line items
      setLineItems([...lineItems, ...medicineItems])
    }
  }

  // Update billing status on the external PMS system
  const updateBillingStatus = async (invoiceId: string, newStatus: "pending" | "paid" | "cancelled" | "refunded") => {
    setUpdatingStatus(true)
    try {
      const response = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, status: newStatus }),
      })

      if (response.ok) {
        // Refresh the invoices data
        mutate()
        if (selectedInvoice?.invoice_id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status: newStatus })
        }
      } else {
        console.error("Failed to update billing status")
      }
    } catch (error) {
      console.error("Error updating billing status:", error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  useEffect(() => {
    onUpdateChargeEntry({
      patient_id: patient.patient_id,
      patient_name: patient.full_name,
      attending_physician: attendingPhysician,
      attending_doctor_id: attendingDoctorId,
      ward_room: wardRoom,
      date_of_admission: dateOfAdmission,
      date_of_discharge: dateOfDischarge,
      line_items: lineItems,
      subtotal,
    })
  }, [attendingPhysician, attendingDoctorId, wardRoom, dateOfAdmission, dateOfDischarge, lineItems, patient, subtotal, onUpdateChargeEntry])

  const handlePhysicianChange = (value: string) => {
    const physician = mockPhysicians.find((p) => p.id === value)
    if (physician) {
      setAttendingPhysician(physician.name)
      setAttendingDoctorId(physician.id)
    }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    const item = { ...updated[index] }
    
    if (field === "quantity" || field === "unit_price") {
      item[field] = Number(value)
      item.total = item.quantity * item.unit_price
    } else if (field === "item_name") {
      item.item_name = value as string
    }
    
    updated[index] = item
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `NEW-${Date.now()}`,
      category: "service",
      item_name: "New Item",
      quantity: 1,
      unit_price: 0,
      total: 0,
    }
    setLineItems([...lineItems, newItem])
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "service":
        return "Service"
      case "medication":
        return "Medication"
      case "fee":
        return "Fee"
      default:
        return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "service":
        return "bg-blue-100 text-blue-800"
      case "medication":
        return "bg-green-100 text-green-800"
      case "fee":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-300"
      case "refunded":
        return "bg-purple-100 text-purple-800 border-purple-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Patient ID</Label>
              <Input value={patient.patient_id} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Patient Name</Label>
              <Input value={patient.full_name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Attending Physician</Label>
              <Select value={attendingDoctorId} onValueChange={handlePhysicianChange}>
                <SelectTrigger>
                  <SelectValue placeholder={attendingPhysician || "Select physician"} />
                </SelectTrigger>
                <SelectContent>
                  {mockPhysicians.map((physician) => (
                    <SelectItem key={physician.id} value={physician.id}>
                      {physician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ward / Room Number</Label>
              <Input value={wardRoom} onChange={(e) => setWardRoom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Admission</Label>
              <Input
                type="date"
                value={dateOfAdmission}
                onChange={(e) => setDateOfAdmission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Discharge</Label>
              <Input
                type="date"
                value={dateOfDischarge}
                onChange={(e) => setDateOfDischarge(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Invoices from PMS */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Patient Invoices (from PMS)</CardTitle>
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={invoicesLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${invoicesLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading invoices...</span>
            </div>
          ) : invoicesError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load invoices. Please try again.
            </div>
          ) : patientInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No invoices found for this patient.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Medicines</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Update Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.invoice_id}
                      className={selectedInvoice?.invoice_id === invoice.invoice_id ? "bg-primary/5" : ""}
                    >
                      <TableCell className="font-mono text-sm">{invoice.invoice_id}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.diagnosis}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const uniqueMedicines = [...new Map((invoice.items || []).map(item => [item.medicineName, item])).values()]
                            return (
                              <>
                                {uniqueMedicines.slice(0, 2).map((item) => (
                                  <Badge key={item.medicineId} variant="secondary" className="text-xs">
                                    {item.medicineName}
                                  </Badge>
                                ))}
                                {uniqueMedicines.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{uniqueMedicines.length - 2} more
                                  </Badge>
                                )}
                                {uniqueMedicines.length === 0 && (
                                  <span className="text-muted-foreground text-xs">No items</span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => updateBillingStatus(invoice.invoice_id, value as "pending" | "paid" | "cancelled" | "refunded")}
                          disabled={updatingStatus}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={selectedInvoice?.invoice_id === invoice.invoice_id ? "default" : "outline"}
                          onClick={() => loadItemsFromInvoice(invoice)}
                        >
                          {selectedInvoice?.invoice_id === invoice.invoice_id ? "Loaded" : "Load"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Running Subtotal</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(subtotal)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-[100px] text-right">Qty</TableHead>
                  <TableHead className="w-[140px] text-right">Unit Price</TableHead>
                  <TableHead className="w-[140px] text-right">Total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No items added. Load medicines from an invoice above or add items manually.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                          {getCategoryLabel(item.category)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => updateLineItem(index, "item_name", e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                          className="h-8 text-right"
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, "unit_price", e.target.value)}
                          className="h-8 text-right"
                          min="0"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.total)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" onClick={addLineItem} className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} size="lg">
          Back
        </Button>
        <Button onClick={onNext} disabled={!attendingPhysician || lineItems.length === 0} size="lg">
          Continue to Tax Computation
        </Button>
      </div>
    </div>
  )
}
