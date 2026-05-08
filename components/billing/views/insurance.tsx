"use client"

import { useState } from "react"
import useSWR from "swr"
import { Search, CheckCircle2, Clock, XCircle, RefreshCw, Loader2 } from "lucide-react"
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
import type { PatientsApiResponse, ExternalPatient } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Derive insurance claims from patient data
interface InsuranceClaim {
  claim_id: string
  patient_name: string
  patient_id: string
  insurance_provider: string
  coverage_percentage: number
  policy_number: string
  group_number: string
  status: "active" | "inactive"
  last_visit: string | null
  visit_count: number
}

function mapPatientToInsuranceClaim(patient: ExternalPatient): InsuranceClaim {
  return {
    claim_id: `CLM-${patient.patient_id}`,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    patient_id: patient.patient_id,
    insurance_provider: patient.insurance?.provider || "Self-Pay",
    coverage_percentage: patient.insurance?.coverage_percentage || 0,
    policy_number: patient.insurance?.policy_number || "N/A",
    group_number: patient.insurance?.group_number || "N/A",
    status: patient.status as "active" | "inactive",
    last_visit: patient.last_visit_date,
    visit_count: patient.visit_count,
  }
}

export function InsuranceView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const { data, error, isLoading, mutate } = useSWR<PatientsApiResponse>(
    `/api/patients?page=${currentPage}&limit=20`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  )

  const patients = data?.data?.patients || []
  const totalPages = data?.pagination?.pages || 1
  const totalResults = data?.pagination?.total || 0

  // Filter patients with insurance
  const patientsWithInsurance = patients.filter(
    (p) => p.insurance?.provider && p.insurance.provider !== "Self-Pay"
  )
  const claims = patientsWithInsurance.map(mapPatientToInsuranceClaim)

  const filteredClaims = claims.filter(
    (claim) =>
      claim.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.claim_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insurance_provider.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeClaims = claims.filter((c) => c.status === "active")
  const inactiveClaims = claims.filter((c) => c.status === "inactive")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            Inactive
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCoverageBadge = (percentage: number) => {
    if (percentage >= 80) {
      return <Badge className="bg-green-100 text-green-800">{percentage}%</Badge>
    } else if (percentage >= 50) {
      return <Badge className="bg-amber-100 text-amber-800">{percentage}%</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">{percentage}%</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Patients with Insurance</p>
            <p className="text-2xl font-bold mt-1">{claims.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{activeClaims.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{inactiveClaims.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Avg Coverage</p>
            <p className="text-2xl font-bold mt-1">
              {claims.length > 0
                ? Math.round(claims.reduce((sum, c) => sum + c.coverage_percentage, 0) / claims.length)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Insurance Claims</CardTitle>
              <Badge variant="outline">{totalResults} patients</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
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
          {isLoading && claims.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load insurance data. Please try again.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Insurance Provider</TableHead>
                      <TableHead>Policy Number</TableHead>
                      <TableHead>Group Number</TableHead>
                      <TableHead>Coverage</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaims.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No insurance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredClaims.map((claim) => (
                        <TableRow key={claim.claim_id}>
                          <TableCell className="font-mono text-sm">{claim.patient_id}</TableCell>
                          <TableCell className="font-medium">{claim.patient_name}</TableCell>
                          <TableCell>{claim.insurance_provider}</TableCell>
                          <TableCell className="font-mono text-sm">{claim.policy_number}</TableCell>
                          <TableCell className="font-mono text-sm">{claim.group_number}</TableCell>
                          <TableCell>{getCoverageBadge(claim.coverage_percentage)}</TableCell>
                          <TableCell>{claim.visit_count}</TableCell>
                          <TableCell>{getStatusBadge(claim.status)}</TableCell>
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
