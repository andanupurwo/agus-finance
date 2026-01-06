import React, { useState, useRef } from 'react';
import { Database, AlertTriangle, Package, RefreshCw, Calendar, Trash, ChevronDown, Info, BookOpen, BarChart3, Sun, Moon, Monitor } from 'lucide-react';
import { useDeveloperMode } from '../hooks/useDeveloperMode';
import { useTheme } from '../context/ThemeContext';

export const Settings = ({ wallets, budgets, transactions, setLoading, loading, user, showToast, showConfirm, demoEnabled, setDemoEnabled }) => {
  const { loadDummyData, loadDefaultCategories, resetFactory, clearTransactions, monthlyRollover } = useDeveloperMode(showToast, showConfirm);
  const { themeMode, setTheme } = useTheme();
  const [sections, setSections] = useState({
    theme: false,
    about: false,
    guide: false,
    devMode: false,
    appInfo: false
  });
  const sectionRefs = {
    theme: useRef(null),
    about: useRef(null),
    guide: useRef(null),
    devMode: useRef(null),
    appInfo: useRef(null)
  };
  const [devModeOpen, setDevModeOpen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [attemptedDevMode, setAttemptedDevMode] = useState(null);

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
        devMode: section === 'devMode',
        appInfo: section === 'appInfo'
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

  const handleDevModeToggle = () => {
    setAttemptedDevMode(!devModeOpen);
    setShowPinModal(true);
    setPin('');
  };

  const handlePinSubmit = () => {
    if (pin === '0000') {
      setDevModeOpen(attemptedDevMode);
      setShowPinModal(false);
      setPin('');
      showToast(`Developer Mode ${attemptedDevMode ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } else {
      showToast('PIN salah! Gunakan PIN: 0000', 'error');
      setPin('');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-1.5">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Kelola aplikasi dan panduan penggunaan</p>
      </div>

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

      {/* ABOUT SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.about}>
        <button
          onClick={() => toggleSection('about')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Info size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Tentang Aplikasi</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.about ? 'rotate-180' : ''}`} />
        </button>

        {sections.about && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in duration-300">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">💰 Agus Finance</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                Aplikasi manajemen keuangan pribadi yang dirancang untuk memudahkan Anda mengelola wallet, budget, dan transaksi harian dengan cara yang sederhana namun powerful.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3">✨ Fitur Utama</h4>
              <ul className="space-y-2">
                <li className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span><strong>Manajemen Wallet</strong> - Kelola berbagai sumber penyimpanan dana</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span><strong>Anggaran Budget</strong> - Tetapkan dan pantau batas pengeluaran per kategori</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span><strong>Pencatatan Transaksi</strong> - Catat pemasukan dan pengeluaran real-time</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span><strong>Analisis Bulanan</strong> - Lihat ringkasan dan tren keuangan Anda</span>
                </li>
                <li className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span><strong>Tema Gelap/Terang</strong> - Mode visual yang mengikuti preferensi sistem Anda</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">Versi</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">1.0.0</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">Dibangun dengan</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">React</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">Data</p>
                <p className="font-bold text-slate-900 dark:text-white text-sm">Firebase</p>
              </div>
            </div>

            <div className="grid grid-cols-2 space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className='text-center'>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">👨‍💻 Created By</p>
                <p className="text-sm text-slate-900 dark:text-white font-semibold">Agus Astroboy</p>
              </div>
              <div className='text-center'>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">🙏 Thanks to Support</p>
                <p className="text-sm text-slate-900 dark:text-white font-semibold">_dunckles & Meansrev</p>
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

      {/* DEVELOPER MODE SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.devMode}>
        <button
          onClick={() => toggleSection('devMode')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database size={20} className="text-slate-600 dark:text-slate-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Developer Mode</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.devMode ? 'rotate-180' : ''}`} />
        </button>

        {sections.devMode && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">Developer Tools</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Akses tools untuk testing & development</div>
              </div>
              <button
                onClick={handleDevModeToggle}
                className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${devModeOpen ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${devModeOpen ? 'translate-x-7' : 'translate-x-0'}`}></div>
              </button>
            </div>

            {devModeOpen && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <button
                  onClick={() => loadDummyData(setLoading)}
                  disabled={loading}
                  className="w-full bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-800 text-slate-900 dark:text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Package size={18} className="text-blue-600 dark:text-blue-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Load Dummy Data</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Tambahkan data contoh untuk testing</div>
                  </div>
                </button>

                <button
                  onClick={() => loadDefaultCategories(setLoading)}
                  disabled={loading}
                  className="w-full bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Load Default Categories</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Buat kategori Wallet & Budget default</div>
                  </div>
                </button>

                <button
                  onClick={() => monthlyRollover(wallets, budgets, transactions, user, setLoading)}
                  disabled={loading}
                  className="w-full bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-slate-900 dark:text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Calendar size={18} className="text-purple-600 dark:text-purple-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Monthly Rollover</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Reset budget & return sisa ke wallet</div>
                  </div>
                </button>

                <button
                  onClick={() => clearTransactions(transactions, setLoading)}
                  disabled={loading}
                  className="w-full bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60 border border-orange-300 dark:border-orange-800 text-slate-900 dark:text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash size={18} className="text-orange-600 dark:text-orange-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Clear Transactions</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Hapus semua transaksi, keep kategori</div>
                  </div>
                </button>

                <button
                  onClick={() => resetFactory(wallets, budgets, transactions, setLoading)}
                  disabled={loading}
                  className="w-full bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800 text-slate-900 dark:text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Reset Pabrik</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Hapus semua data (tidak bisa dibatalkan)</div>
                  </div>
                </button>

                <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 p-4 rounded-xl mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">User Demo Login</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Aktifkan kode sakti 'demo' untuk akses read-only</div>
                    </div>
                    <button
                      onClick={() => setDemoEnabled(!demoEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${demoEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${demoEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-500">
                    {demoEnabled ? '✓ Demo mode aktif - Bisa masuk dengan kode "demo"' : '✗ Demo mode dinonaktifkan'}
                  </p>
                </div>
              </div>
            )}
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

      {/* PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowPinModal(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">🔐 Masukkan PIN</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">PIN diperlukan untuk {attemptedDevMode ? 'mengaktifkan' : 'menonaktifkan'} Developer Mode</p>

            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="• • • •"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-4 rounded-xl text-center text-2xl font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300 mb-4"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                }}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all duration-300"
              >
                Batal
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pin.length !== 4}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
