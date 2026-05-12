/** Normalize inventory subsystem JSON into { medicineName, availableStock } for the charge UI. */

function coerceNumber(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val
  if (typeof val === "string") {
    const n = parseFloat(val.replace(/,/g, "").trim())
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function extractArrayFromPayload(payload: unknown): unknown[] {
  if (payload == null) return []
  if (Array.isArray(payload)) return payload
  if (typeof payload !== "object") return []
  const o = payload as Record<string, unknown>
  const nested = o.data
  const tryArray = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null)

  const direct = [
    tryArray(o.data),
    tryArray(o.inventory),
    tryArray(o.stock),
    tryArray(o.items),
    tryArray(o.results),
    tryArray(o.medicines),
  ].find(Boolean)
  if (direct) return direct

  if (nested && typeof nested === "object") {
    const d = nested as Record<string, unknown>
    const fromData = [
      tryArray(d.inventory),
      tryArray(d.stock),
      tryArray(d.items),
      tryArray(d.results),
      tryArray(d.medicines),
      tryArray(d.records),
      tryArray(d.data),
    ].find(Boolean)
    if (fromData) return fromData
  }

  return []
}

function pickMedicineName(item: Record<string, unknown>): string {
  const keys = [
    "medicine_name",
    "medicineName",
    "name",
    "product_name",
    "drug_name",
    "item_name",
    "title",
    "medicine",
  ]
  for (const k of keys) {
    const v = item[k]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return ""
}

function pickAvailableStock(item: Record<string, unknown>): number | undefined {
  const qtyKeys = [
    "available_stock",
    "availableStock",
    "stock",
    "quantity",
    "qty",
    "on_hand",
    "onHand",
    "current_stock",
    "currentStock",
    "total_quantity",
    "totalQuantity",
    "remaining",
    "units_available",
    "available_quantity",
    "availableQuantity",
    "inventory_quantity",
    "inStock",
    "in_stock",
  ]
  for (const k of qtyKeys) {
    const n = coerceNumber(item[k])
    if (n !== undefined) return n
  }
  return undefined
}

export type InventoryStockRow = { medicineName: string; availableStock: number }

export function parseInventoryApiPayload(payload: unknown): InventoryStockRow[] {
  const raw = extractArrayFromPayload(payload)
  const out: InventoryStockRow[] = []

  for (const row of raw) {
    if (!row || typeof row !== "object") continue
    const rec = row as Record<string, unknown>
    const medicineName = pickMedicineName(rec)
    const availableStock = pickAvailableStock(rec)
    if (medicineName && availableStock !== undefined) {
      out.push({ medicineName, availableStock })
    }
  }

  return out
}
