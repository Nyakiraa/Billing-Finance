import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { deleteInvoice, getInvoice } from "@/lib/invoices-store"

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

async function patchPmsInvoiceStatus(invoiceId: string, status: string) {
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
    body: JSON.stringify({ status }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`PMS invoice patch failed: ${response.status} ${errorText}`)
  }

  return response.json()
}

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: RouteContext<"/api/invoices/[invoiceId]">) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices/[invoiceId]", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const { invoiceId } = await context.params

    if (!invoiceId) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "Invoice ID is required",
        },
        { status: 400, headers }
      )
    }

    const invoice = await getInvoice(invoiceId)

    if (!invoice) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "NOT_FOUND",
          message: `Invoice with id ${invoiceId} not found`,
          details: { invoiceId },
        },
        { status: 404, headers }
      )
    }

    return NextResponse.json(
      {
        status: "success",
        data: {
          invoice,
        },
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch invoice",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500, headers }
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext<"/api/invoices/[invoiceId]">) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices/[invoiceId]", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const { invoiceId } = await context.params

    if (!invoiceId) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "Invoice ID is required",
        },
        { status: 400, headers }
      )
    }

    const body = await request.json()
    const { status, invoice: invoicePayload, updated_by } = body

    if (!status) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "status is required",
          details: { missingFields: ["status"] },
        },
        { status: 400, headers }
      )
    }

    // Check if invoice exists locally; if not, allow a full invoice payload to be patched, or fall back to PMS.
    let invoice = undefined
    let invoiceTableMissing = false

    try {
      invoice = await getInvoice(invoiceId)
    } catch (error) {
      if (isMissingInvoicesTableError(error)) {
        invoiceTableMissing = true
      } else {
        throw error
      }
    }

    if (!invoice && invoicePayload && invoicePayload.invoice_id === invoiceId) {
      const now = new Date().toISOString()
      invoice = {
        ...invoicePayload,
        invoice_id: invoiceId,
        status,
        created_at: invoicePayload.created_at || now,
        updated_at: now,
        updated_by: updated_by || "system",
      }
    }

    // Always use PMS API for invoice status updates
    const patched = await patchPmsInvoiceStatus(invoiceId, status.toLowerCase())
    return NextResponse.json(
      {
        status: "success",
        message: "PMS invoice status patched successfully",
        data: patched,
      },
      { status: 200, headers }
    )

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
      { status: 500, headers }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<"/api/invoices/[invoiceId]">) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices/[invoiceId]" })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const { invoiceId } = await context.params

    if (!invoiceId) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "Invoice ID is required",
        },
        { status: 400, headers }
      )
    }

    const deleted = await deleteInvoice(invoiceId)
    if (!deleted) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "NOT_FOUND",
          message: `Invoice with id ${invoiceId} not found`,
          details: { invoiceId },
        },
        { status: 404, headers }
      )
    }

    return NextResponse.json(
      {
        status: "success",
        message: `Invoice ${invoiceId} deleted successfully`,
        data: { invoiceId },
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to delete invoice",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500, headers }
    )
  }
}
