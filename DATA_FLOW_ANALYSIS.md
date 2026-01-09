# Data Flow Analysis - Agus Finance App

## 📊 Overall Application Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE FIRESTORE                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Wallets    │  │   Budgets    │  │   Transactions   │   │
│  │  (amount)    │  │  (amount)    │  │  (all monthly)   │.  │
│  └──────────────┘  └──────────────┘  └──────────────────┘.  │
└────────────┬────────────────────────────────────────┬───── ─┘
             │                                        │
             │  onSnapshot (real-time updates)        │
             │                                        │
             ▼                                        ▼
┌──────────────────────────────────────────────────────────────┐
│                      APP.JSX (Main Component)                │
│                                                              │
│  State:                                                      │
│  - wallets[]                                                 │
│  - budgets[]                                                 │
│  - transactions[]                                            │
│  - user (logged-in user)                                     │
│  - activeTab (current page)                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬────────────────┐
        │                  │                  │                │
        ▼                  ▼                  ▼                ▼
    ┌────────┐        ┌────────┐        ┌────────┐        ┌────────┐
    │ HOME   │        │ACTIVITY│        │ MANAGE │        │SETTINGS│
    │ Page   │        │ Page   │        │ Page   │        │ Page   │
    └────────┘        └────────┘        └────────┘        └────────┘
```

---

## 🔄 Data Operations

### 1. **INCOME Transaction** (Pemasukan)
```
User Input (Home Page)
  ↓
  ├─ Amount Input
  ├─ Description (optional)
  ├─ Select Target Wallet
  └─ Date (must be current month)
     │
     └─ Validation: isCurrentMonth(transactionDate)
        │
        ├─ PASS → Continue to save
        └─ FAIL → ❌ Error: "Transaksi hanya bisa dibuat di bulan berjalan saja"
           │
           └─ Update: wallets[selectedWallet].amount += nominal
           └─ Create: transaction record with type='income'
           └─ Firebase: addDoc(transactions collection)
```

### 2. **EXPENSE Transaction** (Pengeluaran)
```
User Input (Home Page)
  ↓
  ├─ Amount Input
  ├─ Description (optional)
  ├─ Select Target Budget
  └─ Date (must be current month)
     │
     └─ Validation: 
        ├─ isCurrentMonth(transactionDate) ❌ → Error
        └─ Budget Amount >= nominal ❌ → Error: "Budget tidak cukup, top up dulu via transfer"
           │
           ├─ PASS → Continue
           │
           └─ Update: budgets[selectedBudget].amount -= nominal
           └─ Create: transaction record with type='expense'
           └─ Firebase: addDoc(transactions collection)
```

### 3. **TRANSFER** (Antar Dompet)
```
User Input (Manage Page)
  ↓
  ├─ Select From Wallet/Budget
  ├─ Select To Wallet/Budget
  ├─ Amount
     │
     └─ Validations:
        ├─ Source has enough amount ❌ → Error
        │
        ├─ PASS → Simultaneous updates:
        │  ├─ Deduct from source
        │  ├─ Add to destination
        │  └─ Create transaction record with type='transfer'
        │
        └─ Firebase: updateDoc(source) + updateDoc(destination) + addDoc(transaction)
```

---

## 📅 Month Management - Critical Logic

### ⚠️ What happens on the 1st of a new month?

**Current Implementation:**
- **NO automatic reset happens** at midnight on month 1st
- **NO recurring budgets** or auto-refresh
- Data persists across months

**Key Point: The `isCurrentMonth()` validation**
```javascript
export const isCurrentMonth = (dateString) => {
  const selectedDate = new Date(dateString);
  const today = new Date();
  return selectedDate.getFullYear() === today.getFullYear() && 
         selectedDate.getMonth() === today.getMonth();
};
```

**Behavior on Jan 1:**
| Date | isCurrentMonth() | Can Create Transaction? |
|------|-----------------|----------------------|
| Dec 31, 2024 | ❌ | ❌ NO |
| Jan 1, 2025 | ✅ | ✅ YES |
| Feb 1, 2025 | ❌ (while in Jan) | ❌ NO |

**When Jan 1st arrives:**
1. ✅ Users CAN now create transactions dated Jan 1, 2025
2. ✅ Users CAN view previous months in Activity page (filter dropdown shows all months)
3. ❌ Users CANNOT create transactions for Dec 2024 anymore
4. 💾 All Dec 2024 data stays in Firestore (not deleted/archived)
5. 💰 Budgets from December do NOT reset or roll over to January
6. 💰 Wallets from December do NOT reset (balances remain)

### Summary Card Behavior
```
Summary component always shows: CURRENT MONTH stats only
  ├─ Total Income (Pemasukan)
  ├─ Total Expense (Pengeluaran)
  ├─ Net (Sisa)
  └─ Budget Breakdown (current month allocation)

When month changes:
  └─ Automatically recalculates using new month's transactions
  └─ Old month's summary stays visible in Activity page only
```

---

## 💾 Data Storage Structure

### Firebase Collections

**wallets**
```javascript
{
  id: "abc123",
  name: "BNI",
  amount: "10.000.000",  // Rupiah string
  description: "Rekening Utama",
  user: "Purwo",
  createdAt: 1234567890
}
```

**budgets**
```javascript
{
  id: "budget1",
  name: "Makan",
  limit: "5.000.000",     // Monthly limit
  amount: "3.500.000",    // Remaining amount
  description: "Alokasi Makan",
  user: "Purwo",
  createdAt: 1234567890
}
```

**transactions**
```javascript
{
  id: "tx1",
  title: "Lunch",
  amount: "50.000",
  type: "expense",        // "expense" | "income" | "transfer"
  user: "Purwo",
  time: "12:30",
  date: "2025-01-15",     // YYYY-MM-DD format (CRITICAL)
  target: "Makan",        // Wallet/Budget name
  targetId: "budget1",
  targetType: "budget",   // "wallet" | "budget"
  createdAt: 1234567890
}
```

---

## 🔑 Key Validation Rules

| Rule | Where | Effect |
|------|-------|--------|
| `isCurrentMonth()` | useTransactions.js | Can only create transactions for current month |
| `Budget >= Amount` | handleDailyTransaction | Expense rejected if budget insufficient |
| `wallet/budget exists` | handleDailyTransaction | Cannot transact to non-existent target |
| `Month filter` | Activity page | Users can VIEW all past months, but CAN'T CREATE for them |

---

## 📊 Activity Page Features

**Available Actions by Month:**
- ✅ **Current Month**: View + Edit + Delete transactions
- ✅ **Past Months**: View ONLY (read-only unless isReadOnly = false)
- ✅ **Month Selector**: Dropdown with all months that have transactions
- ✅ **Filters**: 
  - By transaction type (All / Income / Expense / Transfer)
  - By search (title / target / user)
  - By month

---

## 🔐 User & Permission Logic

**Multiple Users Support:**
- Each user has their own set of wallets/budgets/transactions
- Cross-tab detection: If one user changes PIN, all other users logout
- Data is filtered by `user` field in Firestore

**Demo Mode:**
- Toggle in Settings
- Uses demo data if enabled

---

## ⚡ Real-time Updates

**Firebase onSnapshot listeners** (in App.jsx):
```javascript
- Wallets: Real-time listen to wallets collection
- Budgets: Real-time listen to budgets collection  
- Transactions: Real-time listen to transactions collection

Whenever data changes in Firebase:
└─ Component state updates automatically
└─ UI re-renders with new data
```

---

## 🎯 Summary: What Happens on Jan 1st?

**Timeline:**
```
Dec 31, 2024 at 11:59 PM
  └─ isCurrentMonth(Dec 31) = ✅ TRUE
  └─ Can create Dec transactions ✅

Jan 1, 2025 at 12:00 AM
  └─ isCurrentMonth(Jan 1) = ✅ TRUE (month changed!)
  └─ isCurrentMonth(Dec 31) = ❌ FALSE (old month)
  └─ Can create Jan transactions ✅
  └─ Can NO LONGER create Dec transactions ❌
  └─ Summary resets to show only Jan data
  └─ **AUTO BUDGET RESET TRIGGERED** ✨
     ├─ For each budget:
     │  └─ limit = amount (sisa bulan lalu)
     │  └─ amount = tetap sama
     └─ Stored in localStorage: lastBudgetResetMonth = "2025-01"
  └─ Budget balances from Dec carry over as-is
  └─ Wallet balances from Dec carry over as-is
  └─ Activity page shows Dec data in dropdown, read-only
```

---

## ✨ NEW: Monthly Budget Auto-Reset Feature

### How It Works

**Triggered**: Automatically when app loads for first time in new month

**What happens**:
```javascript
// For each budget:
limit = amount (remaining from last month)
amount = stays same (user can top up if needed)
```

**Example:**
```
December:
├─ Budget "Makan"
│  ├─ limit: Rp 5.000.000
│  └─ amount: Rp 500.000 (sisa)

January 1st (AUTO TRIGGERED):
├─ Budget "Makan" 
│  ├─ limit: Rp 500.000 ← Automatically set!
│  └─ amount: Rp 500.000
│
└─ Toast: "💫 Budget bulan ini sudah disiapkan!"
```

### Implementation Details

**Files Modified:**
1. `src/utils/formatter.js`
   - `getCurrentMonthKey()` - Get current month as "YYYY-MM"
   - `hasMonthlyResetOccurred()` - Check if already reset this month
   - `markMonthlyResetDone()` - Flag that reset happened

2. `src/App.jsx`
   - New `useEffect` hook that triggers monthly reset
   - Uses localStorage flag to prevent multiple resets
   - Called whenever `budgets` data changes

3. `src/hooks/useTransactions.js`
   - Added `handleBudgetMonthlyReset` function (for potential manual trigger)

### Workflow After Reset

```
Jan 1, Budget "Makan" now has:
├─ limit: Rp 500.000
├─ amount: Rp 500.000
└─ User can use this Rp 500.000

If user needs more allocation:
└─ Use "Alokasi / Pindah Dana" button
   ├─ Transfer from Wallet → Budget
   ├─ Budget amount increases
   ├─ Budget limit also increases (auto-track)
   └─ Ready for new month spending
```

### LocalStorage Flag

```javascript
localStorage.getItem('lastBudgetResetMonth')
// Returns: "2025-01" or null

// Reset happens only if:
// lastBudgetResetMonth !== getCurrentMonthKey()
```

**This ensures:**
- ✅ Reset happens exactly once per month
- ✅ No duplicate resets if page refreshes
- ✅ User can manually clear cache to re-trigger

---

## 🔴 Missing Features (Not Implemented)

- ❌ Auto-budget refresh on month boundary (NOW IMPLEMENTED ✨)
- ❌ Budget carryover/rollover logic
- ❌ Monthly recurring transactions
- ❌ Budget alerts before reaching month 1st
- ❌ Month-end reports/summaries
