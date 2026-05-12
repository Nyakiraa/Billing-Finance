import { NextRequest, NextResponse } from "next/server"
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth"

const AUDIT_BASE_URL = "https://admin-subystem.onrender.com/admin/api/audit/ingest"
const AUDIT_API_KEY = process.env.AUDIT_API_KEY

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function buildSafeUserId(rawUserId: string): string {
  const cleaned = rawUserId.trim()
  if (isUuid(cleaned)) {
    return cleaned
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "00000000-0000-0000-0000-000000000000"
}

export async function POST(request: NextRequest) {
  const authResult = validateApiKey(request, { routeName: "/api/audit", requireApiKey: false })
  if (!authResult.isValid) {
    return unauthorizedResponse()
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {}

  try {
    if (!AUDIT_API_KEY) {
      console.error("AUDIT_API_KEY is not configured")
      return NextResponse.json(
        { error: "Audit API key not configured" },
        { status: 500, headers }
      )
    }

    const body = (await request.json()) as Record<string, unknown>

    const rawUserId = body.user_id != null ? String(body.user_id) : ""
    const user_id = rawUserId ? buildSafeUserId(rawUserId) : ""
    const action_type = body.action_type != null ? String(body.action_type).trim() : ""
    const details = body.details != null ? String(body.details).trim() : ""
    const subsystem = body.subsystem != null ? String(body.subsystem).trim() : ""
    const ip_addr =
      body.ip_addr != null && String(body.ip_addr).trim() !== ""
        ? String(body.ip_addr).trim()
        : "0.0.0.0"

    if (!user_id || !action_type || !details || !subsystem) {
      return NextResponse.json(
        {
          error: "Missing required fields: user_id, action_type, details, subsystem",
          hint: "All four must be non-empty strings after trim.",
        },
        { status: 400, headers }
      )
    }

    const auditPayload = {
      user_id,
      action_type,
      details,
      ip_addr,
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
        { status: response.status, headers }
      )
    }

    const result = await response.json()
    return NextResponse.json({ success: true, data: result }, { headers })
  } catch (error) {
    console.error("Error sending audit log:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers }
    )
  }
}
