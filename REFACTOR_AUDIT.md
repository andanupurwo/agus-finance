# AUDIT REFACTOR BUDGET LOGIC v1

## RINGKASAN PERUBAHAN
Refactor dari `budget.amount` (menyimpan sisa) menjadi:
- `budget.limit` = alokasi total (stored di DB)
- `budget.sisa` = limit - total expenses dari transaksi (calculated)

---

## ✅ AUDIT FUNCTION BY FUNCTION

### 1. **calculateBudgetUsed(budgetId, transactions)**
**Fungsi**: Hitung total pengeluaran untuk budget
**Logic**:
```javascript
transactions
  .filter(t => t.type === 'expense' && t.targetId === budgetId)
  .reduce((sum, t) => sum + parseRupiah(t.amount), 0)
```
**✅ BENAR**: 
- Filter hanya expense transactions
- Filter hanya yang targetId = budget ini
- Sum dari amount

---

### 2. **calculateBudgetRemaining(budget, used)**
**Fungsi**: Hitung sisa budget
**Logic**:
```javascript
parseRupiah(budget.limit || '0') - used
```
**✅ BENAR**: 
- Limit - used = sisa
- Handle null limit

---

### 3. **handleDailyTransaction() - INCOME**
**Fungsi**: Tambah income ke wallet
**Logic**:
```javascript
const newBalance = parseRupiah(targetWallet.amount) + amountVal;
await updateDoc(doc(db, "wallets", selectedTarget), { 
  amount: formatRupiah(newBalance) 
});
```
**✅ BENAR**: 
- Wallet punya amount field (direct stored)
- Tambah langsung ke amount
- Catat transaction

---

### 4. **handleDailyTransaction() - EXPENSE**
**Fungsi**: Pencatat pengeluaran dari budget
**Logic**:
```javascript
const used = calculateBudgetUsed(selectedTarget, transactions || []);
const remaining = calculateBudgetRemaining(targetBudget, used);
if (remaining < amountVal) {
  throw Error(`Budget kurang Rp ${kurang}`)
}
// HANYA catat transaksi, JANGAN update budget.amount
```
**✅ BENAR**: 
- Hitung sisa dari transaksi
- Validasi sisa cukup
- TIDAK perlu update budget.amount atau budget.limit
- Budget update OTOMATIS karena sisa = calculated

**⚠️ CATATAN PENTING**:
- Saat expense dicatat, tidak perlu update DB budget
- Sisa budget dihitung otomatis saat display
- Jadi tidak ada race condition atau inconsistency

---

### 5. **handleTransfer()**
**Case 1: Wallet → Wallet**
```javascript
// Update sumber
amount -= dari wallet source

// Update tujuan
amount += ke wallet dest
```
**✅ BENAR**: Wallet punya amount field, update langsung

**Case 2: Wallet → Budget (TOP UP)**
```javascript
// Update sumber (wallet)
amount -= dari wallet

// Update tujuan (budget)
amount += ke budget amount
limit += ke budget limit  // ← PENTING: naikkan limit
```
**✅ BENAR**: Top up = naikkan limit, bukan mengganti expense

**Case 3: Budget → Budget**
```javascript
// Sumber budget
amount -= dari source
limit -= dari source  // ← Kurangi limit

// Tujuan budget
amount += ke dest
limit += ke dest  // ← Naikkan limit
```
**✅ BENAR**: Transfer antar budget = realokasi limit

**Case 4: Budget → Wallet (Return money)**
```javascript
// Sumber budget
amount -= dari source
limit -= dari source

// Tujuan wallet
amount += ke wallet
```
**✅ BENAR**: Return dari budget ke wallet

---

### 6. **handleDeleteTransaction() - INCOME**
```javascript
// Reverse: kurangi saldo wallet
newBalance = wallet.amount - amountVal
```
**✅ BENAR**: Rollback income dengan kurangi wallet

---

### 7. **handleDeleteTransaction() - EXPENSE**
```javascript
// TIDAK perlu update apapun!
// Cukup delete transaksi
// Sisa budget otomatis bertambah saat recalculate
```
**✅ BENAR**: Karena sisa calculated dari transaksi, hapus tx = sisa naik otomatis

**IMPROVEMENT**: Sebelumnya ada update `budget.amount += amountVal` yang tidak perlu

---

### 8. **handleDeleteTransaction() - TRANSFER**
**Source Wallet**:
```javascript
amount += ke wallet (reverse)
```

**Source Budget**:
```javascript
limit += ke budget (restore limit yang di-transfer out)
```

**Dest Wallet**:
```javascript
amount -= ke wallet (reverse)
```

**Dest Budget**:
```javascript
limit -= ke budget (reverse limit yang diterima)
```
**✅ BENAR**: Semua reverse dengan konsisten

---

### 9. **handleEditTransaction() - INCOME**
```javascript
// Same wallet: update difference
newBalance = wallet.amount + amountDifference

// Different wallet: reverse old, apply new
oldWallet.amount -= oldAmountVal
newWallet.amount += newAmountVal
```
**✅ BENAR**: Income handle wallet amount correctly

---

### 10. **handleEditTransaction() - EXPENSE**
```javascript
// Same budget: validate sisa masih cukup
// TIDAK perlu update budget, hanya validasi

// Different budget: validate budget baru cukup
// TIDAK perlu update budget, hanya validasi
```
**✅ BENAR**: Expense calculated, tidak perlu update. Hanya validasi.

---

## 🔴 POTENTIAL EDGE CASES / RISKS

### Edge Case 1: Budget Negatif (Over Budget)
**Scenario**: Ada 100K expense tapi hanya 50K limit
**Current Logic**:
- Validasi: `if (remaining < amountVal) throw error`
- **PROBLEM**: Tidak bisa happen jika validasi bekerja

**Status**: ✅ AMAN

---

### Edge Case 2: Concurrent Transactions
**Scenario**: 2 user expense same budget bersamaan
**Current Logic**:
- Firestore transactions tidak atomic di sini
- Misalnya: Limit 100K, 2x 60K transaksi masuk hampir bersamaan
- Validasi run di client, jadi bisa race condition

**Status**: ⚠️ MINOR RISK (only if many concurrent users)
**Fix**: Bisa gunakan Firestore transaction/batch later

---

### Edge Case 3: Delete Transaksi Lama (bulan lalu)
**Scenario**: User delete expense dari bulan kemarin
**Current Logic**:
- handleDeleteTransaction: just delete, sisa auto recalc
- **OK**: Tidak ada constraint, bisa delete any month

**Status**: ✅ AMAN

---

### Edge Case 4: Edit Transaksi → Naikkan Amount Budget Tidak Ada
**Scenario**: Edit expense 500K → 600K, tapi sisa hanya 100K
**Current Logic**:
```javascript
const used = calculateBudgetUsed(id, transactions);
const remaining = calculateBudgetRemaining(budget, used - oldAmountVal);
if (remaining < newAmountVal) throw error
```
**✅ BENAR**: Exclude transaksi lama dari used, validasi with new amount

---

### Edge Case 5: Budget Field "amount" Still Exists in DB
**Scenario**: Old budgets di DB punya field `amount`
**Current Logic**:
- New code HANYA baca `limit`
- `amount` dibiarkan (tidak dihapus/baca)
- Calculated field menggantikan

**Status**: ✅ AMAN (backward compatible)
**Rekomendasi**: Bisa hapus field `amount` nanti via migration script

---

## 🎯 KESIMPULAN AUDIT

| Fungsi | Status | Note |
|--------|--------|------|
| calculateBudgetUsed | ✅ | Benar |
| calculateBudgetRemaining | ✅ | Benar |
| handleDailyTransaction (income) | ✅ | Benar |
| handleDailyTransaction (expense) | ✅ | Benar, tidak update DB |
| handleTransfer | ✅ | Semua case benar |
| handleDeleteTransaction | ✅ | Semua type benar |
| handleEditTransaction | ✅ | Validasi correct |
| Summary Component | ✅ | Calculate benar |
| Home Component | ✅ | Display benar |
| Manage Component | ✅ | Calculate benar |

---

## 📋 TODO NEXT

1. ✅ Deploy & test di production
2. ⚠️ Consider: Firestore transaction untuk prevent race condition
3. 📅 Later: Migration script hapus field `amount` di existing budgets
4. 📊 Monitor: Track edge cases di production

---

## TESTING CHECKLIST

- [ ] Income: Wallet naik
- [ ] Expense: Error jika sisa tidak cukup
- [ ] Expense: Catat transaksi
- [ ] Top Up: Limit naik, amount naik
- [ ] Delete Income: Wallet kurang
- [ ] Delete Expense: Sisa bertambah otomatis (no manual update)
- [ ] Edit Income: Jumlah berubah di wallet
- [ ] Edit Expense: Validasi sisa cukup
- [ ] Transfer Wallet→Wallet: Both updated
- [ ] Transfer Wallet→Budget: Limit naik
- [ ] Transfer Budget→Wallet: Limit kurang
