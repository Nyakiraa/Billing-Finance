"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Eye, RefreshCw, Search, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReceiptRecord } from "@/lib/receipts-store"

const BILLING_API_KEY = process.env.NEXT_PUBLIC_BILLING_API_KEY

const fetcher = (url: string) =>
  fetch(url, {
    cache: "no-store",
    headers: BILLING_API_KEY ? { "x-api-key": BILLING_API_KEY } : undefined,
  }).then((res) => res.json())

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount)
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ReceiptsView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)

  const { data: receiptsData, error, isLoading, mutate } = useSWR<{ data: { receipts: ReceiptRecord[] } }>(
    "/api/receipts?limit=200",
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 30_000 }
  )

  const { data: selectedReceiptData, isLoading: selectedReceiptLoading } = useSWR<{ data: { receipt: ReceiptRecord } }>(
    selectedReceiptId ? `/api/receipts/${encodeURIComponent(selectedReceiptId)}` : null,
    fetcher
  )

  const receipts = receiptsData?.data?.receipts || []

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
        await mutate(fetcher(`/api/receipts?limit=200&_=${ts}`), { revalidate: false })
      } catch {
        // ignore; SWR will retry/poll anyway
      }
    }

    channel.addEventListener("message", onMessage)
    return () => {
      channel?.removeEventListener("message", onMessage)
      channel?.close()
    }
  }, [mutate])

  const filteredReceipts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return receipts
    return receipts.filter((receipt) => {
      return (
        receipt.bill_id.toLowerCase().includes(q) ||
        receipt.invoice_id.toLowerCase().includes(q) ||
        receipt.patient_name.toLowerCase().includes(q) ||
        receipt.patient_id.toLowerCase().includes(q)
      )
    })
  }, [receipts, searchTerm])

  const totalReceipts = receipts.length
  const totalCollected = receipts.reduce((sum, r) => sum + r.amount_paid, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Receipts</p>
            <p className="text-2xl font-bold mt-1">{totalReceipts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Paid Patients</p>
            <p className="text-2xl font-bold mt-1">{totalReceipts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Collected (Paid)</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(totalCollected)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Receipts</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by bill ID or patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => mutate()} aria-label="Refresh receipts">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading && receipts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Failed to load receipts. Please try again.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No receipts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReceipts
                      .slice()
                      .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
                      .map((receipt, index) => (
                        <TableRow key={`${receipt.bill_id}-${receipt.invoice_id}-${receipt.issued_at}-${index}`}>
                          <TableCell className="font-mono text-sm">{receipt.bill_id}</TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium">{receipt.patient_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{receipt.patient_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(receipt.issued_at).toISOString().slice(0, 10)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(receipt.amount_paid)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(receipt.balance_remaining)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{receipt.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedReceiptId(receipt.bill_id)}
                              aria-label="View receipt"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={selectedReceiptId !== null} onOpenChange={(open) => (!open ? setSelectedReceiptId(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {selectedReceiptId ? `Bill ID: ${selectedReceiptId}` : "Receipt details"}
            </DialogDescription>
          </DialogHeader>

          {!selectedReceiptId ? null : selectedReceiptLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedReceiptData?.data?.receipt ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedReceiptData.data.receipt.patient_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedReceiptData.data.receipt.patient_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Invoice ID</p>
                  <p className="font-medium font-mono">{selectedReceiptData.data.receipt.invoice_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Issued At</p>
                  <p className="font-medium">{formatDateTime(selectedReceiptData.data.receipt.issued_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Updated</p>
                  <p className="font-medium">{formatDateTime(selectedReceiptData.data.receipt.updated_at)}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold">{formatCurrency(selectedReceiptData.data.receipt.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance Remaining</span>
                  <span className="font-medium">{formatCurrency(selectedReceiptData.data.receipt.balance_remaining)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payment</span>
                  <span className="font-medium">{selectedReceiptData.data.receipt.status} · {selectedReceiptData.data.receipt.payment_method}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Invoice Items</p>
                <div className="flex flex-wrap gap-2">
                  {selectedReceiptData.data.receipt.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No item details available.</p>
                  ) : (
                    selectedReceiptData.data.receipt.items.map((item, index) => (
                      <Badge key={`${item.medicineId || item.serviceName || "item"}-${index}`} variant="outline">
                        {item.medicineName || item.serviceName || "Item"}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load bill details.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

