/**
 * Cache Manager Utility
 * Mengelola pembersihan cache dari berbagai sumber:
 * - localStorage
 * - sessionStorage
 * - IndexedDB (Firestore cache)
 * - Service Workers
 * - Browser Cache
 */

export const cacheManager = {
  /**
   * Bersihkan localStorage saja
   */
  clearLocalStorage: () => {
    console.log('🗑️ Clearing localStorage...');
    localStorage.clear();
    console.log('✓ localStorage cleared');
  },

  /**
   * Bersihkan sessionStorage saja
   */
  clearSessionStorage: () => {
    console.log('🗑️ Clearing sessionStorage...');
    sessionStorage.clear();
    console.log('✓ sessionStorage cleared');
  },

  /**
   * Bersihkan Firestore cache dari IndexedDB
   */
  clearFirestoreCache: async () => {
    console.log('🗑️ Clearing Firestore IndexedDB cache...');
    try {
      // Hapus database IndexedDB yang digunakan Firestore
      const dbs = await indexedDB.databases?.() || [];
      for (const db of dbs) {
        if (db.name.includes('firebase') || db.name.includes('firestore')) {
          console.log(`  Deleting IndexedDB: ${db.name}`);
          indexedDB.deleteDatabase(db.name);
        }
      }
      
      // Fallback untuk browser lama
      const commonFirestoreDBs = [
        'firebase-firestore-db',
        'firestore',
        'firebase-app-check'
      ];
      
      for (const dbName of commonFirestoreDBs) {
        try {
          indexedDB.deleteDatabase(dbName);
          console.log(`  Deleted: ${dbName}`);
        } catch {
          console.log(`  ${dbName} not found (OK)`);
        }
      }
      
      console.log('✓ Firestore cache cleared');
    } catch {
      console.warn('Note: IndexedDB clearing might need manual browser DevTools cleanup');
    }
  },

  /**
   * Bersihkan Service Workers
   */
  clearServiceWorkers: async () => {
    console.log('🗑️ Clearing Service Workers...');
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`  Found ${registrations.length} service worker(s)`);
        
        for (const registration of registrations) {
          await registration.unregister();
          console.log(`  Unregistered: ${registration.scope}`);
        }
        
        // Clear service worker cache storage
        const cacheNames = await caches.keys();
        console.log(`  Found ${cacheNames.length} cache(s)`);
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log(`  Deleted cache: ${cacheName}`);
        }
      }
      console.log('✓ Service Workers cleared');
    } catch {
      console.warn('Could not clear service workers');
    }
  },

  /**
   * Bersihkan yang TIDAK penting (aman untuk sering dilakukan)
   * - localStorage kecuali appUser
   * - sessionStorage
   * - Service Workers
   */
  clearNonCriticalCache: async () => {
    console.log('🧹 Clearing non-critical cache...');
    
    // Simpan appUser dulu
    const appUser = localStorage.getItem('appUser');
    
    // Clear localStorage (kecuali appUser nanti)
    localStorage.clear();
    
    // Restore appUser
    if (appUser) {
      localStorage.setItem('appUser', appUser);
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear service workers
    await cacheManager.clearServiceWorkers();
    
    console.log('✓ Non-critical cache cleared');
  },

  /**
   * Bersihkan SEMUA cache (nuclear option)
   * RESET TOTAL aplikasi, perlu login ulang
   */
  clearAllCache: async () => {
    console.log('☢️ CLEARING ALL CACHE - FULL RESET');
    
    // 1. Clear localStorage
    cacheManager.clearLocalStorage();
    
    // 2. Clear sessionStorage
    cacheManager.clearSessionStorage();
    
    // 3. Clear Firestore cache
    await cacheManager.clearFirestoreCache();
    
    // 4. Clear service workers & cache storage
    await cacheManager.clearServiceWorkers();
    
    // 5. Browser cache (jika possible)
    try {
      // Try to clear cache API
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch {
      console.log('Browser cache requires manual clearing via DevTools');
    }
    
    console.log('✓ ALL CACHE CLEARED - Full reset complete');
  },

  /**
   * Log cache information untuk debugging
   */
  logCacheInfo: async () => {
    console.log('📊 === CACHE INFORMATION ===');
    
    console.log('\n📍 localStorage:');
    console.log(`   Keys: ${localStorage.length}`);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const size = new Blob([localStorage.getItem(key)]).size;
      console.log(`   - ${key}: ${(size / 1024).toFixed(2)}KB`);
    }
    
    console.log('\n📍 sessionStorage:');
    console.log(`   Keys: ${sessionStorage.length}`);
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const size = new Blob([sessionStorage.getItem(key)]).size;
      console.log(`   - ${key}: ${(size / 1024).toFixed(2)}KB`);
    }
    
    console.log('\n📍 IndexedDB:');
    try {
      const dbs = await indexedDB.databases?.() || [];
      console.log(`   Databases: ${dbs.length}`);
      for (const db of dbs) {
        console.log(`   - ${db.name}`);
      }
    } catch {
      console.log('   Could not enumerate databases');
    }
    
    console.log('\n📍 Service Workers:');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`   Registrations: ${registrations.length}`);
      for (const reg of registrations) {
        console.log(`   - ${reg.scope}`);
      }
    }
    
    console.log('\n📍 Cache Storage:');
    try {
      const cacheNames = await caches.keys();
      console.log(`   Caches: ${cacheNames.length}`);
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        console.log(`   - ${name}: ${keys.length} items`);
      }
    } catch {
      console.log('   No cache storage available');
    }
    
    console.log('\n=========================\n');
  }
};

export default cacheManager;
