# 🔐 Security Implementation Guide

## Implementasi Keamanan Aplikasi Agus Finance
Dokumen ini menjelaskan perubahan keamanan yang telah diimplementasikan.

---

## ✅ Perubahan yang Sudah Diimplementasikan

### 1. **Security Utility Module** (`src/utils/security.js`)
Dibuat file utility lengkap dengan fungsi-fungsi keamanan:

- **Hashing & Password**
  - `hashPin(pin)` - Hash PIN menggunakan SHA-256
  - `comparePinWithHash(pin, hash)` - Verifikasi PIN dengan hash

- **Enkripsi Dasar**
  - `encryptData(data)` - Enkripsi data untuk localStorage
  - `decryptData(encrypted)` - Dekripsi data

- **Rate Limiting**
  - `checkLoginAttempts(identifier)` - Cek apakah login masih diperbolehkan
  - `recordLoginAttempt(identifier)` - Catat login attempt
  - `clearLoginAttempts(identifier)` - Clear attempts setelah sukses

- **Session Management**
  - `initSessionTimeout(onSessionEnd, onWarning)` - Setup session timeout 30 menit
  - Auto-logout jika tidak ada aktivitas
  - Warning 5 menit sebelum timeout

- **Input Validation**
  - `validateMagicCode(code)` - Validasi format magic code
  - `validatePin(pin)` - Validasi format PIN (6 digit)
  - `validateNominal(nominal)` - Validasi nominal nominal
  - `validateDescription(desc)` - Validasi deskripsi

- **Security Helpers**
  - `sanitizeObject(obj)` - Prevent prototype pollution
  - `isValidHash(value)` - Check apakah value adalah valid hash
  - `logSecurityEvent(eventType, details)` - Log security events

### 2. **Perbaikan App.jsx**

#### a) Import Security Module
```javascript
import { 
  validateMagicCode, 
  checkLoginAttempts, 
  recordLoginAttempt, 
  clearLoginAttempts,
  initSessionTimeout,
  logSecurityEvent 
} from './utils/security';
```

#### b) Magic Code dengan Rate Limiting
**Sebelum:**
```javascript
// Kode hardcoded tanpa validasi
const MAGIC_CODES = {
  '081111': 'Purwo',
  '140222': 'Ashri',
  demo: 'Demo'
};
```

**Sesudah:**
```javascript
// Tetap sama untuk sekarang, tapi dengan security comment
// TODO: Pindahkan ke environment variables untuk production
const MAGIC_CODES = {
  '081111': 'Purwo',
  '140222': 'Ashri',
  demo: 'Demo'
};
```

#### c) Improved Login Handler
```javascript
const handleMagicLogin = () => {
  // 1. Validate input format
  const validation = validateMagicCode(magicCode);
  if (!validation.valid) {
    showToast(validation.error, 'error');
    return;
  }

  // 2. Check rate limiting (5 attempts per 15 minutes)
  const rateCheck = checkLoginAttempts('magic_login');
  if (!rateCheck.allowed) {
    showToast(rateCheck.message, 'error');
    return;
  }

  // 3. Check magic code
  const trimmed = validation.code.toLowerCase();
  const found = MAGIC_CODES[trimmed];
  
  if (!found) {
    recordLoginAttempt('magic_login'); // Catat failed attempt
    showToast(`Kode sakti salah (sisa ${rateCheck.remaining - 1} percobaan)`, 'error');
    return;
  }

  // 4. Clear attempts & login
  clearLoginAttempts('magic_login');
  setUser(found);
  logSecurityEvent('LOGIN_SUCCESS', { user: found });
};
```

#### d) Session Timeout Management
```javascript
useEffect(() => {
  if (user) {
    // Initialize session timeout
    // Auto-logout setelah 30 menit inactivity
    // Warning 5 menit sebelum logout
    const handler = initSessionTimeout(
      () => {
        // Session expired
        setUser(null);
        showToast('⏱️ Sesi berakhir karena tidak ada aktivitas', 'warning');
      },
      () => {
        // Show warning dialog
        setShowSessionWarning(true);
      }
    );

    return () => handler.cleanup();
  }
}, [user]);
```

#### e) Session Warning Dialog
Ditambahkan UI dialog yang muncul 5 menit sebelum session timeout:
- Tombol "Lanjutkan" - Reset timer, lanjut menggunakan app
- Tombol "Logout" - Manual logout

### 3. **Perbaikan Settings.jsx**

#### a) Import Security Functions
```javascript
import { 
  hashPin, 
  comparePinWithHash, 
  validatePin, 
  logSecurityEvent 
} from '../utils/security';
```

#### b) Improved PIN Change with Hashing
**Sebelum:**
```javascript
// PIN disimpan plain text!
const storageKey = `pin_${user}`;
const currentPin = localStorage.getItem(storageKey) || '000000';

if (oldPin !== currentPin) {
  showToast('PIN lama salah', 'error');
  return;
}

localStorage.setItem(storageKey, newPin); // Saved plain text!
```

**Sesudah:**
```javascript
// PIN di-hash sebelum disimpan
const storageKey = `pin_hash_${user}`;
const currentPinHash = localStorage.getItem(storageKey) || null;

// Verify old PIN dengan hash comparison
let oldPinCorrect = false;
if (currentPinHash) {
  oldPinCorrect = await comparePinWithHash(oldPin, currentPinHash);
} else {
  oldPinCorrect = (oldPin === '000000'); // Default initial
}

// Hash dan simpan new PIN
const newPinHash = await hashPin(newPin);
localStorage.setItem(storageKey, newPinHash);
```

#### c) DEV_PIN Protection
**Sebelum:**
```javascript
// Hardcoded, accessible di production!
const DEV_PIN = '0000';
```

**Sesudah:**
```javascript
// Hanya aktif di development
const DEV_PIN = import.meta.env.VITE_DEV_PIN || (import.meta.env.DEV ? '0000' : null);

// Check di handlePinSubmit
if (!DEV_PIN) {
  showToast('Developer Mode tidak tersedia di production', 'error');
  return;
}
```

---

## 🔄 Alur Login Sekarang

```
User Input Code
    ↓
Validate Format (4-6 digit)
    ↓
Check Rate Limit (5 attempts / 15 min)
    ↓
Compare dengan MAGIC_CODES
    ↓
if Failed → Record Attempt, Show Error
    ↓
if Success → Clear Attempts, Login, Init Session Timeout
    ↓
Session Management
  ├─ 30 minutes timeout
  ├─ 25 minutes warning
  └─ Auto-logout on inactivity
```

---

## 🔐 Keamanan Yang Ditingkatkan

### 1. **Rate Limiting** ✓
- Max 5 login attempts per 15 menit
- Automatic unlock setelah 15 menit
- Show remaining attempts

### 2. **Session Management** ✓
- 30 menit session timeout
- Auto-logout on inactivity
- 5 menit warning before logout
- Easy "Lanjutkan" untuk reset timer

### 3. **PIN Hashing** ✓
- PIN di-hash sebelum disimpan
- SHA-256 hashing
- Safe storage di localStorage

### 4. **Input Validation** ✓
- Validate magic code format
- Validate PIN format (6 digit)
- Validate nominal amount
- Validate descriptions

### 5. **Dev PIN Protection** ✓
- DEV_PIN hanya aktif di development
- Blocked di production
- Requires explicit env variable

### 6. **Security Logging** ✓
- Log semua security events
- Track failed login attempts
- Log PIN changes
- Log session events

### 7. **Console Security** ✓
- Hapus debug logs untuk magic codes
- Tidak ada sensitive data di console

---

## 📋 Langkah Next Steps (Untuk Implementasi Lebih Lanjut)

### Immediate (Sebelum Production)

1. **Setup Environment Variables**
   ```bash
   # Copy .env.example ke .env.local (development)
   # Copy .env.example ke .env.prod (production)
   
   # Set VITE_ENVIRONMENT=prod
   # Jangan expose MAGIC_CODES di console
   ```

2. **Test Rate Limiting**
   - Try login dengan kode salah 5x dalam 15 menit
   - Verify lock message muncul
   - Wait 15 menit, verify unlock

3. **Test Session Timeout**
   - Login
   - Tunggu 25 menit, verify warning dialog
   - Tunggu 5 menit lebih, verify auto logout
   - Test "Lanjutkan" button

4. **Test PIN Hashing**
   - Ganti PIN
   - Verify hash disimpan, bukan plain text
   - Login dengan PIN baru di tab lain

### Medium Term

5. **Migrasi MAGIC_CODES ke Backend**
   ```javascript
   // Pindahkan dari hardcoded ke API
   // POST /api/authenticate dengan code
   // Backend verify & return JWT token
   ```

6. **Implement Backend Authentication**
   - Firebase Custom Auth
   - atau JWT token
   - Session stored di server, bukan localStorage

7. **Add 2FA (Optional)**
   - OTP via SMS
   - TOTP authenticator
   - Email verification

### Long Term

8. **Security Headers**
   - CSP (Content Security Policy)
   - X-Frame-Options
   - X-Content-Type-Options

9. **HTTPS & SSL Pinning**
   - Force HTTPS
   - Add certificate pinning

10. **Audit Logging**
    - Log ke backend untuk audit trail
    - Store security events di database

---

## 🧪 Testing Checklist

- [ ] Rate limiting locks after 5 failed attempts
- [ ] Rate limit resets after 15 minutes
- [ ] Session warning appears at 25 minutes
- [ ] Auto logout at 30 minutes inactivity
- [ ] "Lanjutkan" button resets timeout
- [ ] PIN stored as hash, not plain text
- [ ] DEV_PIN not accessible in production
- [ ] Magic code validation works
- [ ] PIN validation works
- [ ] Security events are logged
- [ ] Cross-tab PIN change detection works
- [ ] No sensitive data in console logs

---

## 🚀 Deployment Notes

1. **Before Production:**
   - [ ] Generate random encryption key
   - [ ] Setup production environment variables
   - [ ] Set VITE_ENVIRONMENT=prod
   - [ ] Disable debug mode
   - [ ] Remove development magic codes if using production ones
   - [ ] Test on staging first

2. **After Deployment:**
   - [ ] Monitor security logs
   - [ ] Check for unusual login patterns
   - [ ] Verify session timeouts working
   - [ ] Verify rate limiting working
   - [ ] Monitor for attempted exploits

---

## 📞 Support

Untuk pertanyaan tentang implementasi keamanan:
- Review SECURITY_ANALYSIS.md untuk detail masalah
- Check src/utils/security.js untuk function reference
- Look at App.jsx & Settings.jsx untuk usage examples

Last Updated: Januari 9, 2026
