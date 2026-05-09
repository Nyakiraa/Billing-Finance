import { NextRequest, NextResponse } from "next/server";
import { createBill, formatServiceError, listBills } from "@/lib/billing/service";
import { CreateBillInput } from "@/lib/billing/types";

const PMS_BASE_URL = process.env.PMS_BASE_URL;
const PMS_API_KEY = process.env.PMS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const patientId = searchParams.get("patient_id");

    // Get local bills first (includes newly created bills)
    const localBills = listBills();

    // Try to fetch from PMS backend
    if (PMS_BASE_URL && PMS_API_KEY) {
      try {
        const url = new URL(`${PMS_BASE_URL}/bills`);
        url.searchParams.set("page", page);
        url.searchParams.set("limit", limit);
        if (patientId) {
          url.searchParams.set("patient_id", patientId);
        }

        const response = await fetch(url.toString(), {
          headers: {
            "x-api-key": PMS_API_KEY,
            "Content-Type": "application/json",
          },
          next: { revalidate: 30 }, // Cache for 30 seconds for real-time updates
        });

        if (response.ok) {
          const data = await response.json();
          // Merge PMS bills with local bills (local bills take precedence)
          const pmsBills = data.data || [];
          const localBillIds = new Set(localBills.map((b) => b.bill_id));
          const mergedBills = [
            ...localBills,
            ...pmsBills.filter((b: any) => !localBillIds.has(b.bill_id)),
          ];
          return NextResponse.json({ data: mergedBills });
        }
      } catch (externalError) {
        console.warn("[v0] Failed to fetch from PMS backend, using local data:", externalError);
      }
    }

    // Return local bills as fallback
    return NextResponse.json({ data: localBills }, { status: 200 });
  } catch (error) {
    console.error("[v0] Error in bills API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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
