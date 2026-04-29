import {
  appendAuditLog,
  findBillByPatientAndVisit,
  getAllBills,
  getAuditLogsByBillId,
  getBillById,
  saveBill,
} from "./repository";
import { BillRecord, CreateBillInput, RequestContext, ServiceErrorPayload, UpdateBillInput } from "./types";

const SUBSYSTEM_TIMEOUT_MS = 10_000;
const MAX_RETRY_ATTEMPTS = 3;

class BillingServiceError extends Error {
  status: number;
  errorPayload: ServiceErrorPayload;

  constructor(status: number, payload: ServiceErrorPayload) {
    super(payload.message);
    this.status = status;
    this.errorPayload = payload;
  }
}

function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateRequiredString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "MISSING_REQUIRED_FIELDS",
      message: "Required billing information is missing.",
      details: {
        missing_fields: [fieldName],
      },
    });
  }
}

function validateAmount(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: {
        [fieldName]: "Must be a positive number.",
      },
    });
  }
}

function computePatientBalance(total: number, coverage: number): number {
  return Number((total - coverage).toFixed(2));
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeAuditId(): string {
  return `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function addAuditEntry(
  billId: string,
  action: "CREATED" | "UPDATED" | "VOIDED" | "CLAIM_UPDATED",
  context: RequestContext,
  changes: Record<string, unknown>,
): void {
  appendAuditLog({
    audit_id: makeAuditId(),
    bill_id: billId,
    action,
    actor_id: context.actor_id,
    actor_role: context.actor_role,
    timestamp: nowIso(),
    changes,
  });
}

function normalizeNewBill(input: CreateBillInput): BillRecord {
  validateRequiredString(input.bill_id, "bill_id");
  validateRequiredString(input.patient_id, "patient_id");
  validateRequiredString(input.patient_name, "patient_name");
  validateRequiredString(input.insurance_provider, "insurance_provider");
  validateRequiredString(input.payment_method, "payment_method");
  validateRequiredString(input.payment_status, "payment_status");
  validateRequiredString(input.attending_doctor_id, "attending_doctor_id");
  validateAmount(input.total_amount, "total_amount");
  validateAmount(input.insurance_coverage, "insurance_coverage");

  if (!isValidDate(input.visit_date)) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: { visit_date: "Must follow YYYY-MM-DD format." },
    });
  }
  if (!isValidDate(input.billing_date)) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "MISSING_REQUIRED_FIELDS",
      message: "Required billing information is missing.",
      details: { missing_fields: ["billing_date"] },
    });
  }
  if (!isValidDate(input.due_date)) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: { due_date: "Must follow YYYY-MM-DD format." },
    });
  }
  if (new Date(input.due_date).getTime() < new Date(input.billing_date).getTime()) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: { due_date: "Cannot be earlier than billing_date." },
    });
  }
  if (!Array.isArray(input.services_rendered) || input.services_rendered.length === 0) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "MISSING_REQUIRED_FIELDS",
      message: "Required billing information is missing.",
      details: { missing_fields: ["services_rendered"] },
    });
  }
  for (const service of input.services_rendered) {
    validateRequiredString(service, "services_rendered[]");
  }
  if (typeof input.is_insurance_claimed !== "boolean") {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: { is_insurance_claimed: "Must be boolean." },
    });
  }
  if (input.is_insurance_claimed && input.insurance_provider.trim().length === 0) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INSURANCE_ERROR",
      message: "Insurance claim could not be processed.",
      details: {
        reason: "Insurance provider not verified or claim rejected.",
        insurance_provider: "Missing or invalid",
      },
    });
  }
  if (input.insurance_coverage > input.total_amount) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INVALID_INPUT",
      message: "Invalid billing values detected.",
      details: {
        insurance_coverage: "Cannot exceed total_amount and must be numeric.",
      },
    });
  }

  const computedBalance = computePatientBalance(input.total_amount, input.insurance_coverage);
  if (typeof input.patient_balance === "number") {
    validateAmount(input.patient_balance, "patient_balance");
    if (Number(input.patient_balance.toFixed(2)) !== computedBalance) {
      throw new BillingServiceError(400, {
        status: "error",
        error_code: "INVALID_INPUT",
        message: "Invalid billing values detected.",
        details: {
          patient_balance: "Must match total_amount - insurance_coverage.",
        },
      });
    }
  }

  return {
    ...input,
    patient_balance: computedBalance,
    is_voided: false,
    voided_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

export function listBills(): BillRecord[] {
  return getAllBills();
}

export function getBillOrThrow(billId: string): BillRecord {
  const bill = getBillById(billId);
  if (!bill) {
    throw new BillingServiceError(404, {
      status: "error",
      error_code: "NOT_FOUND",
      message: `Bill ${billId} was not found.`,
      details: { bill_id: billId },
    });
  }
  return bill;
}

async function withSubsystemResilience<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const result = await Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new BillingServiceError(504, {
                  status: "error",
                  error_code: "DEPENDENCY_TIMEOUT",
                  message: "Unable to retrieve required data from external subsystem.",
                  details: {
                    affected_services: ["Patient Records", "Pharmacy"],
                    timeout: "Request exceeded allowed response time",
                  },
                }),
              ),
            SUBSYSTEM_TIMEOUT_MS,
          ),
        ),
      ]);
      return result;
    } catch (error) {
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw error;
      }
    }
  }
  throw new BillingServiceError(500, {
    status: "error",
    error_code: "SYSTEM_FAILURE",
    message: "An internal system error occurred during processing.",
    details: {
      operation: "Dependency retrieval",
      action: "Retry limit reached",
    },
  });
}

async function validateDependencies(): Promise<void> {
  await withSubsystemResilience(async () => {
    return Promise.resolve();
  });
}

export async function createBill(payload: CreateBillInput, context: RequestContext): Promise<BillRecord> {
  await validateDependencies();
  if (getBillById(payload.bill_id)) {
    throw new BillingServiceError(409, {
      status: "error",
      error_code: "DUPLICATE_BILL",
      message: "A billing record already exists for this patient and visit date.",
      details: {
        patient_id: payload.patient_id,
        visit_date: payload.visit_date,
      },
    });
  }
  if (findBillByPatientAndVisit(payload.patient_id, payload.visit_date)) {
    throw new BillingServiceError(409, {
      status: "error",
      error_code: "DUPLICATE_BILL",
      message: "A billing record already exists for this patient and visit date.",
      details: {
        patient_id: payload.patient_id,
        visit_date: payload.visit_date,
      },
    });
  }
  const normalized = normalizeNewBill(payload);
  const saved = saveBill(normalized);
  addAuditEntry(saved.bill_id, "CREATED", context, { created: true });
  return saved;
}

export async function updateBill(
  billId: string,
  payload: UpdateBillInput,
  context: RequestContext,
): Promise<BillRecord> {
  await validateDependencies();
  const current = getBillOrThrow(billId);

  if (payload.payment_status !== undefined && context.actor_role !== "billing_staff") {
    throw new BillingServiceError(403, {
      status: "error",
      error_code: "FORBIDDEN",
      message: "Only billing staff can modify payment_status.",
      details: {
        actor_role: context.actor_role,
        restricted_field: "payment_status",
      },
    });
  }

  const merged: CreateBillInput = {
    ...current,
    ...payload,
    bill_id: current.bill_id,
  };

  const normalized = normalizeNewBill(merged);
  const saved = saveBill({
    ...normalized,
    created_at: current.created_at,
    updated_at: nowIso(),
    is_voided: current.is_voided,
    voided_at: current.voided_at,
  });
  addAuditEntry(billId, "UPDATED", context, payload as Record<string, unknown>);
  return saved;
}

export function voidBill(billId: string, context: RequestContext): BillRecord {
  const current = getBillOrThrow(billId);
  const updated: BillRecord = {
    ...current,
    is_voided: true,
    voided_at: nowIso(),
    updated_at: nowIso(),
  };
  const saved = saveBill(updated);
  addAuditEntry(billId, "VOIDED", context, { is_voided: true });
  return saved;
}

export function markInsuranceClaimed(billId: string, context: RequestContext): BillRecord {
  const bill = getBillOrThrow(billId);
  if (bill.insurance_provider.trim().length === 0) {
    throw new BillingServiceError(400, {
      status: "error",
      error_code: "INSURANCE_ERROR",
      message: "Insurance claim could not be processed.",
      details: {
        reason: "Insurance provider not verified or claim rejected.",
        insurance_provider: "Missing or invalid",
      },
    });
  }
  if (bill.is_insurance_claimed) {
    return bill;
  }

  const updated: BillRecord = {
    ...bill,
    is_insurance_claimed: true,
    updated_at: nowIso(),
  };

  const saved = saveBill(updated);
  addAuditEntry(billId, "CLAIM_UPDATED", context, { is_insurance_claimed: true });
  return saved;
}

export function listBillAuditTrail(billId: string) {
  getBillOrThrow(billId);
  return getAuditLogsByBillId(billId);
}

export function formatServiceError(error: unknown): { status: number; body: ServiceErrorPayload } {
  if (error instanceof BillingServiceError) {
    return { status: error.status, body: error.errorPayload };
  }
  return {
    status: 500,
    body: {
      status: "error",
      error_code: "SYSTEM_FAILURE",
      message: "An internal system error occurred during processing.",
      details: {
        operation: "Database write / Payment processing",
        action: "Transaction rolled back",
      },
    },
  };
}
