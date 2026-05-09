# Bill Generation Flow Implementation

## Overview
After completing the "New Bill" workflow steps and generating a receipt, the bill is automatically saved to the database and displayed in the "Recently Generated Bills" section on the dashboard.

## Flow Diagram

```
User completes wizard steps
        ↓
GenerateReceipt component created
        ↓
saveBill() called (creates BillRecord in database)
        ↓
sendAuditLog() called (logs to audit system)
        ↓
onBillCreated() callback triggered
        ↓
Dashboard navigated automatically
        ↓
Bills data auto-refreshes (SWR)
        ↓
Recent bills section displays new receipt
```

## Changes Made

### 1. GenerateReceipt Component (`components/billing/steps/generate-receipt.tsx`)
- **Added**: `onBillCreated` prop to notify parent when bill is saved
- **Added**: `saveBill()` function that:
  - Maps receipt data to BillRecord format
  - Sends POST request to `/api/bills` endpoint
  - Includes proper bill metadata (patient info, services, dates)
  - Calls `onBillCreated()` callback on success
- **Changed**: Receipt generation now saves data immediately in useEffect

### 2. BillingWizard Component (`components/billing/billing-wizard.tsx`)
- **Added**: `BillingWizardProps` interface with `onBillCreated` callback
- **Modified**: Constructor to accept `onBillCreated` prop
- **Updated**: GenerateReceipt component receives `onBillCreated` callback

### 3. Page Layout (`app/page.tsx`)
- **Added**: `refreshTrigger` state to force dashboard re-render
- **Added**: `handleBillCreated()` function that:
  - Increments refresh trigger (forces Dashboard key change)
  - Navigates to dashboard view
- **Modified**: DashboardView given unique key based on refreshTrigger
- **Modified**: BillingWizard receives handleBillCreated callback

### 4. Bills API (`app/api/bills/route.ts`)
- **Updated**: GET request now:
  - Fetches from real PMS backend first
  - Falls back to local mock data if API unavailable
  - Uses 30-second cache for real-time updates
- **Existing**: POST handler already supports bill creation

## Data Flow

### Receipt to Bill Mapping
```javascript
Receipt → Bill Record
{
  receipt_id       → bill_id
  patient_name     → patient_name
  invoice_id       → (stored for reference)
  date_time        → billing_date
  amount_paid      → total_amount
  payment_method   → payment_method
  status           → payment_status
  balance_remaining → patient_balance
  
  // Derived from invoice
  invoice.date_issued  → visit_date
  invoice.line_items   → services_rendered
  invoice.due_date     → due_date
  invoice.insurance_coverage → insurance_coverage
}
```

## Auto-Refresh Mechanism

The dashboard uses SWR with `revalidateInterval: 30000`:
- Bills data refreshes every 30 seconds
- When a new bill is saved, it appears within 30 seconds
- Key change on DashboardView forces immediate SWR refetch

## User Experience

1. User completes the 6-step billing wizard
2. Receipt is displayed with payment confirmation
3. System automatically saves the bill to database
4. Page navigates to Dashboard
5. "Recently Generated Bills" section displays the new receipt
6. User can click the receipt to view full details in modal

## Error Handling

- If bill save fails, error is logged to console
- Audit log failure doesn't block bill creation
- Dashboard still navigates and displays existing bills
- User sees audit logs in admin system if connected
