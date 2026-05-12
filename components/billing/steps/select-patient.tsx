"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Search, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Patient, ExternalInvoice, InvoicesApiResponse } from "@/lib/types"

interface SelectPatientProps {
  selectedPatient: Patient | null
  onSelectPatient: (patient: Patient) => void
  onNext: () => void
}

const PMS_PAGE_CHUNK = 100

async function invoicesFetcher(url: string): Promise<InvoicesApiResponse> {
  const res = await fetch(url)
  const body = (await res.json()) as InvoicesApiResponse & { message?: string; error_code?: string }
  if (!res.ok || body.status === "error") {
    throw new Error(
      typeof body === "object" && body && "message" in body && typeof body.message === "string"
        ? body.message
        : "Failed to load invoices",
    )
  }
  return body
}

/** One row per patient_id from pending PMS invoices (invoice list is the source of truth). */
function mapPendingInvoicesToPatients(invoices: ExternalInvoice[]): Patient[] {
  const pending = invoices.filter((inv) => inv.status === "pending")
  const byPatient = new Map<string, ExternalInvoice>()
  for (const inv of pending) {
    if (!inv.patient_id) continue
    if (!byPatient.has(inv.patient_id)) byPatient.set(inv.patient_id, inv)
  }
  return [...byPatient.values()].map((inv) => ({
    patient_id: inv.patient_id,
    full_name: inv.patient_name?.trim() || inv.patient_id,
    date_of_birth: "",
    gender: "N/A",
    contact_number: "N/A",
    status: "pending",
    ward_room: "N/A",
    insurance_provider: "Self-Pay",
    insurance_coverage_percentage: 0,
    insurance_policy_number: "N/A",
    attending_physician: "N/A",
  }))
}

export function SelectPatient({ selectedPatient, onSelectPatient, onNext }: SelectPatientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(id)
  }, [searchTerm])

  const invoicesKey = `/api/invoices?status=pending&all_pages=1&limit=${PMS_PAGE_CHUNK}&fresh=1`

  const { data, error, isLoading } = useSWR<InvoicesApiResponse>(invoicesKey, invoicesFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  const allPatients = useMemo(
    () => mapPendingInvoicesToPatients(data?.data?.invoices ?? []),
    [data?.data?.invoices],
  )

  const pendingInvoiceRowCount = useMemo(() => {
    const rows = data?.data?.invoices ?? []
    return rows.filter((inv) => inv.status === "pending").length
  }, [data?.data?.invoices])

  const filteredPatients = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return allPatients
    return allPatients.filter(
      (p) =>
        p.patient_id.toLowerCase().includes(q) ||
        p.full_name.toLowerCase().includes(q),
    )
  }, [allPatients, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredPatients.slice(start, start + pageSize)
  }, [filteredPatients, safePage, pageSize])

  return (
    <div className="space-y-6">
      {selectedPatient && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-primary">Selected Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold">
                    {selectedPatient.full_name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedPatient.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedPatient.patient_id}</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Insurance Provider</p>
                  <p className="font-medium text-foreground">{selectedPatient.insurance_provider}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Attending Physician</p>
                  <p className="font-medium text-foreground">{selectedPatient.attending_physician}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Patient</CardTitle>
            {data && (
              <Badge variant="secondary">
                {filteredPatients.length} patients · {pendingInvoiceRowCount} pending invoices
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Patients are deduplicated by ID; multiple pending invoices for the same patient count once in the table.
          </p>
          {data &&
            typeof data.pagination?.total === "number" &&
            pendingInvoiceRowCount > 0 &&
            pendingInvoiceRowCount < data.pagination.total && (
              <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                Loaded {pendingInvoiceRowCount} of {data.pagination.total} invoice rows reported by PMS. Try again or
                check PMS pagination if this persists.
              </div>
            )}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, patient ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{error instanceof Error ? error.message : "Failed to load pending invoices."}</span>
            </div>
          )}

          {isLoading && !data && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading pending invoices from PMS…</span>
            </div>
          )}

          {!isLoading && pageSlice.length === 0 && !error && (
            <div className="text-center py-12 text-muted-foreground">
              {allPatients.length === 0
                ? "No pending invoices found. There are no patients to bill right now."
                : "No patients match your search."}
            </div>
          )}

          {pageSlice.length > 0 && (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageSlice.map((patient) => (
                      <TableRow
                        key={patient.patient_id}
                        className={selectedPatient?.patient_id === patient.patient_id ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-sm">{patient.patient_id}</TableCell>
                        <TableCell className="font-medium">{patient.full_name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-amber-700 border-amber-600 bg-amber-50"
                          >
                            pending invoice
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={selectedPatient?.patient_id === patient.patient_id ? "default" : "outline"}
                            onClick={() => {
                              onSelectPatient(patient)
                              onNext()
                            }}
                          >
                            {selectedPatient?.patient_id === patient.patient_id ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!selectedPatient} size="lg">
          Continue to Charge Entry
        </Button>
      </div>
    </div>
  )
}
