import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, getDocsFromServer } from 'firebase/firestore';
import { Home as HomeIcon } from 'lucide-react';
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
import { verifyPin, setPinData } from './utils/pinManager';

const MAGIC_CODES = {
  '081111': 'Purwo',
  '140222': 'Ashri'
};

export default function App() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'home');
  const [user, setUser] = useState(() => localStorage.getItem('appUser') || null);
  const [magicCode, setMagicCode] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);

  // Check if URL has ?clear=1 to trigger cache clear
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clear') === '1') {
      // Full cache clear then reload
      (async () => {
        await cacheManager.clearAllCache();
        window.location.href = '/';
      })();
    }
  }, []);

  // Listen for PIN change events (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'PIN_CHANGED_EVENT' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          // If PIN changed for a different user, logout current user
          if (event.user !== user) {
            showToast(`🔐 PIN telah diubah oleh ${event.user}. Anda akan logout.`, 'warning');
            setTimeout(() => {
              setUser(null);
              setMagicCode('');
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to parse PIN_CHANGED_EVENT', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

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
  const [transactionType, setTransactionType] = useState(null); // 'income' | 'expense'
  const [showTargetModal, setShowTargetModal] = useState(false);

  // --- MODAL STATE (MANAGE) ---
  const [showModal, setShowModal] = useState(null);
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });
  const [newData, setNewData] = useState({ name: '', limit: '', description: '' });
  const [editingData, setEditingData] = useState({ id: null, type: null, name: '', description: '' });

  // --- NOTIFICATION STATE ---
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const showConfirm = (message) => {
    return new Promise((resolve) => {
      setConfirm({ message, resolve });
    });
  };

  const handleMagicLogin = () => {
    const trimmed = magicCode.trim().toLowerCase();
    if (!trimmed) {
      showToast('Masukkan PIN', 'error');
      return;
    }
    
    // First, check if it's a MAGIC CODE (username identifier like '081111')
    const foundUser = MAGIC_CODES[trimmed];
    if (foundUser) {
      // Login dengan magic code - backward compatible
      setUser(foundUser);
      setMagicCode('');
      
      // Setup default PIN jika belum ada (untuk fitur ganti PIN nanti)
      try {
        const pinData = localStorage.getItem(`pin_${foundUser}`);
        if (!pinData) {
          setPinData(foundUser, '000000'); // Default PIN untuk pertama kali
        }
      } catch (e) {
        console.error('PIN setup error:', e);
      }
      
      showToast(`Halo ${foundUser}!`, 'success');
      return;
    }
    
    // If not a magic code, try as custom PIN for users who changed their PIN
    for (const [code, username] of Object.entries(MAGIC_CODES)) {
      const result = verifyPin(username, trimmed);
      if (result.success) {
        setUser(username);
        setMagicCode('');
        showToast(`Halo ${username}!`, 'success');
        return;
      } else if (result.message.includes('terkunci')) {
        showToast(result.message, 'error');
        return;
      }
    }
    
    showToast('PIN salah', 'error');
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('appUser', user);
    } else {
      localStorage.removeItem('appUser');
    }
  }, [user]);

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

  // 2. ROLLOVER REMINDER (non-auto)
  useEffect(() => {
    if (wallets.length === 0 || budgets.length === 0) return;
    const today = new Date();
    const isFirstOfMonth = today.getDate() === 1;
    if (!isFirstOfMonth) return;

    // Reminder ringan di awal bulan
    showToast('🔔 Awal bulan: periksa sisa budget dan set ulang limit secara manual.', 'info');
  }, [wallets, budgets]);

  // Hitung Total Uang = Total Wallet + Total Budget yang Tersedia
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
            isReadOnly={false}
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
            isReadOnly={false}
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
            isReadOnly={false}
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
            setUser={setUser}
            showToast={showToast}
            showConfirm={showConfirm}
            onForceRefresh={async () => {
              try {
                setLoading(true);
                showToast('🔄 Memuat ulang dari server...', 'info');
                const [wSnap, bSnap, tSnap] = await Promise.all([
                  getDocsFromServer(query(collection(db, 'wallets'), orderBy('createdAt'))),
                  getDocsFromServer(query(collection(db, 'budgets'), orderBy('createdAt'))),
                  getDocsFromServer(query(collection(db, 'transactions'), orderBy('createdAt', 'desc')))
                ]);
                const freshWallets = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const freshBudgets = bSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                const freshTransactions = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setWallets(freshWallets);
                setBudgets(freshBudgets);
                setTransactions(freshTransactions);
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

  if (!user) {
    return (
      <div className="min-h-screen w-full max-w-none mx-auto font-sans flex flex-col transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
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
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-[env(safe-area-inset-bottom)]">
            <div className="w-full max-w-sm space-y-4">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Masuk Cepat</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Masukkan PIN untuk lanjut.</p>
              <input
                type="password"
                value={magicCode}
                onChange={(e) => setMagicCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicLogin()}
                placeholder="PIN"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300"
              />
              <button
                onClick={handleMagicLogin}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-600/40 dark:shadow-blue-900/40 active:scale-95 transition-all"
              >
                Masuk
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-none mx-auto relative font-sans transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* CONFIRM DIALOG */}
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

      {/* MODAL */}
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

      {/* HEADER with Date */}
      <Header user={user} setUser={setUser} />

      <main className="flex-1 pt-24 px-1.5 sm:px-3 pb-20 overflow-y-auto">{renderContent()}</main>

      {/* BOTTOM NAV */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
