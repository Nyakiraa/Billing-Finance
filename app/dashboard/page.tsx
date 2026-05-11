"use client"

import { useState } from "react"
import { Sidebar } from "@/components/billing/sidebar"
import { Header } from "@/components/billing/header"
import { BillingWizard } from "@/components/billing/billing-wizard"
import { DashboardView } from "@/components/billing/views/dashboard"
import { InvoicesView } from "@/components/billing/views/invoices"
import { InsuranceView } from "@/components/billing/views/insurance"
import { ProtectedRoute } from "@/components/protected-route"

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "new-bill": "New Bill",
  invoices: "Invoices",
  insurance: "Insurance Claims",
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState("dashboard")

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView />
      case "new-bill":
        return <BillingWizard />
      case "invoices":
        return <InvoicesView />
      case "insurance":
        return <InsuranceView />
      default:
        return <DashboardView />
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex flex-1 min-h-0">
          <Sidebar activeItem={activeView} onItemClick={setActiveView} />
          <div className="flex-1 flex flex-col min-h-0">
            <Header title={viewTitles[activeView] || "Dashboard"} />
            <main className="flex-1 p-6 overflow-auto min-h-0">
              {renderView()}
            </main>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}