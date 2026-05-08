# Bill Generation & Auto-Display Integration

## Overview
Newly generated bills now automatically appear in the "Recently Generated Bills" section on the Dashboard and reflect immediately in "Payments Today" metrics.

## How It Works

### 1. Bill Creation Flow
When a user completes the New Bill wizard:
- Receipt data is captured in the `GenerateReceipt` component
- Receipt is mapped to a `BillRecord` structure matching the billing service schema
- Bill is saved via `POST /api/bills` endpoint
- `createBill()` service function stores bill in local repository (in-memory Map)

### 2. Dashboard Auto-Refresh
- Dashboard uses SWR with `revalidateInterval: 30000` (30 seconds) for auto-refresh
- `mutateBills()` function is exposed globally to trigger immediate refresh
- When a bill is saved, `GenerateReceipt` calls `__mutateBills()` to immediately refresh
- Dashboard components re-render with new bill data

### 3. Bill Retrieval
`GET /api/bills` endpoint:
- Fetches local bills first (includes newly created bills)
- Attempts to merge with PMS backend bills (if available)
- Returns merged list with local bills taking precedence
- Falls back to local-only bills if PMS endpoint is unavailable

### 4. Display Components
- **RecentBillsSection**: Shows 5 most recent bills sorted by `billing_date`
- **BillDetailsModal**: Displays full bill details when clicked
- **Dashboard Stats**: "Payments Today" calculated from today's Paid bills

### 5. Data Flow on Bill Creation

```
GenerateReceipt Component
  ↓
saveBill() - Sends POST /api/bills
  ↓
createBill() Service - Validates and stores in repository
  ↓
Returns bill data (201 Created)
  ↓
__mutateBills() called to refresh SWR
  ↓
onBillCreated() callback navigates to Dashboard
  ↓
Dashboard re-renders with new bills
  ↓
RecentBillsSection displays new bill in top position
  ↓
Payments Today stat updates if bill is today's date with Paid status
```

## Files Modified

### Core Changes
- **app/api/bills/route.ts**: Updated GET to merge local + PMS bills
- **components/billing/steps/generate-receipt.tsx**: Added saveBill() function
- **components/billing/views/dashboard.tsx**: Added mutateBills exposure, updated Payments Today calculation
- **components/billing/billing-wizard.tsx**: Added onBillCreated callback prop
- **app/page.tsx**: Added handleBillCreated navigation logic

### New Components
- **components/billing/views/recent-bills.tsx**: Displays recent bills list
- **components/billing/views/bill-details-modal.tsx**: Shows bill details modal

## Testing the Feature

1. Navigate to "New Bill" tab
2. Complete all wizard steps (patient, invoice, payment)
3. Click "Confirm & Generate Receipt"
4. Bill is automatically saved
5. Dashboard opens automatically showing the new bill in "Recently Generated Bills"
6. If bill date is today and status is "Paid", "Payments Today" reflects the amount

## Key Implementation Details

- Bills are stored in-memory using Map in `lib/billing/repository.ts`
- Each bill requires: bill_id, patient_id, visit_date, total_amount, payment_status, etc.
- Receipt ID format: `REC-YYYY-XXXXX` (converted to bill format on save)
- Payment status values: "Paid", "Pending", "Unpaid"
- Sorting: Newest bills first (by billing_date descending)
- Auto-refresh interval: 30 seconds (can be adjusted in dashboard.tsx)
