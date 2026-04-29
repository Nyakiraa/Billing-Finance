export type PaymentMethod = "Cash" | "Card" | "Bank Transfer" | "E-Wallet" | "Insurance";

export type PaymentStatus = "Pending" | "Partially Paid" | "Paid" | "Overdue";

export interface BillRecord {
  bill_id: string;
  patient_id: string;
  patient_name: string;
  visit_date: string;
  services_rendered: string[];
  total_amount: number;
  insurance_provider: string;
  insurance_coverage: number;
  patient_balance: number;
  payment_method: PaymentMethod | string;
  payment_status: PaymentStatus | string;
  billing_date: string;
  due_date: string;
  is_insurance_claimed: boolean;
  attending_doctor_id: string;
  is_voided: boolean;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateBillInput = Omit<
  BillRecord,
  "patient_balance" | "is_voided" | "voided_at" | "created_at" | "updated_at"
> & {
  patient_balance?: number;
};

export type UpdateBillInput = Partial<CreateBillInput>;

export interface RequestContext {
  actor_id: string;
  actor_role: string;
}

export interface AuditEntry {
  audit_id: string;
  bill_id: string;
  action: "CREATED" | "UPDATED" | "VOIDED" | "CLAIM_UPDATED";
  actor_id: string;
  actor_role: string;
  timestamp: string;
  changes: Record<string, unknown>;
}

export interface ServiceErrorPayload {
  status: "error";
  error_code:
    | "MISSING_REQUIRED_FIELDS"
    | "INVALID_INPUT"
    | "DUPLICATE_BILL"
    | "INSURANCE_ERROR"
    | "DEPENDENCY_TIMEOUT"
    | "SYSTEM_FAILURE"
    | "NOT_FOUND"
    | "FORBIDDEN";
  message: string;
  details: Record<string, unknown>;
}
