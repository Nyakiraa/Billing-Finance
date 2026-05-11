import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth";
import { formatServiceError, listBillAuditTrail } from "@/lib/billing/service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = validateApiKey(request, { routeName: "/api/bills/[billId]/audit", requireApiKey: false });
  if (!authResult.isValid) {
    return unauthorizedResponse();
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {};

  try {
    const { billId } = await context.params;
    const audits = await listBillAuditTrail(billId);
    return NextResponse.json({ data: audits }, { status: 200, headers });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status, headers });
  }
}
