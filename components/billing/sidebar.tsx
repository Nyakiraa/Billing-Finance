"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FilePlus,
  Receipt,
  FileText,
  ShieldCheck,
} from "lucide-react"

interface SidebarProps {
  activeItem: string
  onItemClick: (item: string) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new-bill", label: "New Bill", icon: FilePlus },
  { id: "receipts", label: "Receipts", icon: Receipt },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "insurance", label: "Insurance Claims", icon: ShieldCheck },
]

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col sticky top-0 self-start h-screen overflow-y-auto">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold text-lg">H</span>
          </div>
          <div>
            <h1 className="font-semibold text-sm">Smart Healthcare</h1>
            <p className="text-xs text-sidebar-foreground/70">Management System</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onItemClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    activeItem === item.id
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/50 text-center">
          Billing & Finance Module v1.0
        </p>
      </div>
    </aside>
  )
}
