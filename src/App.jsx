import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocsFromServer } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { Home as HomeIcon, LogOut } from 'lucide-react';
import { Home } from './pages/Home';
import { Activity } from './pages/Activity';
import { Manage } from './pages/Manage';
import { Settings } from './pages/Settings';
import { ClearCache } from './pages/ClearCache';
import { BottomNav } from './components/BottomNav';
import { Modal } from './components/Modal';
import { Header } from './components/Header';
import { Toast, ConfirmDialog } from './components/Toast';
import { useTransactions } from './hooks/useTransactions';
import { useTheme } from './context/ThemeContext';
import { formatRupiah, parseRupiah } from './utils/formatter';
import { cacheManager } from './utils/cacheManager';
import { getOrCreateUser } from './utils/userRoles';

export default function App() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'home');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- DATA STATE ---
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- FORM STATE (HOME) ---
  const [nominal, setNominal] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [transactionType, setTransactionType] = useState(null);
  const [showTargetModal, setShowTargetModal] = useState(false);

  // --- MODAL STATE (MANAGE) ---
  const [showModal, setShowModal] = useState(null);
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });
  const [newData, setNewData] = useState({ name: '', limit: '', description: '' });
  const [editingData, setEditingData] = useState({ id: null, type: null, name: '', description: '' });

  // --- NOTIFICATION STATE ---
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        try {
          const data = await getOrCreateUser(user);
          setUserData(data);
        } catch (err) {
          console.error('Failed to get user data:', err);
          showToast('Gagal memuat data user', 'error');
        }
      } else {
        setFirebaseUser(null);
        setUserData(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check if URL has ?clear=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clear') === '1') {
      (async () => {
        await cacheManager.clearAllCache();
        window.location.href = '/';
      })();
    }
  }, []);

  // Handle LogIn Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const data = await getOrCreateUser(user);
      setFirebaseUser(user);
      setUserData(data);
      showToast(`Selamat datang, ${data.displayName}!`, 'success');
    } catch (err) {
      console.error('LogIn login error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        showToast('Login dibatalkan', 'info');
      } else {
        showToast(err.message || 'Gagal login dengan Google', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setFirebaseUser(null);
      setUserData(null);
      setShowLogoutModal(false);
      showToast('Anda telah logout', 'success');
    } catch (err) {
      console.error('Logout error:', err);
      showToast('Gagal logout', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Setup activeTab persistence
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Get hooks
  const {
    handleDailyTransaction,
    handleTransfer,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDeleteTransaction,
    handleNominalInput
  } = useTransactions(showToast, showConfirm);

  // 1. SYNC FIREBASE
  useEffect(() => {
    const unsubW = onSnapshot(query(collection(db, "wallets"), orderBy("createdAt")), (snap) => {
      setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubB = onSnapshot(query(collection(db, "budgets"), orderBy("createdAt")), (snap) => {
      setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubT = onSnapshot(query(collection(db, "transactions"), orderBy("createdAt", "desc")), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubW(); unsubB(); unsubT(); };
  }, []);

  // 2. ROLLOVER REMINDER
  useEffect(() => {
    if (wallets.length === 0 || budgets.length === 0) return;
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    if (!isFirstOfMonth) return;
    showToast('🔔 Awal bulan: periksa sisa budget dan set ulang limit secara manual.', 'info');
  }, [wallets, budgets]);

  // Calculate totals
  const walletTotal = wallets.reduce((acc, w) => acc + parseRupiah(w.amount), 0);
  const budgetTotal = budgets.reduce((acc, b) => {
    const expenseTransactions = transactions.filter(t => 
      t.type === 'expense' && t.targetId === b.id
    );
    const totalExpense = expenseTransactions.reduce((sum, t) => 
      sum + parseRupiah(t.amount), 0
    );
    const available = parseRupiah(b.limit) - totalExpense;
    return acc + available;
  }, 0);
  const totalNetWorth = walletTotal + budgetTotal;

  // Role-based access control
  const userRole = userData?.role || 'user';
  const isReadOnly = userRole === 'user';
  const user = firebaseUser?.email || firebaseUser?.displayName;

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Home
            budgets={budgets}
            wallets={wallets}
            transactions={transactions}
            nominal={nominal}
            setNominal={setNominal}
            description={description}
            setDescription={setDescription}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            transactionDate={transactionDate}
            setTransactionDate={setTransactionDate}
            transactionType={transactionType}
            setTransactionType={setTransactionType}
            showTargetModal={showTargetModal}
            setShowTargetModal={setShowTargetModal}
            loading={loading}
            user={user}
            setLoading={setLoading}
            showToast={showToast}
            showConfirm={showConfirm}
            isReadOnly={isReadOnly}
          />
        );
      case 'activity':
        return (
          <Activity
            transactions={transactions}
            wallets={wallets}
            budgets={budgets}
            handleDeleteTransaction={handleDeleteTransaction}
            showToast={showToast}
            showConfirm={showConfirm}
            setLoading={setLoading}
            isReadOnly={isReadOnly}
          />
        );
      case 'manage':
        return (
          <Manage
            wallets={wallets}
            budgets={budgets}
            transactions={transactions}
            showBalance={showBalance}
            setShowBalance={setShowBalance}
            totalNetWorth={totalNetWorth}
            setShowModal={setShowModal}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
            loading={loading}
            showToast={showToast}
            showConfirm={showConfirm}
            isReadOnly={isReadOnly}
            setEditingData={setEditingData}
          />
        );
      case 'settings':
        return (
          <Settings
            wallets={wallets}
            budgets={budgets}
            transactions={transactions}
            setLoading={setLoading}
            loading={loading}
            user={user}
            userData={userData}
            userRole={userRole}
            setUser={setFirebaseUser}
            showToast={showToast}
            showConfirm={showConfirm}
            onLogout={handleLogout}
            onForceRefresh={async () => {
              try {
                setLoading(true);
                showToast('🔄 Memuat ulang dari server...', 'info');
                const [wSnap, bSnap, tSnap] = await Promise.all([
                  getDocsFromServer(query(collection(db, 'wallets'), orderBy('createdAt'))),
                  getDocsFromServer(query(collection(db, 'budgets'), orderBy('createdAt'))),
                  getDocsFromServer(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')))
                ]);
                setWallets(wSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setBudgets(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setTransactions(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                showToast('✓ Data diperbarui dari server', 'success');
              } catch (e) {
                showToast(e.message || 'Gagal force refresh', 'error');
              }
              setLoading(false);
            }}
          />
        );
      default:
        return null;
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen w-full max-w-none mx-auto font-sans flex flex-col items-center justify-center transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show LogIn login
  if (!firebaseUser) {
    return (
      <div className="min-h-screen w-full max-w-none mx-auto font-sans flex flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-[env(safe-area-inset-bottom)]">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">💰 Agus Finance</h1>
            </div>
            
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Sedang login...' : 'Login dengan Google'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - show app
  return (
    <div className="min-h-screen w-full max-w-none mx-auto relative font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={() => {
            confirm.resolve(true);
            setConfirm(null);
          }}
          onCancel={() => {
            confirm.resolve(false);
            setConfirm(null);
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowLogoutModal(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👋</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Logout?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Anda yakin ingin keluar dari aplikasi?</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 dark:hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors"
              >
                {loading ? '⏳ Logout...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        wallets={wallets}
        budgets={budgets}
        transactions={transactions}
        transferData={transferData}
        setTransferData={setTransferData}
        newData={newData}
        setNewData={setNewData}
        loading={loading}
        handleTransfer={handleTransfer}
        handleCreate={handleCreate}
        handleEdit={handleEdit}
        user={user}
        setLoading={setLoading}
        showToast={showToast}
        showConfirm={showConfirm}
        editingData={editingData}
        setEditingData={setEditingData}
      />

      <Header user={user} userPhoto={firebaseUser?.photoURL} onLogout={() => setShowLogoutModal(true)} />

      <main className="flex-1 pt-24 px-1.5 sm:px-3 pb-20 overflow-y-auto">{renderContent()}</main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
