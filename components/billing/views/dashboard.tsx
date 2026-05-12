"use client"

import { FileText, CreditCard, TrendingUp, Users, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import useSWR from "swr"
import type { InvoicesApiResponse, PatientsApiResponse } from "@/lib/types"
import type { BillRecord } from "@/lib/billing/types"

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => res.json())

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
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data: invoicesData, isLoading: invoicesLoading, mutate: mutateInvoices } = useSWR<InvoicesApiResponse>(
    "/api/invoices?limit=50&fresh=1",
    fetcher,
    {
      refreshInterval: 10_000,
      revalidateOnFocus: true,
    }
  )

  const { data: patientsData, isLoading: patientsLoading, mutate: mutatePatients } = useSWR<PatientsApiResponse>(
    "/api/patients?limit=50",
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
    }
  )

  const { data: billsData, mutate: mutateBills } = useSWR<{ data: BillRecord[] }>(
    "/api/bills",
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    let channel: BroadcastChannel | null = null

    try {
      channel = new BroadcastChannel("billing-dashboard")
    } catch {
      return
    }

    const onMessage = async (event: MessageEvent) => {
      const data = event.data as { type?: string; bill_id?: string } | undefined
      if (!data || data.type !== "bill_created") return

      const ts = Date.now()
      try {
        await Promise.all([
          mutateInvoices(fetcher(`/api/invoices?limit=50&fresh=1&_=${ts}`), { revalidate: false }),
          mutateBills(fetcher(`/api/bills?_=${ts}`), { revalidate: false }),
        ])
      } catch {
        // ignore; SWR will retry/poll anyway
      }
    }

    channel.addEventListener("message", onMessage)
    return () => {
      channel?.removeEventListener("message", onMessage)
      channel?.close()
    }
  }, [mutateBills, mutateInvoices])

  const invoices = invoicesData?.data?.invoices || []
  const patients = patientsData?.data?.patients || []
  const bills = billsData?.data || []

  // Calculate stats from real data
  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  // Get all pending invoices first
  const allPendingInvoices = invoices.filter((inv) => inv.status === "pending")
  const pendingAmount = allPendingInvoices.reduce((sum, inv) => sum + inv.total_amount, 0)

  // For display purposes, show all pending invoices
  const pendingInvoices = allPendingInvoices

  // Active patients count should match pending invoices count (as requested)
  const activePatients = pendingInvoices.length

  // "Payments Today" should reflect bills/receipts generated in this app (not PMS invoice status).
  const paidToday = bills.filter((bill) => {
    const billDate = new Date(bill.created_at).toDateString()
    const today = new Date().toDateString()
    return !bill.is_voided && bill.payment_status === "Paid" && billDate === today
  })
  const paidTodayAmount = paidToday.reduce((sum, bill) => sum + bill.patient_balance, 0)

  const totalPatients = patientsData?.pagination?.total || patients.length

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    const ts = Date.now()
    try {
      await Promise.all([
        mutateInvoices(fetcher(`/api/invoices?limit=50&fresh=1&_=${ts}`), { revalidate: false }),
        mutatePatients(fetcher(`/api/patients?limit=50&fresh=1&_=${ts}`), { revalidate: false }),
        mutateBills(fetcher(`/api/bills?_=${ts}`), { revalidate: false }),
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = invoicesLoading || patientsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Overview</h2>
          <p className="text-sm text-muted-foreground">Real-time billing statistics from patient management system</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
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
