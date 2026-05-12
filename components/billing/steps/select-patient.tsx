"use client"

import { useState } from "react"
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
import { formatDate } from "@/lib/utils"
import type { Patient, ExternalPatient, PatientsApiResponse, InvoicesApiResponse } from "@/lib/types"

interface SelectPatientProps {
  selectedPatient: Patient | null
  onSelectPatient: (patient: Patient) => void
  onNext: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Convert external patient to internal Patient type
function mapExternalToPatient(external: ExternalPatient): Patient {
  return {
    patient_id: external.patient_id,
    full_name: `${external.first_name} ${external.last_name}`,
    date_of_birth: external.date_of_birth,
    gender: external.gender || "N/A",
    contact_number: external.contact_number || "N/A",
    status: external.status || "active",
    ward_room: external.address || "N/A",
    insurance_provider: external.insurance?.provider || "Self-Pay",
    insurance_coverage_percentage: external.insurance?.coverage_percentage || 0,
    insurance_policy_number: external.insurance?.policy_number || "N/A",
    attending_physician: external.attending_physician || "N/A",
  }
}

export function SelectPatient({ selectedPatient, onSelectPatient, onNext }: SelectPatientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page on search
    // Simple debounce using setTimeout
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const { data, error, isLoading } = useSWR<PatientsApiResponse>(
    `/api/patients?page=${currentPage}&limit=10${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  )

  // Fetch invoices to check for fully paid patients
  const { data: invoicesData } = useSWR<InvoicesApiResponse>(
    "/api/invoices?limit=100",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  // API returns: { data: { patients: [...] }, pagination: { pages, total }, status, results }
  const patientsArray = data?.data?.patients || []
  const allPatients = patientsArray.map(mapExternalToPatient)
  
  // Get patient IDs that have fully paid invoices
  const paidPatientIds = new Set(
    invoicesData?.data?.invoices
      .filter(inv => inv.status === "paid")
      .map(inv => inv.patient_id) || []
  )
  
  // Filter out patients with fully paid invoices
  const patients = allPatients.filter(patient => !paidPatientIds.has(patient.patient_id))
  const totalPages = data?.pagination?.pages || 1
  const totalResults = patients.length

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
                    {selectedPatient.full_name.split(" ").map(n => n[0]).join("")}
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
                {totalResults} patients found
              </Badge>
            )}
          </div>
          {allPatients.length > patients.length && (
            <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              {allPatients.length - patients.length} patient(s) with fully paid invoices are hidden from selection.
            </div>
          )}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-4 text-destructive bg-destructive/10 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to load patients. Please try again.</span>
            </div>
          )}

          {isLoading && !data && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading patients...</span>
            </div>
          )}

          {!isLoading && patients.length === 0 && !error && (
            <div className="text-center py-12 text-muted-foreground">
              No patients found. Try adjusting your search.
            </div>
          )}

          {patients.length > 0 && (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow
                        key={patient.patient_id}
                        className={selectedPatient?.patient_id === patient.patient_id ? "bg-primary/5" : ""}
                      >
                        <TableCell className="font-mono text-sm">{patient.patient_id}</TableCell>
                        <TableCell className="font-medium">{patient.full_name}</TableCell>
                        <TableCell>{patient.gender}</TableCell>
                        <TableCell>{formatDate(patient.date_of_birth)}</TableCell>
                        <TableCell>{patient.contact_number}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={patient.status === "active" ? "text-green-600 border-green-600" : "text-muted-foreground"}
                          >
                            {patient.status}
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

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
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
