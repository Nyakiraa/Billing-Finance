import { AuditEntry, BillRecord } from "./types";

const bills = new Map<string, BillRecord>();
const auditTrail: AuditEntry[] = [];

const seededBill: BillRecord = {
  bill_id: "BILL-2024-00389",
  patient_id: "PAT-2024-00142",
  patient_name: "Juan dela Cruz",
  visit_date: "2024-03-22",
  services_rendered: ["Consultation", "Blood Test", "X-Ray"],
  total_amount: 4500,
  insurance_provider: "PhilHealth",
  insurance_coverage: 2000,
  patient_balance: 2500,
  payment_method: "Cash",
  payment_status: "Paid",
  billing_date: "2024-03-22",
  due_date: "2024-04-05",
  is_insurance_claimed: true,
  attending_doctor_id: "DOC-0045",
  is_voided: false,
  voided_at: null,
  created_at: "2024-03-22T00:00:00.000Z",
  updated_at: "2024-03-22T00:00:00.000Z",
};

bills.set(seededBill.bill_id, seededBill);

export function getAllBills(): BillRecord[] {
  return [...bills.values()];
}

export function getBillById(billId: string): BillRecord | undefined {
  return bills.get(billId);
}

export function saveBill(bill: BillRecord): BillRecord {
  bills.set(bill.bill_id, bill);
  return bill;
}

export function findBillByPatientAndVisit(patientId: string, visitDate: string): BillRecord | undefined {
  return [...bills.values()].find(
    (bill) => bill.patient_id === patientId && bill.visit_date === visitDate && !bill.is_voided,
  );
}

export function appendAuditLog(entry: AuditEntry): void {
  auditTrail.push(entry);
}

export function getAuditLogsByBillId(billId: string): AuditEntry[] {
  return auditTrail.filter((entry) => entry.bill_id === billId);
}
