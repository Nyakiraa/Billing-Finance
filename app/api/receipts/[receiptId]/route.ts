import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"
import { getReceiptById } from "@/lib/receipts-store"

export const runtime = "nodejs"

export async function GET(request: NextRequest, context: RouteContext<"/api/receipts/[receiptId]">) {
  const authResult = validateApiKey(request, { routeName: "/api/receipts/[receiptId]", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    const { receiptId } = await context.params

    if (!receiptId) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "MISSING_REQUIRED_FIELDS",
          message: "Receipt ID is required",
        },
        { status: 400, headers },
      )
    }

    const receipt = await getReceiptById(receiptId)

    if (!receipt) {
      return NextResponse.json(
        {
          status: "error",
          error_code: "NOT_FOUND",
          message: `Receipt with id ${receiptId} not found`,
          details: { receiptId },
        },
        { status: 404, headers },
      )
    }

    return NextResponse.json(
      {
        status: "success",
        data: {
          receipt,
        },
      },
      { status: 200, headers },
    )
  } catch (error) {
    console.error("Error fetching receipt:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch receipt",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500, headers },
    )
  }
}

