import React, { useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, Calendar, Trash2, Download, Edit2, X } from 'lucide-react';
import { exportToExcel } from '../utils/exportExcel';
import { useTransactions } from '../hooks/useTransactions';
import { getMonthRange } from '../utils/formatter';

export const Activity = ({ transactions, wallets, budgets, handleDeleteTransaction, showToast, showConfirm, setLoading, isReadOnly }) => {
  const { handleEditTransaction, handleNominalInput } = useTransactions(showToast, showConfirm);
  
  // Get current month as default
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [filterType, setFilterType] = useState('all'); // all, income, expense, transfer
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editData, setEditData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      if (t.date) {
        const month = t.date.substring(0, 7); // YYYY-MM
        months.add(month);
      } else if (t.createdAt) {
        // Fallback to createdAt if date not available
        const date = new Date(t.createdAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
      }
    });
    
    // Sort months descending (newest first)
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filter transactions by selected month and type
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filter by month
      let matchMonth = false;
      if (t.date) {
        matchMonth = t.date.startsWith(selectedMonth);
      } else if (t.createdAt) {
        const date = new Date(t.createdAt);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        matchMonth = month === selectedMonth;
      }
      
      // Filter by type
      let matchType = filterType === 'all' || t.type === filterType;
      
      // Filter by search query
      const query = searchQuery.toLowerCase();
      const matchSearch = !query || 
        t.title.toLowerCase().includes(query) || 
        t.target.toLowerCase().includes(query) ||
        t.user.toLowerCase().includes(query);
      
      return matchMonth && matchType && matchSearch;
    });
  }, [transactions, selectedMonth, filterType, searchQuery]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const grouped = {};
    filteredTransactions.forEach(t => {
      const date = t.date || new Date(t.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(t);
    });
    
    // Sort dates descending and sort transactions within each date
    return Object.keys(grouped)
      .sort()
      .reverse()
      .map(date => ({
        date,
        transactions: grouped[date].sort((a, b) => b.createdAt - a.createdAt)
      }));
  }, [filteredTransactions]);

  // Format month for display
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Hari Ini';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Kemarin';
    } else {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20 px-1.5">
       <div className="flex items-center justify-between gap-3">
         <h2 className="text-xl font-bold text-slate-900 dark:text-white">Riwayat</h2>
         <div className="flex items-center gap-2">
           {filteredTransactions.length > 0 && (
             <button
               onClick={() => exportToExcel(filteredTransactions, selectedMonth, filterType)}
               className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
             >
               <Download size={14} />
               <span className="hidden sm:inline">Excel</span>
             </button>
           )}
           <div className="relative">
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="appearance-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm px-4 py-2 pr-10 rounded-xl font-medium focus:border-blue-500 dark:focus:border-blue-400 outline-none cursor-pointer transition-colors duration-300"
             >
               {availableMonths.map(month => (
                 <option key={month} value={month}>{formatMonth(month)}</option>
               ))}
             </select>
             <Calendar size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none" />
           </div>
         </div>
       </div>

       {/* SEARCH BOX */}
       <div>
         <input
           type="text"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           placeholder="Cari transaksi (deskripsi, target, user)..."
           className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300"
         />
       </div>

       {/* FILTER BY TYPE */}
       <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
         <button 
           onClick={() => setFilterType('all')}
           className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'}`}
         >
           Semua
         </button>
         <button 
           onClick={() => setFilterType('income')}
           className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'}`}
         >
           Pemasukan
         </button>
         <button 
           onClick={() => setFilterType('expense')}
           className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === 'expense' ? 'bg-red-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'}`}
         >
           Pengeluaran
         </button>
         <button 
           onClick={() => setFilterType('transfer')}
           className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filterType === 'transfer' ? 'bg-purple-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'}`}
         >
           Transfer
         </button>
       </div>
       
       {groupedTransactions.length === 0 ? (
         <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900/40 transition-colors duration-300">
           Tidak ada transaksi {filterType !== 'all' && `${filterType === 'income' ? 'pemasukan' : filterType === 'expense' ? 'pengeluaran' : 'transfer'}`} di {formatMonth(selectedMonth)}
         </div>
       ) : (
         <div className="space-y-4">
           {groupedTransactions.map((group) => (
             <div key={group.date} className="space-y-2">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{formatDate(group.date)}</h3>
                 <span className="text-[10px] text-slate-500 dark:text-slate-500">{group.transactions.length} transaksi</span>
               </div>
               
               <div className="space-y-2">
                 {group.transactions.map((t) => (
                   <div key={t.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/80 transition-colors duration-300">
                     <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-500' : t.type === 'expense' ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-500' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-500'}`}>
                       {t.type === 'income' ? <ArrowDownRight size={16}/> : t.type === 'expense' ? <ArrowUpRight size={16}/> : <ArrowRightLeft size={16}/>}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-2">
                         <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.title}</h4>
                         <span className={`font-bold text-sm flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : t.type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                           {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Rp {t.amount}
                         </span>
                       </div>
                       <div className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-500">
                         <span className="truncate">{t.target}</span>
                         <span>•</span>
                         <span>{t.time}</span>
                         <span>•</span>
                         <span>{t.user}</span>
                       </div>
                     </div>
                     <div className="flex gap-1 flex-shrink-0">
                       <button
                         onClick={() => {
                           setEditingTransaction(t);
                           setEditData({
                             nominal: t.amount,
                             description: t.title,
                             transactionDate: t.date,
                             selectedTarget: t.targetId,
                             targetName: t.target
                           });
                         }}
                         className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors duration-300"
                         aria-label="Edit transaksi"
                         disabled={isReadOnly}
                       >
                         <Edit2 size={16} className={isReadOnly ? 'opacity-30' : ''} />
                       </button>
                       <button
                         onClick={() => handleDeleteTransaction(t, wallets, budgets)}
                         className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors duration-300"
                         aria-label="Hapus transaksi"
                         disabled={isReadOnly}
                       >
                         <Trash2 size={16} className={isReadOnly ? 'opacity-30' : ''} />
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           ))}
         </div>
       )}

       {/* EDIT MODAL */}
       {editingTransaction && editData && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setEditingTransaction(null)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Transaksi</h3>
               <button onClick={() => setEditingTransaction(null)}><X size={20} className="text-slate-500 dark:text-slate-400" /></button>
             </div>

             <div className="space-y-4">
               {/* Nominal */}
               <div>
                 <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Nominal</label>
                 <div className="flex items-end gap-2 border-b border-slate-300 dark:border-slate-700 pb-2 transition-colors duration-300">
                   <span className="text-xl font-bold text-slate-600 dark:text-slate-400">Rp</span>
                   <input 
                     type="text" 
                     inputMode="numeric"
                     value={editData.nominal} 
                     onChange={(e) => handleNominalInput(e, val => setEditData({...editData, nominal: val}))} 
                     placeholder="0" 
                     className="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 outline-none" 
                   />
                 </div>
               </div>

               {/* Description */}
               <div>
                 <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Keterangan</label>
                 <input 
                   type="text" 
                   value={editData.description} 
                   onChange={(e) => setEditData({...editData, description: e.target.value})} 
                   placeholder="Keterangan" 
                   className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" 
                 />
               </div>

               {/* Action Buttons */}
               <div className="flex gap-2 pt-2">
                 <button 
                   onClick={() => setEditingTransaction(null)}
                   className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-all duration-300"
                 >
                   Batal
                 </button>
                 <button 
                   onClick={() => {
                     handleEditTransaction(editingTransaction, editData, wallets, budgets, setLoading);
                     setEditingTransaction(null);
                   }}
                   disabled={!editData.nominal}
                   className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                 >
                   Simpan
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};
