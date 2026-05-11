import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth";
import { formatServiceError, markInsuranceClaimed } from "@/lib/billing/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = validateApiKey(request, { routeName: "/api/bills/[billId]/claim", requireApiKey: false });
  if (!authResult.isValid) {
    return unauthorizedResponse();
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {};

  try {
    const { billId } = await context.params;
    const bill = await markInsuranceClaimed(billId, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill }, { status: 200, headers });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status, headers });
  }
}
