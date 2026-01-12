# 🚨 ANALISIS KEAMANAN: Jika Ada Orang Random Login dengan Google

## Skenario: Orang Baru Buka Google Login

Mari kita trace apa yang terjadi step-by-step:

### ✅ **YANG BEKERJA (Authentication)**

```javascript
// 1. Orang random buka agus-finance.web.app
// 2. Klik "Login dengan Google"
// 3. Pop-up Google Auth muncul
// 4. Login dengan akun Google mereka
// 5. Firebase Authentication terima:
//    - uid: random_uid_dari_google
//    - email: akunmereka@gmail.com
//    - displayName: Nama Mereka
//    - photoURL: foto dari Google
```

**Hasil:** ✅ User berhasil login via Firebase Auth

---

### ❌ **MASALAH BESAR: Firestore Rules Tidak Aman!**

**File: `firestore.rules`**
```plaintext
allow read, write: if request.time < timestamp.date(2026, 2, 6);
```

**Arti:** 
- ✅ SIAPA SAJA yang login ke Firebase Auth bisa READ & WRITE semua data
- ✅ Tidak ada validasi email
- ✅ Tidak ada validasi role
- ✅ Sampai 6 Februari 2026

**CONTOH SERANGAN:**
```
Orang random (akunmereka@gmail.com) bisa:
✅ Lihat SEMUA transaksi Anda (read wallets, budgets, transactions)
✅ Ubah/hapus data Anda (write)
✅ Lihat data user lain (read users collection)
✅ Buat dokumen baru dengan UID mereka
✅ Hapus koleksi Anda
```

---

## ✅ **APA YANG SEBENARNYA TERJADI:**

### **Step 1: User Random Login**
```javascript
// userRoles.js
const role = getRoleByEmail(firebaseUser.email);
// Email: akunmereka@gmail.com
// Role: 'user' (bukan superadmin/admin)
```

**Hasil:** Dibuat user doc di Firestore dengan role='user'

### **Step 2: Masuk ke Aplikasi**
```
Halaman Home → Bisa lihat wallets, budgets, transactions
Halaman Activity → Bisa lihat semua transaksi
Halaman Manage → Bisa ubah data
```

### **Step 3: Akses Langsung ke Data Anda**
Firestore rules tidak check ownership, jadi random user bisa:
- Lihat wallets Anda (Rp 50 juta)
- Lihat transactions Anda (semua pengeluaran detail)
- Ubah/delete data Anda

---

## 🔴 **MASALAH KEAMANAN SUMMARY:**

| Isu | Status | Severity |
|-----|--------|----------|
| Authentication (Google) | ✅ Aman | - |
| Authorization (Firestore Rules) | ❌ **TIDAK AMAN** | 🔴 CRITICAL |
| Role-based Access | ❌ **Tidak diimplementasikan** | 🔴 CRITICAL |
| Data Ownership | ❌ **Tidak ada validasi** | 🔴 CRITICAL |

---

## 💡 **SOLUSI:**

### **Prioritas 1 - URGENT (Lakukan sekarang!)**

**Perbaiki Firestore Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Require authentication untuk semua
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Users hanya bisa lihat/edit data mereka sendiri
    match /wallets/{walletId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    match /transactions/{transactionId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    match /budgets/{budgetId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Superadmin bisa lihat semua user
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
      allow write: if request.auth.uid == userId;
      allow delete: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin';
    }
  }
}
```

### **Prioritas 2 - Tambah `userId` Field**

Setiap dokumen (wallets, budgets, transactions) harus punya field `userId`:

```javascript
// Saat create wallet
const walletData = {
  name: 'My Wallet',
  amount: 5000000,
  userId: firebaseUser.uid,  // ← TAMBAH INI!
  createdAt: new Date().toISOString()
};
```

### **Prioritas 3 - App-Level Validation**

Di App.jsx, hanya tampilkan data user yang sedang login:

```javascript
// Filter transactions untuk user yang login saja
const userTransactions = transactions.filter(t => t.userId === firebaseUser.uid);
```

---

## 📊 **SAAT INI (TIDAK AMAN):**

```
🔓 Orang Random
└─ Login Google (berhasil)
   └─ Buka App
      └─ Lihat SEMUA data Anda ❌
      └─ Ubah SEMUA data Anda ❌
      └─ Hapus SEMUA data Anda ❌
```

## 🔐 **SETELAH DIPERBAIKI (AMAN):**

```
🔒 Orang Random
└─ Login Google (berhasil)
   └─ Buka App
      └─ Hanya lihat data MEREKA SENDIRI ✅
      └─ Hanya ubah data MEREKA SENDIRI ✅
      └─ TIDAK bisa lihat data Anda ✅
```

---

## 🎯 **NEXT STEPS:**

1. **SEKARANG:** Update Firestore rules
2. **HARI INI:** Tambah `userId` field ke semua dokumen
3. **BESOK:** Filter data di App level
4. **MINGGU DEPAN:** Test dengan akun random

⏰ **DEADLINE PENTING:** Rules expire tanggal **6 Februari 2026** (tinggal 25 hari!)

