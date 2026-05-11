import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { deleteInvoice, getInvoice } from "@/lib/invoices-store"

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
