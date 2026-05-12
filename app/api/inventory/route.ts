import { NextRequest, NextResponse } from "next/server"

const INVENTORY_API_BASE_URL =
  process.env.INVENTORY_API_BASE_URL?.trim() ||
  "https://inventory-system.example.com/api/v1/external/stock"

const INVENTORY_API_KEY = process.env.INVENTORY_API_KEY?.trim()

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const medicineNames = searchParams.getAll("medicine_name")
  const medicineNamesCsv = searchParams.get("medicine_names")
  const query = medicineNames.length > 0 ? medicineNames.join(",") : medicineNamesCsv || ""

  if (!query) {
    return NextResponse.json(
      {
        status: "error",
        error_code: "MISSING_REQUIRED_FIELDS",
        message: "medicine_name or medicine_names query parameter is required",
      },
      { status: 400 }
    )
  }

  if (!INVENTORY_API_KEY) {
    return NextResponse.json(
      {
        status: "error",
        error_code: "CONFIGURATION_ERROR",
        message: "Missing INVENTORY_API_KEY configuration",
      },
      { status: 500 }
    )
  }

  try {
    const url = new URL(INVENTORY_API_BASE_URL)
    url.searchParams.set("medicine_names", query)

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": INVENTORY_API_KEY,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null)
      return NextResponse.json(
        {
          status: "error",
          error_code: "INVENTORY_FETCH_FAILED",
          message: "Failed to fetch inventory data",
          details: errorPayload,
        },
        { status: response.status }
      )
    }

    const payload = await response.json()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching inventory data:", error)
    return NextResponse.json(
      {
        status: "error",
        error_code: "SYSTEM_FAILURE",
        message: "Failed to fetch inventory data",
        details: { error: error instanceof Error ? error.message : "Unknown error" },
      },
      { status: 500 }
    )
  }
}
