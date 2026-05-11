import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, unauthorizedResponse, getDeprecationWarningHeader } from "@/lib/auth";
import {
  formatServiceError,
  getBillOrThrow,
  updateBill,
  voidBill,
} from "@/lib/billing/service";
import { UpdateBillInput } from "@/lib/billing/types";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = validateApiKey(request, { routeName: "/api/bills/[billId]", requireApiKey: false });
  if (!authResult.isValid) {
    return unauthorizedResponse();
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {};

  try {
    const { billId } = await context.params;
    const bill = await getBillOrThrow(billId);
    return NextResponse.json({ data: bill }, { status: 200, headers });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status, headers });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = validateApiKey(request, { routeName: "/api/bills/[billId]", requireApiKey: false });
  if (!authResult.isValid) {
    return unauthorizedResponse();
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {};

  try {
    const { billId } = await context.params;
    const payload = (await request.json()) as UpdateBillInput;
    const bill = await updateBill(billId, payload, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill }, { status: 200, headers });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status, headers });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = validateApiKey(request, { routeName: "/api/bills/[billId]", requireApiKey: false });
  if (!authResult.isValid) {
    return unauthorizedResponse();
  }

  const headers = authResult.requiresWarning ? getDeprecationWarningHeader() : {};

  try {
    const { billId } = await context.params;
    const bill = await voidBill(billId, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill, message: `Bill ${billId} voided successfully.` }, { status: 200, headers });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status, headers });
  }
}

