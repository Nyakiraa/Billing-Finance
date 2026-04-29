import { NextRequest, NextResponse } from "next/server";
import { formatServiceError, listBillAuditTrail } from "@/lib/billing/service";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { billId } = await context.params;
    const audits = listBillAuditTrail(billId);
    return NextResponse.json({ data: audits }, { status: 200 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}
