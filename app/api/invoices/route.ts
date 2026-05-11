import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { listInvoices, upsertInvoice } from "@/lib/invoices-store"

export const runtime = "nodejs"

// Invoice creation/storage endpoint
export async function POST(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices" })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const body = await request.json()

    // Validate required fields following PMS invoice structure
    const requiredFields = [
      "invoice_id",
      "patient_id",
      "patient_name",
      "items",
      "total_amount",
    ]
    const missingFields = requiredFields.filter((field) => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: `Missing required fields: ${missingFields.join(", ")}`,
          details: { missingFields },
        },
        { status: 400 }
      )
    }

    // Normalize the invoice data to PMS invoice structure
    const invoice = {
      _id: body._id || body.invoice_id,
      invoice_id: body.invoice_id,
      patient_id: body.patient_id,
      patient_name: body.patient_name,
      health_record_id: body.health_record_id || body.invoice_id,
      diagnosis: body.diagnosis || "",
      items: body.items || [], // Array of { medicineId, medicineName, prescribedDosage, prescribedQuantity, unitPrice, totalPrice }
      prescription_names: body.prescription_names || [],
      is_released: body.is_released !== undefined ? body.is_released : false,
      total_amount: body.total_amount,
      invoice_date: body.invoice_date || new Date().toISOString(),
      status: body.status || "pending", // "pending" | "paid" | "cancelled" | "refunded"
      created_by: body.created_by || "system",
      created_at: body.created_at || new Date().toISOString(),
      updated_at: body.updated_at || new Date().toISOString(),
      updated_by: body.updated_by,
    }

    // Store the invoice
    await upsertInvoice(invoice)

    return NextResponse.json(
      {
        status: "success",
        message: "Invoice created successfully",
        data: {
          invoice,
        },
      },
      { status: 201, headers }
    )
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to create invoice",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500 }
    )
  }
}

// Retrieve invoices
export async function GET(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const patientId = searchParams.get("patient_id")

  try {
    // Filter invoices based on query parameters
    let filteredInvoices = await listInvoices()

    if (patientId) {
      filteredInvoices = filteredInvoices.filter(
        (inv) => inv.patient_id === patientId
      )
    }

    // Pagination
    const total = filteredInvoices.length
    const pages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const invoices = filteredInvoices.slice(start, start + limit)

    return NextResponse.json({
      status: "success",
      results: invoices.length,
      data: {
        invoices,
      },
      pagination: {
        limit,
        page,
        pages,
        total,
      },
    }, { headers })
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch invoices",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500 }
    )
  }
}

// Update invoice status
export async function PATCH(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/invoices" })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const body = await request.json()
    const { invoice_id, status } = body

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

    // Check if invoice exists
    const invoice = (await listInvoices()).find((inv) => inv.invoice_id === invoice_id)
    if (!invoice) {
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
