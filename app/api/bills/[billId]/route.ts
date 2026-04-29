import { NextRequest, NextResponse } from "next/server";
import {
  formatServiceError,
  getBillOrThrow,
  updateBill,
  voidBill,
} from "@/lib/billing/service";
import { UpdateBillInput } from "@/lib/billing/types";

interface RouteContext {
  params: Promise<{ billId: string }>;
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { billId } = await context.params;
    const bill = getBillOrThrow(billId);
    return NextResponse.json({ data: bill }, { status: 200 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { billId } = await context.params;
    const payload = (await request.json()) as UpdateBillInput;
    const bill = await updateBill(billId, payload, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill }, { status: 200 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { billId } = await context.params;
    const bill = voidBill(billId, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill, message: `Bill ${billId} voided successfully.` }, { status: 200 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}

