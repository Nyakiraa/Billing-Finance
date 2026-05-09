import type { Patient, LineItem, Bill } from "./types"

export const mockPatients: Patient[] = [
  {
    patient_id: "PAT-2024-00142",
    full_name: "Juan dela Cruz",
    date_of_birth: "1985-03-15",
    gender: "Male",
    contact_number: "09123456789",
    status: "Active",
    ward_room: "Room 302-A",
    insurance_provider: "PhilHealth",
    insurance_coverage_percentage: 50,
    insurance_policy_number: "PH-001234",
    attending_physician: "Dr. Roberto Mendoza",
  },
  {
    patient_id: "PAT-2024-00143",
    full_name: "Maria Santos",
    date_of_birth: "1990-07-22",
    gender: "Female",
    contact_number: "09234567890",
    status: "Active",
    ward_room: "Room 105-B",
    insurance_provider: "Maxicare",
    insurance_coverage_percentage: 60,
    insurance_policy_number: "MC-005678",
    attending_physician: "Dr. Cristina Lim",
  },
  {
    patient_id: "PAT-2024-00144",
    full_name: "Jose Rizal Jr.",
    date_of_birth: "1978-12-30",
    gender: "Male",
    contact_number: "09345678901",
    status: "Active",
    ward_room: "ICU-02",
    insurance_provider: "PhilHealth",
    insurance_coverage_percentage: 50,
    insurance_policy_number: "PH-002345",
    attending_physician: "Dr. Antonio Cruz",
  },
  {
    patient_id: "PAT-2024-00145",
    full_name: "Ana Reyes",
    date_of_birth: "1995-05-10",
    gender: "Female",
    contact_number: "09456789012",
    status: "Active",
    ward_room: "Room 201-C",
    insurance_provider: "Intellicare",
    insurance_coverage_percentage: 55,
    insurance_policy_number: "IC-009012",
    attending_physician: "Dr. Maribel Santos",
  },
  {
    patient_id: "PAT-2024-00146",
    full_name: "Pedro Pascual",
    date_of_birth: "1982-09-08",
    gender: "Male",
    contact_number: "09567890123",
    status: "Active",
    ward_room: "Room 408-A",
    insurance_provider: "Medicard",
    insurance_coverage_percentage: 70,
    insurance_policy_number: "MC-012345",
    attending_physician: "Dr. Roberto Mendoza",
  },
  {
    patient_id: "PAT-2024-00147",
    full_name: "Rosa Garcia",
    date_of_birth: "1970-01-25",
    gender: "Female",
    contact_number: "09678901234",
    status: "Active",
    ward_room: "Room 110-B",
    insurance_provider: "PhilHealth",
    insurance_coverage_percentage: 50,
    insurance_policy_number: "PH-003456",
    attending_physician: "Dr. Cristina Lim",
  },
  {
    patient_id: "PAT-2024-00148",
    full_name: "Miguel Bautista",
    date_of_birth: "1988-11-14",
    gender: "Male",
    contact_number: "09789012345",
    status: "Active",
    ward_room: "Room 305-A",
    insurance_provider: "Cocolife",
    insurance_coverage_percentage: 65,
    insurance_policy_number: "CC-015678",
    attending_physician: "Dr. Antonio Cruz",
  },
  {
    patient_id: "PAT-2024-00149",
    full_name: "Teresa Villanueva",
    date_of_birth: "1965-04-02",
    gender: "Female",
    contact_number: "09890123456",
    status: "Active",
    ward_room: "Room 202-C",
    insurance_provider: "PhilHealth",
    insurance_coverage_percentage: 50,
    insurance_policy_number: "PH-004567",
    attending_physician: "Dr. Maribel Santos",
  },
]

export const mockPhysicians = [
  { id: "DOC-0045", name: "Dr. Roberto Mendoza" },
  { id: "DOC-0046", name: "Dr. Cristina Lim" },
  { id: "DOC-0047", name: "Dr. Antonio Cruz" },
  { id: "DOC-0048", name: "Dr. Maribel Santos" },
]

export const mockServicesFromAdmin: LineItem[] = [
  { id: "SVC-001", category: "service", item_name: "General Consultation", quantity: 1, unit_price: 800, total: 800 },
  { id: "SVC-002", category: "service", item_name: "Blood Test (CBC)", quantity: 1, unit_price: 450, total: 450 },
  { id: "SVC-003", category: "service", item_name: "X-Ray (Chest)", quantity: 1, unit_price: 1200, total: 1200 },
  { id: "SVC-004", category: "service", item_name: "ECG", quantity: 1, unit_price: 650, total: 650 },
  { id: "SVC-005", category: "service", item_name: "Room & Board (Private)", quantity: 3, unit_price: 3500, total: 10500 },
]

export const mockMedicationsFromInventory: LineItem[] = [
  { id: "MED-001", category: "medication", item_name: "Paracetamol 500mg", quantity: 20, unit_price: 5, total: 100 },
  { id: "MED-002", category: "medication", item_name: "Amoxicillin 500mg", quantity: 14, unit_price: 15, total: 210 },
  { id: "MED-003", category: "medication", item_name: "Omeprazole 20mg", quantity: 10, unit_price: 25, total: 250 },
  { id: "MED-004", category: "medication", item_name: "IV Fluids (Normal Saline)", quantity: 5, unit_price: 180, total: 900 },
]

export const mockDoctorFeesFromStaffMgmt: LineItem[] = [
  { id: "FEE-001", category: "fee", item_name: "Professional Fee - Attending Physician", quantity: 1, unit_price: 2500, total: 2500 },
  { id: "FEE-002", category: "fee", item_name: "Professional Fee - Specialist Consult", quantity: 1, unit_price: 1500, total: 1500 },
  { id: "FEE-003", category: "fee", item_name: "Nursing Care Fee", quantity: 3, unit_price: 500, total: 1500 },
]

export const mockBills: Bill[] = [
  {
    bill_id: "BILL-2024-00389",
    patient_id: "PAT-2024-00142",
    patient_name: "Juan dela Cruz",
    visit_date: "2024-03-22",
    services_rendered: ["Consultation", "Blood Test", "X-Ray"],
    total_amount: 4500.0,
    insurance_provider: "PhilHealth",
    insurance_coverage: 2000.0,
    patient_balance: 2500.0,
    payment_method: "Cash",
    payment_status: "Paid",
    billing_date: "2024-03-22",
    due_date: "2024-04-05",
    is_insurance_claimed: true,
    attending_doctor_id: "DOC-0045",
  },
  {
    bill_id: "BILL-2024-00390",
    patient_id: "PAT-2024-00143",
    patient_name: "Maria Santos",
    visit_date: "2024-03-20",
    services_rendered: ["Surgery", "Room & Board", "Medications"],
    total_amount: 85000.0,
    insurance_provider: "Maxicare",
    insurance_coverage: 50000.0,
    patient_balance: 35000.0,
    payment_method: "HMO",
    payment_status: "Pending",
    billing_date: "2024-03-23",
    due_date: "2024-04-06",
    is_insurance_claimed: false,
    attending_doctor_id: "DOC-0046",
  },
  {
    bill_id: "BILL-2024-00391",
    patient_id: "PAT-2024-00144",
    patient_name: "Jose Rizal Jr.",
    visit_date: "2024-03-18",
    services_rendered: ["ICU Care", "Dialysis", "Medications"],
    total_amount: 125000.0,
    insurance_provider: "PhilHealth",
    insurance_coverage: 45000.0,
    patient_balance: 80000.0,
    payment_method: "Split Payment",
    payment_status: "Unpaid",
    billing_date: "2024-03-21",
    due_date: "2024-04-04",
    is_insurance_claimed: true,
    attending_doctor_id: "DOC-0047",
  },
]

export function generateInvoiceId(): string {
  const year = new Date().getFullYear()
  const num = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0")
  return `INV-${year}-${num}`
}

export function generateReceiptId(): string {
  const year = new Date().getFullYear()
  const num = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0")
  return `REC-${year}-${num}`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
