import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Home as HomeIcon } from 'lucide-react';
import { Home } from './pages/Home';
import { Activity } from './pages/Activity';
import { Manage } from './pages/Manage';
import { Settings } from './pages/Settings';
import { BottomNav } from './components/BottomNav';
import { Modal } from './components/Modal';
import { Header } from './components/Header';
import { Toast, ConfirmDialog } from './components/Toast';
import { useTransactions } from './hooks/useTransactions';
import { useDeveloperMode } from './hooks/useDeveloperMode';
import { useTheme } from './context/ThemeContext';
import { formatRupiah, parseRupiah } from './utils/formatter';

const MAGIC_CODES = {
  andanupurwo: 'Purwo',
  ashrinurhida: 'Ashri',
  demo: 'Demo'
};

export default function App() {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'home');
  const [user, setUser] = useState(() => localStorage.getItem('appUser') || null);
  const [magicCode, setMagicCode] = useState('');
  const [demoEnabled, setDemoEnabled] = useState(() => localStorage.getItem('demoEnabled') !== 'false');
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
      showToast('Masukkan kode sakti', 'error');
      return;
    }
    const found = MAGIC_CODES[trimmed];
    if (!found) {
      showToast('Kode sakti salah', 'error');
      return;
    }
    if (trimmed === 'demo' && !demoEnabled) {
      showToast('Kode sakti demo dinonaktifkan', 'error');
      return;
    }
    setUser(found);
    setMagicCode('');
    showToast(`Halo ${found}!`, 'success');
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

  useEffect(() => {
    localStorage.setItem('demoEnabled', demoEnabled);
  }, [demoEnabled]);

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
  
  const { monthlyRollover } = useDeveloperMode(showToast, showConfirm);

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

  // 2. AUTO ROLLOVER CHECK
  useEffect(() => {
    if (wallets.length === 0 || budgets.length === 0) return;
    
    const checkAndRollover = async () => {
      const lastRollover = localStorage.getItem('lastRolloverDate');
      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      // Jika belum pernah rollover atau bulan berbeda
      if (!lastRollover || !lastRollover.startsWith(currentMonth)) {
        // Cek apakah ada sisa budget
        const totalSisa = budgets.reduce((acc, b) => acc + parseRupiah(b.amount), 0);
        
        if (totalSisa > 0) {
          // Auto rollover tanpa konfirmasi
          setLoading(true);
          await monthlyRollover(wallets, budgets, transactions, user, setLoading, true);
          showToast(`🔄 Auto Rollover: Rp ${formatRupiah(totalSisa)} dari budget bulan lalu dikembalikan ke wallet`, 'info');
        }
        
        // Update last rollover date
        localStorage.setItem('lastRolloverDate', today.toISOString());
      }
    };
    
    checkAndRollover();
  }, [wallets, budgets]);

  const totalNetWorth = [...wallets, ...budgets].reduce((acc, item) => acc + parseRupiah(item.amount), 0);

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
            isReadOnly={user === 'Demo'}
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
            isReadOnly={user === 'Demo'}
          />
        );
      case 'manage':
        return (
          <Manage
            wallets={wallets}
            budgets={budgets}
            showBalance={showBalance}
            setShowBalance={setShowBalance}
            totalNetWorth={totalNetWorth}
            setShowModal={setShowModal}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
            loading={loading}
            showToast={showToast}
            showConfirm={showConfirm}
            isReadOnly={user === 'Demo'}
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
            showToast={showToast}
            showConfirm={showConfirm}
            demoEnabled={demoEnabled}
            setDemoEnabled={setDemoEnabled}
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
              <p className="text-xs text-slate-600 dark:text-slate-400">Masukkan kode sakti untuk lanjut.</p>
              <input
                type="password"
                value={magicCode}
                onChange={(e) => setMagicCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicLogin()}
                placeholder="Kode sakti"
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
