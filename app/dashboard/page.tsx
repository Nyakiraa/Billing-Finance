"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/billing/sidebar"
import { Header } from "@/components/billing/header"
import { BillingWizard } from "@/components/billing/billing-wizard"
import { DashboardView } from "@/components/billing/views/dashboard"
import { InvoicesView } from "@/components/billing/views/invoices"
import { PaymentsView } from "@/components/billing/views/payments"
import { InsuranceView } from "@/components/billing/views/insurance"

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "new-bill": "New Bill",
  invoices: "Invoices",
  payments: "Payments",
  insurance: "Insurance Claims",
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("dashboard")
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    if (!isAuthenticated) {
      router.push("/")
    }
  }, [router])

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView />
      case "new-bill":
        return <BillingWizard />
      case "invoices":
        return <InvoicesView />
      case "payments":
        return <PaymentsView />
      case "insurance":
        return <InsuranceView />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeView} onItemClick={setActiveView} />
      <div className="flex-1 flex flex-col">
        <Header title={`Billing & Finance - ${viewTitles[activeView]}`} />
        <main className="flex-1 p-6 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  )
}