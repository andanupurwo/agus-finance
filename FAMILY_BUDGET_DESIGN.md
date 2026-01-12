# 👨‍👩‍👧‍👦 Family Budget Management System

## KONSEP: Dari User-Based ke Family-Shared

### ❌ YANG SEKARANG (SALAH untuk use case ini):
```
Purwo (user A)
├─ Wallet Purwo (Rp 10 juta)
├─ Budget Purwo (Rp 5 juta)
└─ Transactions Purwo

Istri (user B)
├─ Wallet Istri (Rp 8 juta)  ← TERPISAH!
├─ Budget Istri (Rp 4 juta)   ← TERPISAH!
└─ Transactions Istri          ← TERPISAH!

❌ Problem: Data tidak bisa dilihat bersama!
```

### ✅ YANG SEHARUSNYA (untuk Family Budget):
```
KELUARGA (Family ID: family_001)
├─ Members:
│  ├─ Purwo (Superadmin) - bisa manage keluarga
│  ├─ Istri (Admin) - bisa lihat & edit semua
│  ├─ Anak 1 (Member) - bisa lihat, edit terbatas
│  └─ Anak 2 (Member) - bisa lihat
│
├─ Wallets (SHARED):
│  ├─ Dompet Utama (Rp 50 juta)
│  └─ Tabungan (Rp 100 juta)
│
├─ Budgets (SHARED):
│  ├─ Makan (Rp 10 juta/bulan)
│  ├─ Transport (Rp 3 juta/bulan)
│  └─ Utilities (Rp 2 juta/bulan)
│
└─ Transactions (SHARED):
   ├─ "Purwo: Beli makan Rp 50k"
   ├─ "Istri: Beli bensin Rp 100k"
   └─ "Anak 1: Beli buku Rp 75k"

✅ Semua data shared, semua member bisa lihat
✅ Tapi ada role-based permissions (siapa bisa edit, delete, dll)
```

---

## IMPLEMENTASI ROADMAP

### PHASE 1: Firestore Schema Update
```javascript
// Collections:
families/
  ├─ family_id_001/
  │  ├─ info: {name, createdBy, createdAt}
  │  ├─ settings: {currency, timezone}
  │  └─ members: {
  │      userId: {
  │        email: "purwo@gmail.com",
  │        name: "Purwo",
  │        role: "superadmin", // superadmin, admin, member, viewer
  │        joinedAt: "2025-01-12",
  │        permissions: {
  │          canCreate: true,
  │          canEdit: true,
  │          canDelete: true
  │        }
  │      }
  │    }
  │
  └─ wallets/ (SHARED - punya familyId)
  │  └─ wallet_id_001: {
  │     name: "Dompet Utama",
  │     amount: "Rp 50,000,000",
  │     familyId: "family_id_001", ← LINK KE FAMILY
  │     createdBy: "uid_purwo",
  │     createdAt: "2025-01-12"
  │   }

  budgets/ (SHARED - punya familyId)
  └─ budget_id_001: {
     name: "Makan",
     limit: "Rp 10,000,000",
     familyId: "family_id_001", ← LINK KE FAMILY
     createdBy: "uid_purwo",
     createdAt: "2025-01-12"
   }

  transactions/ (SHARED - punya familyId)
  └─ tx_id_001: {
     title: "Beli makan",
     amount: "Rp 50,000",
     type: "expense",
     familyId: "family_id_001", ← LINK KE FAMILY
     createdBy: "uid_purwo",
     createdByName: "Purwo",
     createdAt: "2025-01-12"
   }
```

### PHASE 2: Security Rules Update
```firestore
match /families/{familyId} {
  // User harus member dari family untuk akses
  function isFamilyMember() {
    return familyId in get(/databases/$(database)/documents/families/$(familyId)).data.members;
  }
  
  allow read: if isFamilyMember();
  allow write: if isFamilyMember() && 
                  get(/databases/$(database)/documents/families/$(familyId)).data.members[request.auth.uid].role in ['superadmin', 'admin'];
}

match /wallets/{walletId} {
  allow read: if resource.data.familyId in get(/databases/$(database)/documents/families/$(resource.data.familyId)).data.members;
  allow write: if checkFamilyMemberWithRole(['superadmin', 'admin']);
}
```

### PHASE 3: UI Components
```
Settings Page:
├─ Family Management (Superadmin only)
│  ├─ List Members
│  ├─ Add Member (input email, select role)
│  ├─ Edit Member Role
│  └─ Remove Member
│
└─ My Family Info
   ├─ Family Name
   ├─ My Role
   └─ Members Count
```

### PHASE 4: User Flow
```
1. Purwo login dengan Google
2. Sistem cek: Apakah sudah punya family?
   - Tidak ada → Create family baru (Purwo jadi owner)
   - Ada → Join family yang existing
3. Purwo buka Settings → Family Management
4. Tambah member dengan email → "Invite ashrinurhida@gmail.com"
5. Istri login dengan Google
6. Sistem auto-join ke family Purwo
7. Semua data shared langsung terlihat!
```

---

## FEATURES YANG AKAN DITAMBAH

### 1. Family Management UI
- ✅ Create family (auto saat user pertama login)
- ✅ Invite member (by email)
- ✅ Accept/Reject invitation
- ✅ Edit member role
- ✅ Remove member
- ✅ Leave family

### 2. Role Management
```
SUPERADMIN (Purwo)
├─ Can: View, Create, Edit, Delete everything
├─ Can: Manage family members (add, remove, change role)
└─ Can: Delete family

ADMIN (Istri)
├─ Can: View, Create, Edit, Delete wallets/budgets/transactions
└─ Cannot: Manage members or delete family

MEMBER (Anak)
├─ Can: View everything
├─ Can: Create transactions (dengan approval?)
└─ Cannot: Edit/delete wallets or budgets

VIEWER (Guest)
├─ Can: View everything
└─ Cannot: Create/Edit/Delete anything
```

### 3. Activity Log
```
Setiap transaksi show:
"Purwo: Transfer Rp 500k ke Tabungan - 14 Jan 10:30"
"Istri: Beli makan Rp 150k - 14 Jan 12:45"
"Anak 1: Beli buku Rp 75k - 14 Jan 15:20"
```

---

## STEPS IMPLEMENTASI

1. **Update userRoles.js**
   - Tambah family concept
   - Create family otomatis untuk user pertama
   - Link user ke family

2. **Update App.jsx**
   - Load family data saat login
   - Set familyId untuk semua operasi

3. **Update Firestore Rules**
   - Family-based access control
   - Replace user-based dengan family-based

4. **Create FamilyManagement.jsx**
   - List members
   - Add member form
   - Edit role
   - Remove member

5. **Update Home, Manage, Activity**
   - Filter data by familyId
   - Show member name di transaction

6. **Test & Deploy**

---

## EXPECTED RESULT

User login journey:
```
Purwo (login)
  → Auto create family_001
  → Show Family Management
  → Add Istri (ashrinurhida@gmail.com)
  → Istri login
  → Auto join family_001
  → See all shared data immediately!
```

Budget view:
```
Dompet Utama: Rp 50 juta
Transactions:
  - Purwo: Beli makan Rp 50k (11:30)
  - Istri: Beli bensin Rp 100k (12:00)
  - Anak 1: Beli buku Rp 75k (14:15)
  = Total hari ini: Rp 225k
```

---

## KEUNTUNGAN APPROACH INI

✅ Simple untuk keluarga kecil  
✅ Semua data terpusat  
✅ Role-based permissions (flexible)  
✅ Activity tracking siapa buat apa  
✅ Scalable untuk fitur approval/request di masa depan  

