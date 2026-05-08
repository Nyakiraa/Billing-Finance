"use client"

import { FileText, CreditCard, TrendingUp, Users, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useSWR from "swr"
import type { InvoicesApiResponse, PatientsApiResponse } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

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

export function DashboardView() {
  const { data: invoicesData, isLoading: invoicesLoading, mutate: mutateInvoices } = useSWR<InvoicesApiResponse>(
    "/api/invoices?limit=50",
    fetcher
  )

  const { data: patientsData, isLoading: patientsLoading, mutate: mutatePatients } = useSWR<PatientsApiResponse>(
    "/api/patients?limit=50",
    fetcher
  )

  const invoices = invoicesData?.data?.invoices || []
  const patients = patientsData?.data?.patients || []

  // Calculate stats from real data
  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  const pendingInvoices = invoices.filter((inv) => inv.status === "pending")
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)

  const paidToday = invoices.filter((inv) => {
    const invoiceDate = new Date(inv.invoice_date).toDateString()
    const today = new Date().toDateString()
    return inv.status === "paid" && invoiceDate === today
  })
  const paidTodayAmount = paidToday.reduce((sum, inv) => sum + inv.total_amount, 0)

  const totalPatients = patientsData?.pagination?.total || patients.length
  const activePatients = patients.filter((p) => p.status === "active").length

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      subtext: `${invoices.filter((i) => i.status === "paid").length} paid invoices`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Pending Invoices",
      value: pendingInvoices.length.toString(),
      subtext: `${formatCurrency(pendingAmount)} outstanding`,
      icon: FileText,
      color: "text-amber-600",
    },
    {
      title: "Payments Today",
      value: formatCurrency(paidTodayAmount),
      subtext: `${paidToday.length} transactions`,
      icon: CreditCard,
      color: "text-primary",
    },
    {
      title: "Total Patients",
      value: totalPatients.toString(),
      subtext: `${activePatients} active patients`,
      icon: Users,
      color: "text-blue-600",
    },
  ]

  const handleRefresh = () => {
    mutateInvoices()
    mutatePatients()
  }

  const isLoading = invoicesLoading || patientsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time billing statistics from patient management system</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      {stat.subtext && (
                        <p className="text-sm text-muted-foreground mt-1">{stat.subtext}</p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No invoices found</p>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.invoice_id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{invoice.patient_name}</p>
                      <p className="text-sm text-muted-foreground">{invoice.invoice_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                      <Badge
                        variant="outline"
                        className={
                          invoice.status === "paid"
                            ? "bg-green-500/10 text-green-600 border-green-600"
                            : invoice.status === "pending"
                              ? "bg-amber-500/10 text-amber-600 border-amber-600"
                              : "bg-red-500/10 text-red-600 border-red-600"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Patients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No patients found</p>
            ) : (
              <div className="space-y-4">
                {patients.slice(0, 5).map((patient) => (
                  <div
                    key={patient.patient_id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-medium text-sm">
                          {patient.first_name[0]}{patient.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                        <p className="text-sm text-muted-foreground">{patient.patient_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{patient.insurance?.provider || "Self-Pay"}</p>
                      <Badge
                        variant="outline"
                        className={
                          patient.status === "active"
                            ? "text-green-600 border-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        {patient.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
