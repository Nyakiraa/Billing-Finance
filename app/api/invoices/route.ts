import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { getInvoice, upsertInvoice } from "@/lib/invoices-store"

const PMS_INVOICES_API_BASE_URL =
  process.env.PMS_INVOICES_API_BASE_URL?.trim() ||
  "https://pms-backend-kohl.vercel.app/api/v1/external/invoices"

const PMS_INVOICES_API_KEY = process.env.PMS_INVOICES_API_KEY?.trim()

function isMissingInvoicesTableError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("Could not find the table")
  )
}

async function patchPmsInvoiceStatus(invoiceId: string, status: string, payload?: unknown) {
  if (!PMS_INVOICES_API_KEY) {
    throw new Error("Missing PMS_INVOICES_API_KEY configuration")
  }

  const url = `${PMS_INVOICES_API_BASE_URL}/${invoiceId}`

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": PMS_INVOICES_API_KEY,
    },
    body: JSON.stringify({ status, ...(payload && typeof payload === "object" ? payload : {}) }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`PMS invoice patch failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

export const runtime = "nodejs"

// POST is not supported when invoices should come from PMS only.
export async function POST(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices" })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}
  return NextResponse.json(
    {
      status: "error",
      error_code: "METHOD_NOT_ALLOWED",
      message: "POST is not supported for /api/invoices",
    },
    { status: 405, headers }
  )
}

// Retrieve invoices from PMS
export async function GET(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  const searchParams = request.nextUrl.searchParams
  const page = searchParams.get("page") || "1"
  const limit = searchParams.get("limit") || "10"
  const patientId = searchParams.get("patient_id")
  const fresh = searchParams.get("fresh") === "1"

  if (!PMS_INVOICES_API_KEY) {
    return NextResponse.json(
      {
        status: "error",
        error_code: "CONFIGURATION_ERROR",
        message: "Missing PMS_INVOICES_API_KEY configuration",
      },
      { status: 500, headers }
    )
  }

  try {
    const url = new URL(PMS_INVOICES_API_BASE_URL)
    url.searchParams.set("page", page)
    url.searchParams.set("limit", limit)
    if (patientId) {
      url.searchParams.set("patient_id", patientId)
    }

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": PMS_INVOICES_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: fresh ? 0 : 60 },
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      return NextResponse.json(
        {
          status: "error",
          error_code: "PMS_FETCH_FAILED",
          message: "Failed to fetch invoices from PMS",
          details: errorPayload,
        },
        { status: response.status, headers }
      )
    }

    const payload = await response.json()
    return NextResponse.json(payload, { headers })
  } catch (error) {
    console.error("Error fetching invoices from PMS:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch invoices",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500, headers }
    )
  }
}

// Update invoice status
export async function PATCH(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const body = await request.json()
    const { invoice_id, status, invoice: invoicePayload } = body

    if (!invoice_id || !status) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "invoice_id and status are required",
          details: { missingFields: !invoice_id ? ["invoice_id"] : ["status"] },
        },
        { status: 400 }
      )
    }

    // Check if invoice exists locally; if not, allow a full invoice payload to be patched, or fall back to PMS.
    let invoice = undefined
    let invoiceTableMissing = false

    try {
      invoice = await getInvoice(invoice_id)
    } catch (error) {
      if (isMissingInvoicesTableError(error)) {
        invoiceTableMissing = true
      } else {
        throw error
      }
    }

    if (!invoice && invoicePayload && invoicePayload.invoice_id === invoice_id) {
      const now = new Date().toISOString()
      invoice = {
        ...invoicePayload,
        invoice_id,
        status,
        created_at: invoicePayload.created_at || now,
        updated_at: now,
        updated_by: body.updated_by || "system",
      }
    }

    if (!invoice) {
      if (invoiceTableMissing) {
        const patched = await patchPmsInvoiceStatus(invoice_id, status, invoicePayload)
        return NextResponse.json(
          {
            status: "success",
            message: "PMS invoice status patched successfully",
            data: patched,
          },
          { status: 200, headers }
        )
      }

      return NextResponse.json(
        {
          status: "error",
          error_code: "NOT_FOUND",
          message: `Invoice with id ${invoice_id} not found`,
          details: { invoice_id },
        },
        { status: 404 }
      )
    }

    // Update the invoice
    invoice.status = status
    invoice.updated_at = new Date().toISOString()
    invoice.updated_by = body.updated_by || "system"
    await upsertInvoice(invoice)

    return NextResponse.json({
      status: "success",
      message: "Invoice updated successfully",
      data: {
        invoice,
      },
    }, { headers })
  } catch (error) {
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to update invoice",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500 }
    )
  }
}
