# 🔒 Security Setup Checklist for Production

## Pre-Production Security Setup

### 1. Environment Variables Setup
- [ ] Copy `.env.example` ke `.env.prod`
- [ ] Set `VITE_ENVIRONMENT=prod`
- [ ] Generate random `VITE_ENCRYPTION_KEY` (minimal 32 karakter)
- [ ] Set `VITE_DEBUG_MODE=false`
- [ ] Set `VITE_LOG_SECURITY=true` (untuk audit logging)

### 2. Magic Code Setup
**Option A: Keep Hardcoded (Sementara)**
- [ ] Verify magic codes tidak exposed di console
- [ ] Test login works
- [ ] Test rate limiting
- [ ] Document magic codes di place yang aman (jangan version control)

**Option B: Migrate to Environment Variables (Recommended)**
- [ ] Generate SHA-256 hash dari setiap magic code
  ```bash
  # Contoh generate hash:
  node -e "require('crypto').createHash('sha256').update('081111').digest('hex')"
  ```
- [ ] Simpan hashes di `.env.prod`:
  ```
  VITE_MAGIC_CODE_HASH_1=<hash_untuk_code_1>
  VITE_MAGIC_CODE_HASH_2=<hash_untuk_code_2>
  ```
- [ ] Update App.jsx untuk baca dari env dan compare hash

### 3. PIN Setup
- [ ] Test PIN hashing works correctly
- [ ] Verify PINs stored as hash, not plain text
- [ ] Hash existing PINs jika ada (atau request user set PIN baru)
- [ ] Set initial PIN untuk setiap user: `000000`

### 4. Dev PIN Protection
- [ ] Remove hardcoded `DEV_PIN='0000'`
- [ ] Set `VITE_DEV_PIN` di `.env.prod` ke null atau kompleks string
- [ ] Atau gunakan environment variable khusus untuk dev
- [ ] Verify Dev Mode tidak accessible di production

### 5. Session Management
- [ ] Test session timeout 30 menit works
- [ ] Test warning dialog muncul di 25 menit
- [ ] Test auto-logout di 30 menit
- [ ] Verify inactivity correctly tracked (mouse, keyboard, scroll, touch)

### 6. Rate Limiting
- [ ] Test lockout setelah 5 failed attempts
- [ ] Test unlock setelah 15 menit
- [ ] Verify correct error messages shown
- [ ] Test `clearLoginAttempts` setelah successful login

### 7. Security Headers (Server Configuration)
- [ ] Add Content Security Policy (CSP) header
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  ```
- [ ] Add X-Frame-Options
  ```
  X-Frame-Options: DENY
  ```
- [ ] Add X-Content-Type-Options
  ```
  X-Content-Type-Options: nosniff
  ```
- [ ] Add Strict-Transport-Security (HSTS)
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```
- [ ] Add X-XSS-Protection
  ```
  X-XSS-Protection: 1; mode=block
  ```

### 8. HTTPS & SSL
- [ ] All traffic forced to HTTPS
- [ ] Valid SSL certificate installed
- [ ] Certificate auto-renewal setup
- [ ] Test mixed content warnings (none should appear)

### 9. Firebase Security Rules
- [ ] Review Firebase Firestore security rules
- [ ] Only authenticated users can read/write
- [ ] User dapat hanya akses data milik mereka
- [ ] Admin operations restricted to admins

### 10. Data Protection
- [ ] Backup strategy in place
- [ ] Data encryption at rest (Firebase setting)
- [ ] Data encryption in transit (HTTPS)
- [ ] Regular security audits scheduled

### 11. Monitoring & Logging
- [ ] Security logs captured (localStorage atau backend)
- [ ] Unusual activities monitored
- [ ] Alert system for suspicious activities
- [ ] Failed login attempts tracked

### 12. User Communication
- [ ] Inform users about session timeout
- [ ] Provide security tips in help section
- [ ] Document password/PIN requirements
- [ ] Emergency contact for account recovery

### 13. Build & Deployment
- [ ] Build artifacts don't contain source maps (remove in production)
  ```bash
  # In vite.config.js for production
  build: {
    sourcemap: false
  }
  ```
- [ ] Environment variables not hardcoded in build
- [ ] No console.debug/log in production code
- [ ] Test build artifact for sensitive data

### 14. Testing Checklist
- [ ] Test all login scenarios (valid, invalid, locked)
- [ ] Test all PIN operations (change, verify)
- [ ] Test session timeout (warning & logout)
- [ ] Test rate limiting (lock & unlock)
- [ ] Test cross-browser compatibility
- [ ] Test on mobile devices
- [ ] Security scanning tools run (OWASP ZAP, etc.)

### 15. Documentation
- [ ] Update README with security features
- [ ] Document incident response procedure
- [ ] Create recovery procedures
- [ ] Document backup/restore process
- [ ] Create security incident log template

---

## Deployment Checklist

### Before Going Live
1. [ ] All tests passing
2. [ ] Security checklist items completed
3. [ ] Code reviewed by security team
4. [ ] Staging environment tested
5. [ ] Backups verified
6. [ ] Incident response plan ready
7. [ ] Support team trained
8. [ ] Monitoring setup complete

### During Deployment
1. [ ] Environment variables correctly set
2. [ ] Database migrations successful
3. [ ] No error in logs
4. [ ] Performance metrics normal
5. [ ] All features working

### After Deployment
1. [ ] Monitor for errors (48 hours)
2. [ ] Check security logs
3. [ ] Verify users can login
4. [ ] Verify session timeout working
5. [ ] No unusual traffic patterns
6. [ ] Document any issues

---

## Quick Production Environment Variables Template

```bash
# Copy ke .env.prod dan isi sesuai kebutuhan

# Environment
VITE_ENVIRONMENT=prod

# Firebase (Production)
VITE_FIREBASE_API_KEY_PROD=your_prod_key_here
VITE_FIREBASE_AUTH_DOMAIN_PROD=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID_PROD=your-project-id
VITE_FIREBASE_STORAGE_BUCKET_PROD=your-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID_PROD=your-sender-id
VITE_FIREBASE_APP_ID_PROD=your-app-id

# Security
VITE_MAGIC_CODES_ENABLED=true
VITE_DEV_PIN=null
VITE_SESSION_TIMEOUT_MINUTES=30
VITE_SESSION_WARNING_MINUTES=5
VITE_LOGIN_MAX_ATTEMPTS=5
VITE_LOGIN_ATTEMPT_WINDOW_MINUTES=15

# Encryption
VITE_ENCRYPTION_KEY=generate_random_32_char_string_here

# Debug
VITE_DEBUG_MODE=false
VITE_LOG_SECURITY=true
VITE_VERBOSE_LOGS=false
```

---

## Security Contact & Support

- **Security Issues**: Report immediately to security team
- **Questions**: Review IMPLEMENTATION_GUIDE.md
- **Issues**: Check GitHub issues & security documentation

---

## Regular Security Maintenance

### Weekly
- [ ] Check security logs for anomalies
- [ ] Verify backups are working
- [ ] Monitor failed login attempts

### Monthly
- [ ] Review user access logs
- [ ] Check for outdated dependencies
- [ ] Run security scans
- [ ] Review and update security policies

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing (if budget allows)
- [ ] Update incident response procedures
- [ ] Security training for team

### Annually
- [ ] Full security assessment
- [ ] Compliance audit
- [ ] Update security documentation
- [ ] Plan for next year's improvements

---

**Last Updated**: Januari 9, 2026  
**Version**: 1.0  
**Status**: Ready for Implementation
