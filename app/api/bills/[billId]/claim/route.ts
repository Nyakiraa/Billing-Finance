import { NextRequest, NextResponse } from "next/server";
import { formatServiceError, markInsuranceClaimed } from "@/lib/billing/service";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { billId } = await context.params;
    const bill = markInsuranceClaimed(billId, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill }, { status: 200 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}
