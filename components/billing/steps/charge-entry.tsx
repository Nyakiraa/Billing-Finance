"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { Trash2 } from "lucide-react"
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
import { formatCurrency } from "@/lib/utils"
import type { Patient, ChargeEntry as ChargeEntryType, LineItem } from "@/lib/types"

interface PatientMedicationsResponse {
  status: string
  data: {
    patientId: string
    medications: Array<{
      id: string
      medicineName: string
      dosage: string
      quantity: number
      frequency: string
      prescriptionDate: string
      unitPrice?: number
      totalPrice?: number
    }>
  }
}

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

  const physicians = [
    { id: "DOC-0045", name: "Dr. Roberto Mendoza" },
    { id: "DOC-0046", name: "Dr. Cristina Lim" },
    { id: "DOC-0047", name: "Dr. Antonio Cruz" },
    { id: "DOC-0048", name: "Dr. Maribel Santos" },
  ]

  // Fetch patient medications from PMS
  const { data: medicationsData, error: medicationsError, isLoading: medicationsLoading } = useSWR<PatientMedicationsResponse>(
    `/api/patients/${patient.patient_id}/medications`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const patientMedications = medicationsData?.data?.medications || []

  const medicineNames = useMemo(() => {
    return patientMedications
      .map((med) => med.medicineName || med.id || "")
      .filter(Boolean)
      .join(",")
  }, [patientMedications])

  const { data: inventoryData, error: inventoryError, isLoading: inventoryLoading } = useSWR(
    medicineNames ? `/api/inventory?medicine_names=${encodeURIComponent(medicineNames)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const inventoryResults = useMemo(() => {
    const items: Array<{ medicineName: string; availableStock: number }> = []

    const rawItems = inventoryData?.data?.inventory || inventoryData?.data?.stock || []
    if (Array.isArray(rawItems)) {
      for (const item of rawItems) {
        const medicineName =
          item?.medicine_name || item?.medicineName || item?.name || ""
        const availableStock =
          typeof item?.available_stock === "number"
            ? item.available_stock
            : typeof item?.stock === "number"
            ? item.stock
            : typeof item?.quantity === "number"
            ? item.quantity
            : undefined

        if (medicineName && typeof availableStock === "number") {
          items.push({ medicineName, availableStock })
        }
      }
    }

    return items
  }, [inventoryData])

  const inventoryMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of inventoryResults) {
      map.set(item.medicineName.trim().toLowerCase(), item.availableStock)
    }
    return map
  }, [inventoryResults])

  const parseMedicineName = (itemName: string) => itemName.split(" (")[0].trim()

  const getStockForItem = (itemName: string) => {
    const key = parseMedicineName(itemName).toLowerCase()
    return inventoryMap.get(key)
  }

  const patientLineItemStocks = lineItems.map((item) => ({
    ...item,
    availableStock: getStockForItem(item.item_name),
  }))

  // If the user selects a different patient, reset step-specific state so we
  // don't show the previous patient's line items.
  useEffect(() => {
    setAttendingPhysician(patient.attending_physician || "")
    setAttendingDoctorId("")
    setWardRoom(patient.ward_room)
    setLineItems([])
  }, [patient.patient_id])

  // Auto-load patient medications into line items when data is available
  useEffect(() => {
    if (patientMedications.length > 0 && lineItems.length === 0) {
      const medicineItems: LineItem[] = patientMedications.map((med, index) => ({
        id: `${med.id}-${index}`,
        category: "medication" as const,
        item_name: `${med.medicineName} (${med.dosage})`,
        quantity: med.quantity,
        unit_price: typeof med.unitPrice === "number" ? med.unitPrice : 0,
        total:
          typeof med.totalPrice === "number"
            ? med.totalPrice
            : typeof med.unitPrice === "number"
              ? med.quantity * med.unitPrice
              : 0,
      }))
      if (medicineItems.length > 0) {
        setLineItems(medicineItems)
      }
    }
  }, [patientMedications, lineItems.length, patient.patient_id])

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
    const physician = physicians.find((p) => p.id === value)
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
              <Select value={attendingDoctorId} onValueChange={handlePhysicianChange} disabled>
                <SelectTrigger className="bg-muted">
                  <SelectValue placeholder={attendingPhysician || "Select physician"} />
                </SelectTrigger>
                <SelectContent>
                  {physicians.map((physician) => (
                    <SelectItem key={physician.id} value={physician.id}>
                      {physician.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ward / Room Number</Label>
              <Input value={wardRoom} onChange={(e) => setWardRoom(e.target.value)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Date of Admission</Label>
              <Input
                type="date"
                value={dateOfAdmission}
                onChange={(e) => setDateOfAdmission(e.target.value)}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Discharge</Label>
              <Input
                type="date"
                value={dateOfDischarge}
                onChange={(e) => setDateOfDischarge(e.target.value)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
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
                  <TableHead className="w-[120px] text-right">Inventory Qty</TableHead>
                  <TableHead className="w-[140px] text-right">Total</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No medicines found for this patient.
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
                          disabled
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                          className="h-8 text-right"
                          min="1"
                          disabled
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateLineItem(index, "unit_price", e.target.value)}
                          className="h-8 text-right"
                          min="0"
                          disabled
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {typeof getStockForItem(item.item_name) === "number" ? (
                          getStockForItem(item.item_name)
                        ) : (
                          <span className="text-muted-foreground">n/a</span>
                        )}
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
                          disabled
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Stock</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryLoading ? (
            <p className="text-sm text-muted-foreground">Loading inventory data…</p>
          ) : inventoryError ? (
            <p className="text-sm text-destructive">Unable to load inventory data.</p>
          ) : patientLineItemStocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicine line items available to check stock.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patientLineItemStocks.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold">{item.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Available Quantity: {typeof item.availableStock === "number" ? item.availableStock : "n/a"}
                  </p>
                </div>
              ))}
            </div>
          )}
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
