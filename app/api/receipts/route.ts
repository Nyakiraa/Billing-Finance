import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { listReceiptsFromPaidInvoices } from "@/lib/receipts-store"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/receipts", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")
  const patientId = searchParams.get("patient_id")

  try {
    let receipts = await listReceiptsFromPaidInvoices()

    if (patientId) {
      receipts = receipts.filter((receipt) => receipt.patient_id === patientId)
    }

    const total = receipts.length
    const pages = Math.ceil(total / limit)
    const start = (page - 1) * limit
    const paginated = receipts.slice(start, start + limit)

    return NextResponse.json(
      {
        status: "success",
        results: paginated.length,
        data: {
          receipts: paginated,
        },
        pagination: {
          limit,
          page,
          pages,
          total,
        },
      },
      { headers },
    )
  } catch (error) {
    console.error("Error fetching receipts:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch receipts",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500, headers },
    )
  }
}

