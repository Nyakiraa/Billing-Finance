import { NextResponse } from "next/server"

const AUDIT_BASE_URL = "https://admin-subystem.onrender.com/admin/api/audit/ingest"
const AUDIT_API_KEY = process.env.AUDIT_API_KEY

export async function POST(request: Request) {
  try {
    if (!AUDIT_API_KEY) {
      console.error("AUDIT_API_KEY is not configured")
      return NextResponse.json(
        { error: "Audit API key not configured" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { user_id, action_type, details, ip_addr, subsystem } = body

    if (!user_id || !action_type || !details || !subsystem) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, action_type, details, subsystem" },
        { status: 400 }
      )
    }

    const auditPayload = {
      user_id,
      action_type,
      details,
      ip_addr: ip_addr || "0.0.0.0",
      subsystem,
    }

    const response = await fetch(AUDIT_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-subsystem-key": AUDIT_API_KEY,
      },
      body: JSON.stringify(auditPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Audit API error:", errorText)
      return NextResponse.json(
        { error: "Failed to send audit log", details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("Error sending audit log:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
