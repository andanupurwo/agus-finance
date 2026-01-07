import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  doc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { 
  Home, History, Wallet, Settings, 
  ArrowDownCircle, ArrowUpCircle, 
  ArrowRightLeft, Plus, X,
  ArrowUpRight, ArrowDownRight, Clock, 
  Eye, EyeOff, PieChart, CheckCircle, Trash2,
  Database, AlertTriangle, Package, RefreshCw
} from 'lucide-react';

// --- UTILITY ---
const formatRupiah = (num) => new Intl.NumberFormat('id-ID').format(num);
const parseRupiah = (str) => parseInt(str.replace(/\./g, '')) || 0;

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState('S'); 
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- DATA STATE ---
  const [wallets, setWallets] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // --- FORM STATE (HOME) ---
  const [nominal, setNominal] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTarget, setSelectedTarget] = useState(''); // ID Wallet/Budget tujuan

  // --- MODAL STATE (MANAGE) ---
  const [showModal, setShowModal] = useState(null); // 'transfer', 'addWallet', 'addBudget'
  const [transferData, setTransferData] = useState({ fromId: '', toId: '', amount: '' });
  const [newData, setNewData] = useState({ name: '', limit: '' });

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

  // 2. LOGIKA TRANSAKSI HARIAN (HOME)
  const handleDailyTransaction = async (type) => {
    if (!nominal || !selectedTarget) return alert("Nominal dan Tujuan harus diisi!");
    setLoading(true);
    const amountVal = parseRupiah(nominal);
    const timeNow = new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});

    try {
      let targetName = '';

      if (type === 'income') {
        // INCOME: Masuk ke WALLET
        const targetWallet = wallets.find(w => w.id === selectedTarget);
        targetName = targetWallet.name;
        const newBalance = parseRupiah(targetWallet.amount) + amountVal;
        await updateDoc(doc(db, "wallets", selectedTarget), { amount: formatRupiah(newBalance) });
      } else {
        // EXPENSE: Keluar dari BUDGET
        const targetBudget = budgets.find(b => b.id === selectedTarget);
        targetName = targetBudget.name;
        const newAmount = parseRupiah(targetBudget.amount) - amountVal; // Sisa budget berkurang
        if (newAmount < 0) {
            if(!confirm("Budget tidak cukup! Tetap lanjutkan (jadi minus)?")) { setLoading(false); return; }
        }
        await updateDoc(doc(db, "budgets", selectedTarget), { amount: formatRupiah(newAmount) });
      }

      // Catat History
      await addDoc(collection(db, "transactions"), {
        title: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        amount: nominal,
        type: type,
        user: user === 'S' ? 'Purwo' : 'Ashri',
        time: timeNow,
        target: targetName,
        createdAt: Date.now()
      });

      setNominal(''); setDescription(''); setSelectedTarget('');
      alert("Transaksi Berhasil!");
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  // 3. LOGIKA TRANSFER / ALOKASI (MANAGE)
  const handleTransfer = async () => {
    const { fromId, toId, amount } = transferData;
    if (!fromId || !toId || !amount) return alert("Data transfer belum lengkap!");
    setLoading(true);

    const amountVal = parseRupiah(amount);
    
    try {
      // Cek Sumber (Bisa Wallet atau Budget)
      let sourceRef, sourceData, sourceCollection;
      const isSourceWallet = wallets.find(w => w.id === fromId);
      
      if (isSourceWallet) {
        sourceCollection = "wallets";
        sourceData = isSourceWallet;
      } else {
        sourceCollection = "budgets";
        sourceData = budgets.find(b => b.id === fromId);
      }
      
      // Cek Saldo Sumber
      const currentSourceAmount = parseRupiah(sourceData.amount);
      if (currentSourceAmount < amountVal) { setLoading(false); return alert("Saldo sumber tidak cukup!"); }

      // Cek Tujuan (Bisa Wallet atau Budget)
      let destRef, destData, destCollection;
      const isDestWallet = wallets.find(w => w.id === toId);

      if (isDestWallet) {
        destCollection = "wallets";
        destData = isDestWallet;
      } else {
        destCollection = "budgets";
        destData = budgets.find(b => b.id === toId);
      }

      // EKSEKUSI TRANSFER
      // 1. Kurangi Sumber
      await updateDoc(doc(db, sourceCollection, fromId), { amount: formatRupiah(currentSourceAmount - amountVal) });
      // 2. Tambah Tujuan
      await updateDoc(doc(db, destCollection, toId), { amount: formatRupiah(parseRupiah(destData.amount) + amountVal) });
      
      // 3. Catat History
      await addDoc(collection(db, "transactions"), {
        title: "Alokasi Dana",
        amount: amount,
        type: 'transfer',
        user: user === 'S' ? 'Purwo' : 'Ashri',
        time: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
        target: `${sourceData.name} -> ${destData.name}`,
        createdAt: Date.now()
      });

      setShowModal(null); setTransferData({ fromId: '', toId: '', amount: '' });
      alert("Alokasi Berhasil!");
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  // 4. LOGIKA TAMBAH WALLET/BUDGET
  const handleCreate = async () => {
    if (!newData.name) return alert("Nama harus diisi!");
    setLoading(true);
    try {
        if (showModal === 'addWallet') {
            await addDoc(collection(db, "wallets"), {
                name: newData.name,
                amount: '0', // Mulai dari 0 sesuai konsep Hulu-Hilir
                type: 'Rekening',
                color: 'from-slate-800 to-slate-900 border-slate-700',
                createdAt: Date.now()
            });
        } else {
            await addDoc(collection(db, "budgets"), {
                name: newData.name,
                amount: '0', // Saldo awal 0, nunggu dialokasikan
                limit: newData.limit ? formatRupiah(parseRupiah(newData.limit)) : '0', // Target limit
                color: 'bg-slate-800 text-slate-200 border border-slate-700',
                bar: 'bg-blue-500',
                createdAt: Date.now()
            });
        }
        setShowModal(null); setNewData({name: '', limit: ''});
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  const handleDelete = async (collectionName, id) => {
      if(!confirm("Hapus item ini? Saldo di dalamnya akan hilang.")) return;
      await deleteDoc(doc(db, collectionName, id));
  }

  // --- DEVELOPER MODE FUNCTIONS ---
  const loadDummyData = async () => {
    if(!confirm("Load dummy data untuk testing? Ini akan menambahkan data contoh.")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Dummy Wallets
      const wallet1Ref = doc(collection(db, "wallets"));
      batch.set(wallet1Ref, {
        name: "Bank BCA",
        amount: formatRupiah(15000000),
        type: "Rekening",
        color: "from-blue-800 to-blue-900 border-blue-700",
        createdAt: Date.now() - 10000
      });
      
      const wallet2Ref = doc(collection(db, "wallets"));
      batch.set(wallet2Ref, {
        name: "Dompet Cash",
        amount: formatRupiah(500000),
        type: "Cash",
        color: "from-emerald-800 to-emerald-900 border-emerald-700",
        createdAt: Date.now() - 9000
      });

      // Dummy Budgets
      const budget1Ref = doc(collection(db, "budgets"));
      batch.set(budget1Ref, {
        name: "Makan & Minum",
        amount: formatRupiah(1500000),
        limit: formatRupiah(2000000),
        color: "bg-orange-900 text-orange-200 border border-orange-800",
        bar: "bg-orange-500",
        createdAt: Date.now() - 8000
      });

      const budget2Ref = doc(collection(db, "budgets"));
      batch.set(budget2Ref, {
        name: "Transport",
        amount: formatRupiah(800000),
        limit: formatRupiah(1000000),
        color: "bg-blue-900 text-blue-200 border border-blue-800",
        bar: "bg-blue-500",
        createdAt: Date.now() - 7000
      });

      const budget3Ref = doc(collection(db, "budgets"));
      batch.set(budget3Ref, {
        name: "Belanja Bulanan",
        amount: formatRupiah(2500000),
        limit: formatRupiah(3000000),
        color: "bg-purple-900 text-purple-200 border border-purple-800",
        bar: "bg-purple-500",
        createdAt: Date.now() - 6000
      });

      // Dummy Transactions
      const trans1Ref = doc(collection(db, "transactions"));
      batch.set(trans1Ref, {
        title: "Gaji Bulan Ini",
        amount: formatRupiah(10000000),
        type: "income",
        user: "Purwo",
        time: "09:00",
        target: "Bank BCA",
        createdAt: Date.now() - 5000
      });

      const trans2Ref = doc(collection(db, "transactions"));
      batch.set(trans2Ref, {
        title: "Beli Bensin",
        amount: formatRupiah(150000),
        type: "expense",
        user: "Ashri",
        time: "14:30",
        target: "Transport",
        createdAt: Date.now() - 4000
      });

      const trans3Ref = doc(collection(db, "transactions"));
      batch.set(trans3Ref, {
        title: "Makan Siang",
        amount: formatRupiah(50000),
        type: "expense",
        user: "Purwo",
        time: "12:15",
        target: "Makan & Minum",
        createdAt: Date.now() - 3000
      });

      await batch.commit();
      alert("✅ Dummy data berhasil ditambahkan!");
    } catch (e) { 
      alert("Error: " + e.message); 
    }
    setLoading(false);
  }

  const loadDefaultCategories = async () => {
    if(!confirm("Load kategori default untuk Wallet dan Budget?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Default Wallets
      const defaultWallets = [
        { name: "Rekening Utama", color: "from-slate-800 to-slate-900 border-slate-700" },
        { name: "Tabungan", color: "from-green-800 to-green-900 border-green-700" },
        { name: "E-Wallet", color: "from-purple-800 to-purple-900 border-purple-700" }
      ];

      defaultWallets.forEach((w, idx) => {
        const ref = doc(collection(db, "wallets"));
        batch.set(ref, {
          ...w,
          amount: "0",
          type: "Rekening",
          createdAt: Date.now() + idx
        });
      });

      // Default Budgets
      const defaultBudgets = [
        { name: "Makan", limit: "2000000", color: "bg-red-900 text-red-200 border border-red-800", bar: "bg-red-500" },
        { name: "Transport", limit: "1000000", color: "bg-blue-900 text-blue-200 border border-blue-800", bar: "bg-blue-500" },
        { name: "Hiburan", limit: "500000", color: "bg-purple-900 text-purple-200 border border-purple-800", bar: "bg-purple-500" },
        { name: "Belanja", limit: "3000000", color: "bg-orange-900 text-orange-200 border border-orange-800", bar: "bg-orange-500" },
        { name: "Kesehatan", limit: "1500000", color: "bg-green-900 text-green-200 border border-green-800", bar: "bg-green-500" }
      ];

      defaultBudgets.forEach((b, idx) => {
        const ref = doc(collection(db, "budgets"));
        batch.set(ref, {
          ...b,
          amount: "0",
          createdAt: Date.now() + idx + 100
        });
      });

      await batch.commit();
      alert("✅ Kategori default berhasil ditambahkan!");
    } catch (e) { 
      alert("Error: " + e.message); 
    }
    setLoading(false);
  }

  const resetFactory = async () => {
    if(!confirm("⚠️ RESET PABRIK: Semua data akan dihapus permanen! Lanjutkan?")) return;
    if(!confirm("Yakin? Ini tidak bisa dibatalkan!")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Hapus semua wallets
      wallets.forEach(w => {
        batch.delete(doc(db, "wallets", w.id));
      });
      
      // Hapus semua budgets
      budgets.forEach(b => {
        batch.delete(doc(db, "budgets", b.id));
      });
      
      // Hapus semua transactions
      transactions.forEach(t => {
        batch.delete(doc(db, "transactions", t.id));
      });
      
      await batch.commit();
      alert("✅ Reset pabrik berhasil! Semua data telah dihapus.");
    } catch (e) { 
      alert("Error: " + e.message); 
    }
    setLoading(false);
  }

  // --- UI HELPER ---
  const handleNominalInput = (e, setter) => {
    const raw = e.target.value.replace(/\D/g, '');
    setter(raw ? formatRupiah(raw) : '');
  };

  const totalNetWorth = [...wallets, ...budgets].reduce((acc, item) => acc + parseRupiah(item.amount), 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2">
            {/* BUDGET LIST (HORIZONTAL) */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <h2 className="text-lg font-bold text-white">Budgets Aktif</h2>
                <span className="text-xs text-slate-500">Geser &rarr;</span>
              </div>
              {budgets.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">Belum ada budget. Buat di menu Manage.</div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                  {budgets.map((b) => (
                    <div key={b.id} className={`min-w-[160px] p-4 rounded-2xl backdrop-blur-sm snap-center flex flex-col justify-between h-28 ${b.color}`}>
                      <span className="text-xs font-bold opacity-80 truncate">{b.name}</span>
                      <span className="text-xl font-bold tracking-tight">Rp {b.amount}</span>
                      <div className="w-full bg-black/20 h-1.5 rounded-full mt-2">
                         <div className={`h-full rounded-full opacity-80 ${b.bar}`} style={{width: `${Math.min(100, (parseRupiah(b.amount)/parseRupiah(b.limit))*100)}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INPUT TRANSAKSI HARIAN */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
              <div className="mb-6">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nominal Transaksi</label>
                <div className="flex items-end gap-2 border-b border-slate-700 pb-2">
                  <span className="text-2xl font-bold text-slate-500 mb-1">Rp</span>
                  <input type="text" inputMode="numeric" value={nominal} onChange={(e) => handleNominalInput(e, setNominal)} placeholder="0" className="w-full bg-transparent text-5xl font-bold text-white placeholder-slate-800 outline-none" />
                </div>
              </div>

              <div className="mb-6">
                 <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Keterangan (mis: Beli Bensin)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none mb-3" />
                 
                 {/* TARGET SELECTOR - KUNCI HULU HILIR */}
                 <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none">
                     <option value="">-- Pilih Sumber / Tujuan --</option>
                     <optgroup label="Untuk Pemasukan (Pilih Wallet)">
                        {wallets.map(w => <option key={w.id} value={w.id}>Ke: {w.name}</option>)}
                     </optgroup>
                     <optgroup label="Untuk Pengeluaran (Pilih Budget)">
                        {budgets.map(b => <option key={b.id} value={b.id}>Dari: {b.name} (Sisa: {b.amount})</option>)}
                     </optgroup>
                 </select>
              </div>

              <div className="flex gap-3">
                <button onClick={() => handleDailyTransaction('income')} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                   <ArrowDownCircle size={20} /> <span>Masuk (Gaji)</span>
                </button>
                <button onClick={() => handleDailyTransaction('expense')} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-500 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50">
                   <ArrowUpCircle size={20} /> <span>Keluar (Jajan)</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'manage':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2">
            {/* TOTAL WEALTH */}
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">Total Uang (Wallet + Sisa Budget)</p>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Rp {showBalance ? formatRupiah(totalNetWorth) : '••••••••'}</h1>
                <button onClick={() => setShowBalance(!showBalance)}><EyeOff size={18} className="text-slate-500"/></button>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowModal('transfer')} className="col-span-2 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2">
                    <ArrowRightLeft size={18}/> Alokasi / Pindah Dana
                </button>
            </div>

            {/* WALLETS SECTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Wallets (Hulu)</h2>
                <button onClick={() => setShowModal('addWallet')} className="p-1.5 bg-slate-800 rounded-lg text-white border border-slate-700"><Plus size={16}/></button>
              </div>
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
                {wallets.map((w) => (
                  <div key={w.id} className={`relative snap-center flex-shrink-0 w-64 h-40 rounded-3xl bg-gradient-to-br ${w.color} p-5 text-white shadow-xl border overflow-hidden`}>
                    <div className="flex flex-col justify-between h-full relative z-10">
                      <div className="flex justify-between">
                          <Wallet size={24} />
                          <button onClick={() => handleDelete("wallets", w.id)}><Trash2 size={16} className="opacity-50 hover:opacity-100"/></button>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/80 mb-1">{w.name}</p>
                        <p className="text-2xl font-bold tracking-wider">Rp {w.amount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BUDGETS SECTION */}
            <div>
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Budgets (Hilir)</h2>
                  <button onClick={() => setShowModal('addBudget')} className="p-1.5 bg-slate-800 rounded-lg text-white border border-slate-700"><Plus size={16}/></button>
               </div>
               <div className="space-y-3">
                 {budgets.map((b) => (
                   <div key={b.id} className="relative p-4 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-slate-200 text-sm">{b.name}</h4>
                          <div className="flex gap-3">
                              <span className="text-xs font-bold text-blue-400">Sisa: Rp {b.amount}</span>
                              <button onClick={() => handleDelete("budgets", b.id)}><Trash2 size={14} className="text-red-900 hover:text-red-500"/></button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mb-1">
                           <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, (parseRupiah(b.amount)/parseRupiah(b.limit))*100)}%` }}></div>
                        </div>
                        <div className="text-[10px] text-slate-500 text-right">Target Limit: Rp {b.limit}</div>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2">
             <h2 className="text-xl font-bold text-white">Riwayat Transaksi</h2>
             {transactions.map((t) => (
                <div key={t.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-900 text-emerald-500' : t.type === 'expense' ? 'bg-red-900 text-red-500' : 'bg-blue-900 text-blue-500'}`}>
                      {t.type === 'income' ? <ArrowDownRight size={18}/> : t.type === 'expense' ? <ArrowUpRight size={18}/> : <ArrowRightLeft size={18}/>}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{t.title}</h4>
                      <p className="text-[10px] text-slate-500">{t.target} • {t.time} • {t.user}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : t.type === 'expense' ? 'text-red-400' : 'text-blue-400'}`}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Rp {t.amount}
                  </span>
                </div>
              ))}
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Settings</h2>
              <p className="text-xs text-slate-500">Developer Mode & App Configuration</p>
            </div>

            {/* DEVELOPER MODE SECTION */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Database size={20} className="text-blue-500" />
                <h3 className="font-bold text-white">Developer Mode</h3>
              </div>
              
              <div className="space-y-3">
                {/* Load Dummy Data */}
                <button 
                  onClick={loadDummyData} 
                  disabled={loading}
                  className="w-full bg-blue-900/50 hover:bg-blue-900/70 border border-blue-800 text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Package size={20} className="text-blue-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Load Dummy Data</div>
                    <div className="text-xs text-slate-400">Tambahkan data contoh untuk testing</div>
                  </div>
                </button>

                {/* Load Default Categories */}
                <button 
                  onClick={loadDefaultCategories} 
                  disabled={loading}
                  className="w-full bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-800 text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={20} className="text-emerald-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Load Default Categories</div>
                    <div className="text-xs text-slate-400">Buat kategori Wallet & Budget default</div>
                  </div>
                </button>

                {/* Reset Factory */}
                <button 
                  onClick={resetFactory} 
                  disabled={loading}
                  className="w-full bg-red-900/50 hover:bg-red-900/70 border border-red-800 text-white p-4 rounded-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  <AlertTriangle size={20} className="text-red-400" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Reset Pabrik</div>
                    <div className="text-xs text-slate-400">Hapus semua data (tidak bisa dibatalkan)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* APP INFO */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
              <h3 className="font-bold text-white mb-3">App Info</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Version</span>
                  <span className="text-white font-mono">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Wallets</span>
                  <span className="text-white font-bold">{wallets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Budgets</span>
                  <span className="text-white font-bold">{budgets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Transactions</span>
                  <span className="text-white font-bold">{transactions.length}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen w-full max-w-md mx-auto relative bg-slate-950 text-slate-200 font-sans">
      {/* MODAL TRANSFER / CREATE */}
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-white text-lg">
                    {showModal === 'transfer' ? 'Alokasi / Pindah Dana' : showModal === 'addWallet' ? 'Buat Wallet Baru' : 'Buat Budget Baru'}
                 </h3>
                 <button onClick={() => setShowModal(null)}><X size={20}/></button>
              </div>

              {showModal === 'transfer' ? (
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Dari (Sumber)</label>
                          <select className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm" value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})}>
                              <option value="">Pilih Sumber</option>
                              <optgroup label="Wallets">{wallets.map(w => <option key={w.id} value={w.id}>{w.name} (Rp {w.amount})</option>)}</optgroup>
                              <optgroup label="Budgets">{budgets.map(b => <option key={b.id} value={b.id}>{b.name} (Rp {b.amount})</option>)}</optgroup>
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Ke (Tujuan)</label>
                          <select className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm" value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})}>
                              <option value="">Pilih Tujuan</option>
                              <optgroup label="Wallets">{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</optgroup>
                              <optgroup label="Budgets">{budgets.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-slate-500 block mb-1">Nominal</label>
                          <input type="text" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm font-bold" placeholder="0" value={transferData.amount} onChange={e => handleNominalInput(e, val => setTransferData({...transferData, amount: val}))} />
                      </div>
                      <button onClick={handleTransfer} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white mt-2">Proses Alokasi</button>
                  </div>
              ) : (
                  <div className="space-y-4">
                      <input type="text" placeholder="Nama (mis: Tabungan, Makan)" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm" value={newData.name} onChange={e => setNewData({...newData, name: e.target.value})} />
                      {showModal === 'addBudget' && (
                          <input type="text" placeholder="Target Limit (Rp)" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-sm" value={newData.limit} onChange={e => handleNominalInput(e, val => setNewData({...newData, limit: val}))} />
                      )}
                      <button onClick={handleCreate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white mt-2">Simpan</button>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-6 h-16 flex items-center justify-between max-w-md mx-auto">
        <div><h1 className="text-lg font-bold text-white leading-none">FinPlan.</h1><p className="text-[10px] text-slate-400 font-medium">Hulu ke Hilir</p></div>
        <button onClick={() => setUser(user === 'S' ? 'I' : 'S')} className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10 ${user === 'S' ? 'bg-blue-600' : 'bg-pink-600'}`}>{user}</button>
      </header>
      <main className="pt-24 min-h-screen px-4">{renderContent()}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 pb-safe max-w-md mx-auto">
        <div className="flex justify-around items-center h-20 px-4">
          {['home', 'activity', 'manage', 'settings'].map((tab) => {
             const icons = { home: Home, activity: History, manage: Wallet, settings: Settings };
             const labels = { home: 'Home', activity: 'Activity', manage: 'Manage', settings: 'Settings' };
             const Icon = icons[tab];
             const isActive = activeTab === tab;
             return (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`flex flex-col items-center gap-1 w-16 transition-all duration-300 ${isActive ? 'text-blue-500 -translate-y-1' : 'text-slate-500 hover:text-slate-400'}`}>
                 <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                 <span className={`text-[10px] font-bold ${isActive ? 'text-blue-500' : 'text-slate-500'}`}>{labels[tab]}</span>
               </button>
             )
          })}
        </div>
      </nav>
    </div>
  );
}