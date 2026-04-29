import { NextRequest, NextResponse } from "next/server";
import { createBill, formatServiceError, listBills } from "@/lib/billing/service";
import { CreateBillInput } from "@/lib/billing/types";

export async function GET() {
  return NextResponse.json({ data: listBills() }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CreateBillInput;
    const bill = await createBill(payload, {
      actor_id: request.headers.get("x-actor-id") ?? "system",
      actor_role: request.headers.get("x-actor-role") ?? "billing_staff",
    });
    return NextResponse.json({ data: bill }, { status: 201 });
  } catch (error) {
    const { status, body } = formatServiceError(error);
    return NextResponse.json(body, { status });
  }
}
