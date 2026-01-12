import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, BookOpen, Upload, BarChart3, Sun, Moon, Monitor, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BulkImport } from '../components/BulkImport';
import { FamilyManagement } from '../components/FamilyManagement';
import { cacheManager } from '../utils/cacheManager';
import { firebaseConfig, environment } from '../firebase';
import { db } from '../firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

export const Settings = ({ wallets, budgets, transactions, setLoading, loading, user, userData, userRole, showToast, showConfirm, setUser, onForceRefresh }) => {
  const { themeMode, setTheme } = useTheme();
  const isProd = typeof import.meta !== 'undefined' ? import.meta.env?.PROD : false;
  const [sections, setSections] = useState({
    theme: false,
    about: false,
    guide: false,
    import: false,
    appInfo: false,
    cache: false
  });
  const sectionRefs = {
    theme: useRef(null),
    about: useRef(null),
    guide: useRef(null),
    import: useRef(null),
    appInfo: useRef(null),
    cache: useRef(null)
  };

  const toggleSection = (section) => {
    setSections(prev => {
      // Jika section yang diklik sedang terbuka, tutup saja
      if (prev[section]) {
        return { ...prev, [section]: false };
      }
      // Jika section yang diklik tertutup, buka dan tutup yang lain
      return {
        theme: section === 'theme',
        about: section === 'about',
        guide: section === 'guide',
        import: section === 'import',
        appInfo: section === 'appInfo',
        cache: section === 'cache'
      };
    });

    // Scroll to section after state update with offset
    setTimeout(() => {
      if (sectionRefs[section].current) {
        const element = sectionRefs[section].current;
        const elementPosition = element.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - 80; // Offset dari top

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-1.5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Kelola aplikasi dan panduan penggunaan</p>
      </div>

      {/* FAMILY MANAGEMENT SECTION */}
      {userData && (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm">
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in duration-300">
            <FamilyManagement
              familyId={userData.familyId}
              currentUserId={userData.uid}
              userRole={userRole}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          </div>
        </div>
      )}

      {/* THEME SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.theme}>
        <button
          onClick={() => toggleSection('theme')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            {themeMode === 'dark' ? (
              <Moon size={20} className="text-indigo-600 dark:text-indigo-400" />
            ) : themeMode === 'light' ? (
              <Sun size={20} className="text-amber-600 dark:text-amber-400" />
            ) : (
              <Monitor size={20} className="text-slate-600 dark:text-slate-400" />
            )}
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Tema Tampilan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {themeMode === 'dark' ? 'Mode Gelap' : themeMode === 'light' ? 'Mode Terang' : 'Ikuti Sistem'}
              </p>
            </div>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.theme ? 'rotate-180' : ''}`} />
        </button>

        {sections.theme && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3 animate-in fade-in duration-300">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Pilih tema tampilan aplikasi sesuai preferensi Anda
            </p>

            <div className="grid grid-cols-3 gap-3">
              {/* Light Mode */}
              <button
                onClick={() => {
                  setTheme('light');
                  showToast('Tema diubah ke Mode Terang', 'success');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${themeMode === 'light'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
              >
                <Sun
                  size={24}
                  className={themeMode === 'light' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}
                />
                <span className={`text-xs font-medium ${themeMode === 'light'
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-slate-600 dark:text-slate-400'
                  }`}>
                  Terang
                </span>
              </button>

              {/* Dark Mode */}
              <button
                onClick={() => {
                  setTheme('dark');
                  showToast('Tema diubah ke Mode Gelap', 'success');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${themeMode === 'dark'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
              >
                <Moon
                  size={24}
                  className={themeMode === 'dark' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}
                />
                <span className={`text-xs font-medium ${themeMode === 'dark'
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-400'
                  }`}>
                  Gelap
                </span>
              </button>

              {/* System Mode */}
              <button
                onClick={() => {
                  setTheme('system');
                  showToast('Tema mengikuti pengaturan sistem', 'success');
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${themeMode === 'system'
                    ? 'border-slate-500 bg-slate-50 dark:bg-slate-700/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                <Monitor
                  size={24}
                  className={themeMode === 'system' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'} />
                <span className={`text-xs font-medium ${themeMode === 'system'
                    ? 'text-slate-700 dark:text-slate-200'
                    : 'text-slate-600 dark:text-slate-400'
                  }`}>
                  Sistem
                </span>
              </button>
            </div>

            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">💡 Tips:</span> Mode "Sistem" akan mengikuti pengaturan tema dari perangkat Anda secara otomatis.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* APP INFO SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.appInfo}>
        <button
          onClick={() => toggleSection('appInfo')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Informasi Aplikasi</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.appInfo ? 'rotate-180' : ''}`} />
        </button>

        {sections.appInfo && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Wallets</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{wallets.length}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Budgets</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{budgets.length}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Transactions</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{transactions.length}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 dark:text-slate-400">Logged as</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{user || '-'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg col-span-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">Firebase Connection</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Env: {environment}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">Project: {firebaseConfig?.projectId || '-'}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-3">Kategori Default</p>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">👛 Wallets</p>
                  <div className="text-slate-700 dark:text-slate-300 space-y-0.5">
                    <div>• Tabungan (Cash, Muamalat, Seabank)</div>
                    <div>• Emas (Fisik, Pegadaian Digital)</div>
                    <div>• Saham (Bibit, Stockbit)</div>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1 mt-2">📊 Budgets</p>
                  <div className="text-slate-700 dark:text-slate-300 space-y-0.5">
                    <div>• Makan, Rumah Tangga, Anak, Transportasi, Lain-lain</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GUIDE SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.guide}>
        <button
          onClick={() => toggleSection('guide')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Panduan Penggunaan</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.guide ? 'rotate-180' : ''}`} />
        </button>

        {sections.guide && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-5 animate-in fade-in duration-300">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Tambahkan Wallet (Tempat Penyimpanan)</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 ml-8">
                Buka menu <strong>Manage</strong>, klik tombol <strong>+ Wallet</strong>. Masukkan nama (mis: Tabungan, Emas) dan deskripsi (mis: Seabank, Pegadaian). Wallet adalah tempat menyimpan dana Anda.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Buat Budget (Kategori Pengeluaran)</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 ml-8">
                Di menu <strong>Manage</strong>, klik tombol <strong>+ Budget</strong>. Masukkan nama kategori (mis: Makan, Transportasi), tetapkan batas anggaran bulanan. Budget membantu Anda mengontrol pengeluaran.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Catat Transaksi Harian</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 ml-8">
                Di menu <strong>Home</strong>, masukkan nominal, tanggal, dan keterangan. Pilih <strong>Pemasukan</strong> untuk uang masuk ke wallet, atau <strong>Pengeluaran</strong> untuk mengurangi budget.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Pindah Dana (Transfer)</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 ml-8">
                Di menu <strong>Manage</strong>, klik <strong>Alokasi / Pindah Dana</strong>. Pilih sumber (dari wallet/budget mana), tujuan, dan nominal. Gunakan untuk memindahkan dana antar kategori.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">5</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Pantau Progress</h4>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 ml-8">
                Di menu <strong>Activity</strong>, lihat riwayat transaksi. Di <strong>Home</strong>, lihat budget progress dengan indikator warna (hijau=aman, kuning=hati-hati, merah=limit terlampaui).
              </p>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mt-4">
              <p className="text-xs text-emerald-900 dark:text-emerald-300">
                <strong>💡 Tips:</strong> Data disimpan secara real-time di cloud. Edit nama wallet/budget dengan klik tombol ✏️. Hanya bisa hapus kategori jika saldo = 0. Tema mengikuti pengaturan sistem HP Anda.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* IMPORT SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.import}>
        <button
          onClick={() => toggleSection('import')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Upload size={20} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Import Data</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.import ? 'rotate-180' : ''}`} />
        </button>

        {sections.import && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3 animate-in fade-in duration-300">
            <p className="text-xs text-slate-600 dark:text-slate-400">Impor transaksi massal dari Excel/CSV. Pastikan nama Target sesuai dengan Wallet/Budget yang ada.</p>
            <BulkImport
              wallets={wallets}
              budgets={budgets}
              user={user}
              loading={loading}
              setLoading={setLoading}
              showToast={showToast}
              showConfirm={showConfirm}
            />
          </div>
        )}
      </div>

      {/* CACHE MANAGEMENT SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.cache}>
        <button
          onClick={() => toggleSection('cache')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Trash2 size={20} className="text-red-600 dark:text-red-400" />
            <div className="text-left">
              <h3 className="font-bold text-slate-900 dark:text-white">Bersihkan Cache</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hapus data tersimpan di aplikasi</p>
            </div>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.cache ? 'rotate-180' : ''}`} />
        </button>

        {sections.cache && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in duration-300">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
              <p className="text-sm text-red-900 dark:text-red-200">
                <span className="font-semibold">⚠️ Hati-hati!</span> Tombol di bawah akan menghapus <strong>SEMUA data</strong> di aplikasi dan server Firestore. Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>

            {/* Single Reset Button with Double Confirm */}
            <button
              onClick={async () => {
                // First confirmation
                const firstConfirm = await showConfirm('☢️ Hapus semua data? Yakin?');
                if (!firstConfirm) return;

                // Second confirmation with warning text
                const secondConfirm = await showConfirm(
                  '⚠️ PERINGATAN: Ini akan MENGHAPUS SELAMANYA semua data di server dan aplikasi.\n\nKetik "HAPUS SEMUA" untuk melanjutkan.'
                );
                if (!secondConfirm) return;

                try {
                  setLoading(true);
                  showToast('🗑️ Menghapus semua data...', 'warning');
                  
                  // Delete all Firestore collections
                  const collections = ['wallets', 'budgets', 'transactions'];
                  for (const name of collections) {
                    const snap = await getDocs(collection(db, name));
                    let batch = writeBatch(db);
                    let count = 0;
                    for (const docRef of snap.docs) {
                      batch.delete(docRef.ref);
                      count++;
                      if (count % 450 === 0) {
                        await batch.commit();
                        batch = writeBatch(db);
                      }
                    }
                    await batch.commit();
                  }
                  
                  showToast('✓ Data server dihapus. Membersihkan cache lokal...', 'success');
                  
                  // Clear all local caches
                  await cacheManager.clearAllCache();
                  
                  // Logout and reload
                  showToast('✓ Semua data telah dihapus. Logout...', 'success');
                  setUser(null);
                  setTimeout(() => window.location.reload(), 1500);
                } catch (e) {
                  showToast(e.message || 'Gagal reset total', 'error');
                }
                setLoading(false);
              }}
              disabled={loading}
              className="w-full p-4 bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300"
            >
              {loading ? '⏳ Sedang dihapus...' : '☢️ RESET TOTAL - Hapus Semua Data'}
            </button>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-900 dark:text-white mb-2">Apa yang dihapus:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Semua wallet di server Firestore</li>
                <li>Semua budget di server Firestore</li>
                <li>Semua transaksi di server Firestore</li>
                <li>Cache browser & localStorage</li>
                <li>Service worker cache</li>
                <li>Session Anda akan logout</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
};
