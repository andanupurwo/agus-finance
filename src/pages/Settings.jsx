import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Info, BookOpen, Upload, BarChart3, Sun, Moon, Monitor, Lock, Trash2, Eye, EyeOff, Users, UserPlus, KeyRound, Unlock, UserX } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BulkImport } from '../components/BulkImport';
import { FamilyManagement } from '../components/FamilyManagement';
import { cacheManager } from '../utils/cacheManager';
import { firebaseConfig, environment } from '../firebase';
import { db } from '../firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { changePin, validatePinStrength } from '../utils/pinManager';
import { getAllUsers, createUser, resetUserPin, unlockUser, deleteUser, getUserStats } from '../utils/userManager';

export const Settings = ({ wallets, budgets, transactions, setLoading, loading, user, userData, userRole, showToast, showConfirm, setUser, onForceRefresh }) => {
  const { themeMode, setTheme } = useTheme();
  const isProd = typeof import.meta !== 'undefined' ? import.meta.env?.PROD : false;
  const [sections, setSections] = useState({
    theme: false,
    about: false,
    guide: false,
    import: false,
    changPin: false,
    appInfo: false,
    cache: false,
    userManagement: false
  });
  const sectionRefs = {
    theme: useRef(null),
    about: useRef(null),
    guide: useRef(null),
    import: useRef(null),
    changPin: useRef(null),
    appInfo: useRef(null),
    cache: useRef(null),
    userManagement: useRef(null)
  };
  
  // Change PIN state
  const [changePinForm, setChangePinForm] = useState({ oldPin: '', newPin: '', confirmPin: '' });
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showPinOld, setShowPinOld] = useState(false);
  const [showPinNew, setShowPinNew] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [pinStrength, setPinStrength] = useState(null);

  // User Management state (superadmin only)
  const [users, setUsers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ username: '', pin: '' });
  const [userStats, setUserStats] = useState({ total: 0, active: 0, locked: 0 });

  // Load users if superadmin
  useEffect(() => {
    if (userRole === 'superadmin') {
      refreshUsers();
    }
  }, [userRole]);

  const refreshUsers = () => {
    const allUsers = getAllUsers();
    const stats = getUserStats();
    setUsers(allUsers);
    setUserStats(stats);
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
        changPin: section === 'changPin',
        appInfo: section === 'appInfo',
        cache: section === 'cache',
        userManagement: section === 'userManagement'
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

  // Handle Change PIN
  const handleChangePin = () => {
    const { oldPin, newPin, confirmPin } = changePinForm;
    
    if (!oldPin.trim()) {
      showToast('Masukkan PIN lama', 'error');
      return;
    }
    
    if (!newPin.trim()) {
      showToast('Masukkan PIN baru', 'error');
      return;
    }
    
    if (newPin !== confirmPin) {
      showToast('PIN baru tidak cocok', 'error');
      return;
    }
    
    if (newPin.length !== 6) {
      showToast('PIN harus 6 digit', 'error');
      return;
    }
    
    // Validate PIN strength
    const strength = validatePinStrength(newPin);
    if (!strength.valid) {
      showToast(strength.message, 'error');
      return;
    }
    
    // Change PIN using secure pinManager
    const result = changePin(user, oldPin, newPin);
    
    if (!result.success) {
      showToast(result.message, 'error');
      return;
    }
    
    // Broadcast to other tabs that PIN changed
    localStorage.setItem('PIN_CHANGED_EVENT', JSON.stringify({
      user,
      timestamp: Date.now()
    }));
    
    showToast(`✓ ${result.message}! User lain akan logout otomatis.`, 'success');
    
    // Reset form
    setChangePinForm({ oldPin: '', newPin: '', confirmPin: '' });
    setPinStrength(null);
    setShowChangePinModal(false);
    setShowPinOld(false);
    setShowPinNew(false);
    setShowPinConfirm(false);
  };

  // Handle new PIN input with strength validation
  const handleNewPinChange = (value) => {
    setChangePinForm({...changePinForm, newPin: value});
    if (value.length === 6) {
      const strength = validatePinStrength(value);
      setPinStrength(strength);
    } else {
      setPinStrength(null);
    }
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

      {/* USER MANAGEMENT SECTION - SUPERADMIN ONLY */}
      {userRole === 'superadmin' && (
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.userManagement}>
          <button
            onClick={() => toggleSection('userManagement')}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users size={20} className="text-rose-600 dark:text-rose-400" />
              <div className="text-left">
                <h3 className="font-bold text-slate-900 dark:text-white">Kelola Pengguna</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {userStats.total} user ({userStats.locked} terkunci)
                </p>
              </div>
            </div>
            <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.userManagement ? 'rotate-180' : ''}`} />
          </button>

          {sections.userManagement && (
            <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in duration-300">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total User</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{userStats.total}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-xl">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Aktif</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{userStats.active}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-3 rounded-xl">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Terkunci</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">{userStats.locked}</p>
                </div>
              </div>

              {/* Add User Button */}
              <button
                onClick={() => setShowAddUserModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl transition-all shadow-sm hover:shadow-md"
              >
                <UserPlus size={18} />
                <span className="font-semibold">Tambah User Baru</span>
              </button>

              {/* User List */}
              <div className="space-y-2">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <Users size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada user</p>
                  </div>
                ) : (
                  users.map((userData) => (
                    <div
                      key={userData.username}
                      className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 dark:text-white">{userData.username}</h4>
                            {user && userData.username?.toLowerCase() === user.toLowerCase() && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                                Anda (login)
                              </span>
                            )}
                            {userData.isLocked && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
                                LOCKED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {userData.failedAttempts > 0 && `${userData.failedAttempts} percobaan gagal • `}
                            {userData.lastChanged 
                              ? `PIN diubah ${new Date(userData.lastChanged).toLocaleDateString('id-ID')}`
                              : 'Belum pernah ubah PIN'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (confirm(`Reset PIN untuk user "${userData.username}" menjadi "000000"?`)) {
                              const result = resetUserPin(userData.username, '000000');
                              if (result.success) {
                                showToast(result.message, 'success');
                                refreshUsers();
                              } else {
                                showToast(result.message, 'error');
                              }
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          <KeyRound size={14} />
                          Reset PIN
                        </button>

                        {userData.isLocked && (
                          <button
                            onClick={() => {
                              if (confirm(`Buka kunci akun "${userData.username}"?`)) {
                                const result = unlockUser(userData.username);
                                if (result.success) {
                                  showToast(result.message, 'success');
                                  refreshUsers();
                                } else {
                                  showToast(result.message, 'error');
                                }
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <Unlock size={14} />
                            Unlock
                          </button>
                        )}

                        <button
                          onClick={() => {
                            // Check if trying to delete current user
                            if (user && userData.username?.toLowerCase() === user.toLowerCase()) {
                              showToast('❌ Tidak bisa menghapus akun yang sedang Anda gunakan!', 'error');
                              return;
                            }
                            
                            if (confirm(`HAPUS user "${userData.username}"?\n\nSemua data user ini akan hilang permanen!`)) {
                              if (confirm(`Yakin 100% ingin hapus "${userData.username}"? Tidak bisa dibatalkan!`)) {
                                const result = deleteUser(userData.username);
                                if (result.success) {
                                  showToast(result.message, 'success');
                                  refreshUsers();
                                } else {
                                  showToast(result.message, 'error');
                                }
                              }
                            }
                          }}
                          disabled={user && userData.username?.toLowerCase() === user.toLowerCase()}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <UserX size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">⚠️ Perhatian:</span> Reset PIN akan mengatur ulang ke "000000". User harus segera mengganti PIN mereka!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

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

      {/* CHANGE PIN SECTION */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors duration-300 shadow-sm" ref={sectionRefs.changPin}>
        <button
          onClick={() => toggleSection('changPin')}
          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-orange-600 dark:text-orange-400" />
            <h3 className="font-bold text-slate-900 dark:text-white">Ganti PIN</h3>
          </div>
          <ChevronDown size={20} className={`text-slate-600 dark:text-slate-400 transition-transform ${sections.changPin ? 'rotate-180' : ''}`} />
        </button>

        {sections.changPin && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in fade-in duration-300">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              User lain yang sedang login akan otomatis logout ketika Anda mengubah PIN.
            </p>
            
            <button
              onClick={() => setShowChangePinModal(true)}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-500 text-white font-bold transition-all"
            >
              Ubah PIN
            </button>
          </div>
        )}
      </div>

      {/* CHANGE PIN MODAL */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => {
          setShowChangePinModal(false);
          setChangePinForm({ oldPin: '', newPin: '', confirmPin: '' });
          setPinStrength(null);
          setShowPinOld(false);
          setShowPinNew(false);
          setShowPinConfirm(false);
        }}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">🔐 Ganti PIN</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Masukkan PIN lama dan PIN baru (6 digit angka)</p>
            
            <div className="space-y-3">
              {/* Old PIN Input */}
              <div className="relative">
                <input
                  type={showPinOld ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={changePinForm.oldPin}
                  onChange={(e) => setChangePinForm({...changePinForm, oldPin: e.target.value.replace(/\D/g, '')})}
                  placeholder="PIN Lama"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-center text-lg font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-orange-500 dark:focus:border-orange-400 outline-none transition-colors duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPinOld(!showPinOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPinOld ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* New PIN Input with Strength Indicator */}
              <div className="relative">
                <input
                  type={showPinNew ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={changePinForm.newPin}
                  onChange={(e) => handleNewPinChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="PIN Baru"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-center text-lg font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-orange-500 dark:focus:border-orange-400 outline-none transition-colors duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPinNew(!showPinNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPinNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {/* PIN Strength Indicator */}
              {pinStrength && (
                <div className={`text-xs p-2 rounded-lg ${
                  pinStrength.strength === 'strong' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' :
                  pinStrength.strength === 'medium' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300' :
                  'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                }`}>
                  {pinStrength.strength === 'strong' ? '✓ ' : pinStrength.strength === 'medium' ? '⚠️ ' : '✗ '}
                  {pinStrength.message}
                </div>
              )}
              
              {/* Confirm PIN Input */}
              <div className="relative">
                <input
                  type={showPinConfirm ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={changePinForm.confirmPin}
                  onChange={(e) => setChangePinForm({...changePinForm, confirmPin: e.target.value.replace(/\D/g, '')})}
                  placeholder="Konfirmasi PIN Baru"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 pr-10 rounded-xl text-center text-lg font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-orange-500 dark:focus:border-orange-400 outline-none transition-colors duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPinConfirm(!showPinConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPinConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowChangePinModal(false);
                  setChangePinForm({ oldPin: '', newPin: '', confirmPin: '' });
                }}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all duration-300"
              >
                Batal
              </button>
              <button
                onClick={handleChangePin}
                className="flex-1 bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all"
              >
                Ganti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL - SUPERADMIN ONLY */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => {
          setShowAddUserModal(false);
          setNewUserForm({ username: '', pin: '' });
        }}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">👤 Tambah User Baru</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">Buat akun user baru untuk aplikasi</p>
            
            <div className="space-y-3">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                  placeholder="Minimal 3 karakter"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-rose-500 dark:focus:border-rose-400 outline-none transition-colors duration-300"
                />
              </div>
              
              {/* Default PIN Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PIN Default (6 digit)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={newUserForm.pin}
                  onChange={(e) => setNewUserForm({...newUserForm, pin: e.target.value.replace(/\D/g, '')})}
                  placeholder="000000"
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-center text-lg font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-rose-500 dark:focus:border-rose-400 outline-none transition-colors duration-300"
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  💡 User baru akan dibuat dengan PIN default. User harus mengganti PIN saat login pertama kali.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserForm({ username: '', pin: '' });
                }}
                className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all duration-300"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const username = newUserForm.username.trim();
                  const pin = newUserForm.pin || '000000';
                  
                  if (!username) {
                    showToast('Username tidak boleh kosong', 'error');
                    return;
                  }
                  
                  if (username.length < 3) {
                    showToast('Username minimal 3 karakter', 'error');
                    return;
                  }
                  
                  if (pin.length !== 6) {
                    showToast('PIN harus 6 digit', 'error');
                    return;
                  }
                  
                  const result = createUser(username, pin);
                  if (result.success) {
                    showToast(`✓ User "${username}" berhasil dibuat dengan PIN: ${pin}`, 'success');
                    setShowAddUserModal(false);
                    setNewUserForm({ username: '', pin: '' });
                    refreshUsers();
                  } else {
                    showToast(result.message, 'error');
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 dark:hover:bg-rose-500 text-white py-3 rounded-xl font-bold transition-all"
              >
                Buat User
              </button>
            </div>
          </div>
        </div>
      )}

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
