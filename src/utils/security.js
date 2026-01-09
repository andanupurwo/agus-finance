/**
 * Security Utilities
 * Fungsi-fungsi untuk keamanan aplikasi:
 * - Hashing & password comparison
 * - Enkripsi/dekripsi data sensitif
 * - Rate limiting
 * - Input validation
 * - Session management
 */

// ============================================
// 1. SIMPLE HASHING (tanpa dependency)
// ============================================

/**
 * Simple hash function menggunakan SHA-256 (Web Crypto API)
 * PENTING: Ini untuk basic hashing saja, bukan production-grade
 * Untuk production, gunakan bcryptjs di backend
 */
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Compare PIN dengan hash
 */
export async function comparePinWithHash(pin, hash) {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
}

// ============================================
// 2. ENKRIPSI SEDERHANA (tanpa crypto-js)
// ============================================

/**
 * Simple encryption menggunakan Base64 + XOR
 * Catatan: Ini BUKAN enkripsi yang aman untuk production
 * Hanya untuk basic obfuscation di localStorage
 * Untuk real security, gunakan crypto-js atau library lain
 */
const SECRET_KEY = 'AGUS_FINANCE_2024'; // Generate dari env di production

function xorEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
}

function xorDecrypt(encrypted, key) {
  try {
    const text = atob(encrypted); // Base64 decode
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    console.error('Decrypt error');
    return null;
  }
}

export function encryptData(data, key = SECRET_KEY) {
  return xorEncrypt(data, key);
}

export function decryptData(encrypted, key = SECRET_KEY) {
  return xorDecrypt(encrypted, key);
}

// ============================================
// 3. RATE LIMITING
// ============================================

/**
 * Rate limiting untuk login
 * Batasi attempts: 5 kali dalam 15 menit
 */
export function checkLoginAttempts(identifier = 'login') {
  const now = Date.now();
  const storageKey = `RATE_LIMIT_${identifier}`;
  
  let attempts = [];
  try {
    const stored = localStorage.getItem(storageKey);
    attempts = stored ? JSON.parse(stored) : [];
  } catch {
    attempts = [];
  }

  // Filter attempts yang masih dalam window (15 menit = 900000ms)
  const WINDOW = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 5;
  
  attempts = attempts.filter(timestamp => now - timestamp < WINDOW);

  if (attempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = attempts[0];
    const timeUntilReset = WINDOW - (now - oldestAttempt);
    const minutesLeft = Math.ceil(timeUntilReset / 60000);
    return {
      allowed: false,
      remaining: 0,
      message: `Terlalu banyak percobaan. Coba lagi dalam ${minutesLeft} menit.`,
      resetTime: oldestAttempt + WINDOW
    };
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - attempts.length,
    message: null,
    resetTime: null
  };
}

export function recordLoginAttempt(identifier = 'login') {
  const storageKey = `RATE_LIMIT_${identifier}`;
  let attempts = [];
  
  try {
    const stored = localStorage.getItem(storageKey);
    attempts = stored ? JSON.parse(stored) : [];
  } catch {
    attempts = [];
  }

  attempts.push(Date.now());
  
  // Keep only last 10 attempts
  if (attempts.length > 10) {
    attempts = attempts.slice(-10);
  }
  
  localStorage.setItem(storageKey, JSON.stringify(attempts));
}

export function clearLoginAttempts(identifier = 'login') {
  const storageKey = `RATE_LIMIT_${identifier}`;
  localStorage.removeItem(storageKey);
}

// ============================================
// 4. SESSION MANAGEMENT
// ============================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_WARNING = 5 * 60 * 1000; // 5 minutes before timeout

export function initSessionTimeout(onSessionEnd, onWarning) {
  let timeoutId = null;
  let warningId = null;

  function resetTimer() {
    // Clear previous timers
    clearTimeout(timeoutId);
    clearTimeout(warningId);

    // Set warning (25 minutes)
    warningId = setTimeout(() => {
      if (onWarning) onWarning();
    }, SESSION_TIMEOUT - INACTIVITY_WARNING);

    // Set timeout (30 minutes)
    timeoutId = setTimeout(() => {
      if (onSessionEnd) onSessionEnd();
    }, SESSION_TIMEOUT);
  }

  function setupActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
  }

  function cleanup() {
    clearTimeout(timeoutId);
    clearTimeout(warningId);
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.removeEventListener(event, resetTimer, true);
    });
  }

  // Start the session
  setupActivityListeners();
  resetTimer();

  return { cleanup, resetTimer };
}

// ============================================
// 5. INPUT VALIDATION
// ============================================

export function validateMagicCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Kode tidak valid' };
  }

  const trimmed = code.trim();
  
  // Magic code harus 4-6 digit atau teks tertentu
  const isNumeric = /^\d{4,6}$/.test(trimmed);
  const isDemo = trimmed.toLowerCase() === 'demo';

  if (!isNumeric && !isDemo) {
    return { valid: false, error: 'Kode harus 4-6 digit atau "demo"' };
  }

  return { valid: true, code: trimmed };
}

export function validatePin(pin) {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN tidak valid' };
  }

  const trimmed = pin.trim();

  // PIN harus 6 digit
  if (!/^\d{6}$/.test(trimmed)) {
    return { valid: false, error: 'PIN harus 6 digit' };
  }

  return { valid: true, pin: trimmed };
}

export function validateNominal(nominal) {
  if (!nominal || typeof nominal !== 'string') {
    return { valid: false, error: 'Nominal tidak valid' };
  }

  const cleaned = nominal.replace(/[^0-9]/g, '');
  const amount = parseInt(cleaned, 10);

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Nominal harus angka positif' };
  }

  if (amount > 999999999) {
    return { valid: false, error: 'Nominal terlalu besar' };
  }

  return { valid: true, amount };
}

export function validateDescription(desc) {
  if (typeof desc !== 'string') {
    return { valid: false, error: 'Deskripsi tidak valid' };
  }

  // Max 200 characters
  if (desc.length > 200) {
    return { valid: false, error: 'Deskripsi maksimal 200 karakter' };
  }

  return { valid: true, description: desc.trim() };
}

// ============================================
// 6. SECURITY CHECKS
// ============================================

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;

  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !dangerous.includes(key)) {
      if (typeof obj[key] === 'object') {
        sanitized[key] = sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
  }

  return sanitized;
}

/**
 * Check if value is probably a hash (hex string of certain length)
 */
export function isValidHash(value) {
  if (typeof value !== 'string') return false;
  return /^[a-f0-9]{64}$/.test(value); // SHA-256 hash
}

// ============================================
// 7. DEVICE FINGERPRINT (Basic)
// ============================================

/**
 * Create basic device fingerprint
 * CATATAN: Tidak untuk production security, hanya untuk basic detection
 */
export function getDeviceFingerprint() {
  const ua = navigator.userAgent;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const combined = `${ua}|${language}|${timezone}`;
  return hashPin(combined); // Use hash for fingerprint
}

// ============================================
// 8. LOG SECURITY EVENTS
// ============================================

export function logSecurityEvent(eventType, details = {}) {
  const timestamp = new Date().toISOString();
  const event = {
    type: eventType,
    timestamp,
    ...details
  };

  // Jangan log sensitive data
  if (event.pin) delete event.pin;
  if (event.password) delete event.password;
  if (event.code) delete event.code;

  // Store in memory atau send to server
  console.debug('[SECURITY]', event);

  // Untuk production, bisa kirim ke backend untuk audit logging
}

export default {
  hashPin,
  comparePinWithHash,
  encryptData,
  decryptData,
  checkLoginAttempts,
  recordLoginAttempt,
  clearLoginAttempts,
  initSessionTimeout,
  validateMagicCode,
  validatePin,
  validateNominal,
  validateDescription,
  sanitizeObject,
  isValidHash,
  getDeviceFingerprint,
  logSecurityEvent
};
