import React, { useState } from 'react';
import { Wallet, Plus, EyeOff, Trash2, Edit2 } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import { parseRupiah, formatRupiah } from '../utils/formatter';

export const Manage = ({
  wallets,
  budgets,
  transactions,
  showBalance,
  setShowBalance,
  totalNetWorth,
  setShowModal,
  handleDelete,
  handleEdit,
  loading,
  showToast,
  showConfirm,
  isReadOnly,
  setEditingData
}) => {
  const [orderedWallets, setOrderedWallets] = useState(wallets);
  const [orderedBudgets, setOrderedBudgets] = useState(budgets);
  const [draggedId, setDraggedId] = useState(null);

  // Sync wallets & budgets ke ordered state saat berubah
  React.useEffect(() => {
    setOrderedWallets(wallets);
  }, [wallets]);

  React.useEffect(() => {
    setOrderedBudgets(budgets);
  }, [budgets]);

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropWallets = (e, targetId) => {
    e.preventDefault();
    if (draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIdx = orderedWallets.findIndex(w => w.id === draggedId);
    const targetIdx = orderedWallets.findIndex(w => w.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...orderedWallets];
      [newOrder[draggedIdx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[draggedIdx]];
      setOrderedWallets(newOrder);
      localStorage.setItem('walletOrder', JSON.stringify(newOrder.map(w => w.id)));
    }
    setDraggedId(null);
  };

  const handleDropBudgets = (e, targetId) => {
    e.preventDefault();
    if (draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIdx = orderedBudgets.findIndex(b => b.id === draggedId);
    const targetIdx = orderedBudgets.findIndex(b => b.id === targetId);

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...orderedBudgets];
      [newOrder[draggedIdx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[draggedIdx]];
      setOrderedBudgets(newOrder);
      localStorage.setItem('budgetOrder', JSON.stringify(newOrder.map(b => b.id)));
    }
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-1.5">
      {/* TOTAL WEALTH */}
      <div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Total Uang (Wallet + Sisa Budget)</p>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Rp {showBalance ? formatRupiah(totalNetWorth) : '••••••••'}</h1>
          <button onClick={() => setShowBalance(!showBalance)}><EyeOff size={18} className="text-slate-500 dark:text-slate-500 transition-colors duration-300"/></button>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      {!isReadOnly && (
      <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowModal('transfer')} className="col-span-2 py-3 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 rounded-xl font-bold text-white shadow-lg shadow-blue-600/40 dark:shadow-blue-900/40 flex items-center justify-center gap-2 transition-all">
              <ArrowRightLeft size={18}/> Alokasi / Pindah Dana
          </button>
      </div>
      )}

      {/* WALLETS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Wallet (Dompet)</h2>
          {!isReadOnly && <button onClick={() => setShowModal('addWallet')} className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors duration-300"><Plus size={16}/></button>}
        </div>
        {wallets.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900/40 transition-colors duration-300">Belum ada wallet</div>
        ) : (
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x">
            {orderedWallets.map((w) => {
              // Check if color is hex (new format) or gradient (old format)
              const isHex = w.color && w.color.startsWith('#');
              const walletStyle = isHex ? { backgroundColor: w.color } : {};
              const walletClass = isHex ? '' : `bg-gradient-to-br ${w.color}`;
              
              return (
              <div 
                key={w.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, w.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropWallets(e, w.id)}
                onDragEnd={handleDragEnd}
                className={`relative snap-center flex-shrink-0 w-64 h-40 rounded-3xl ${walletClass} p-5 text-white shadow-xl border overflow-hidden transition-opacity duration-300 cursor-grab active:cursor-grabbing ${draggedId === w.id ? 'opacity-50' : ''}`} 
                style={isHex ? walletStyle : {}}>
                <div className="flex flex-col justify-between h-full relative z-10">
                  <div className="flex justify-between">
                      <Wallet size={24} />
                      {!isReadOnly && <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingData({id: w.id, type: 'wallets', name: w.name, description: w.description || '', color: w.color});
                          setShowModal('editWallet');
                        }}><Edit2 size={16} className="opacity-50 hover:opacity-100"/></button>
                        <button onClick={() => handleDelete("wallets", w.id)}><Trash2 size={16} className="opacity-50 hover:opacity-100"/></button>
                      </div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-0.5">{w.name}</p>
                    {w.description && <p className="text-xs text-white/60 mb-1">{w.description}</p>}
                    <p className="text-2xl font-bold tracking-wider">Rp {w.amount}</p>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* BUDGETS SECTION */}
      <div>
         <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Budget (Anggaran)</h2>
            {!isReadOnly && <button onClick={() => setShowModal('addBudget')} className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors duration-300"><Plus size={16}/></button>}
         </div>
         {budgets.length === 0 ? (
           <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-900/40 transition-colors duration-300">Belum ada budget</div>
         ) : (
           <div className="space-y-3">
             {orderedBudgets.map((b) => {
               // Hitung total pengeluaran dari transaksi yang menargetkan budget ini
               const expenseTransactions = transactions.filter(t => 
                 t.type === 'expense' && t.targetId === b.id
               );
               const totalExpense = expenseTransactions.reduce((sum, t) => 
                 sum + parseRupiah(t.amount), 0
               );
               
               const used = totalExpense; // Terpakai = total semua expense transaksi
               const available = parseRupiah(b.limit) - used; // Tersedia = Limit - Terpakai
               const usagePercent = parseRupiah(b.limit) > 0 ? (used / parseRupiah(b.limit)) * 100 : 0;
               
               // Traffic Light Logic
               let cardColor = "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-sm";
               let barColor = "bg-blue-500 dark:bg-blue-600";
               let textColor = "text-slate-900 dark:text-slate-200";
               let labelColor = "text-slate-600 dark:text-slate-400";
               
               if (usagePercent >= 80) {
                 cardColor = "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 shadow-sm";
                 barColor = "bg-red-500 dark:bg-red-600";
                 textColor = "text-red-900 dark:text-red-200";
                 labelColor = "text-red-700 dark:text-red-300";
               } else if (usagePercent >= 50) {
                 cardColor = "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-800 shadow-sm";
                 barColor = "bg-yellow-500 dark:bg-yellow-600";
                 textColor = "text-yellow-900 dark:text-yellow-200";
                 labelColor = "text-yellow-700 dark:text-yellow-300";
               } else if (usagePercent > 0) {
                 cardColor = "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800 shadow-sm";
                 barColor = "bg-green-500 dark:bg-green-600";
                 textColor = "text-green-900 dark:text-green-200";
                 labelColor = "text-green-700 dark:text-green-300";
               }
               
               return (
                 <div 
                   key={b.id} 
                   draggable
                   onDragStart={(e) => handleDragStart(e, b.id)}
                   onDragOver={handleDragOver}
                   onDrop={(e) => handleDropBudgets(e, b.id)}
                   onDragEnd={handleDragEnd}
                   className={`relative p-4 rounded-2xl border ${cardColor} transition-all duration-300 cursor-grab active:cursor-grabbing ${draggedId === b.id ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-bold text-sm truncate ${textColor}`}>{b.name}</h4>
                        {b.description && <p className={`text-[10px] ${labelColor} truncate mt-0.5`}>{b.description}</p>}
                      </div>
                      {!isReadOnly && <div className="ml-2 flex-shrink-0 flex gap-1">
                        <button onClick={() => {
                          setEditingData({id: b.id, type: 'budgets', name: b.name, description: b.description || ''});
                          setShowModal('editBudget');
                        }} className="flex-shrink-0">
                          <Edit2 size={14} className={`transition-colors ${usagePercent >= 80 ? 'text-red-600 dark:text-red-600 hover:text-red-800 dark:hover:text-red-500' : usagePercent >= 50 ? 'text-yellow-600 dark:text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-500' : usagePercent > 0 ? 'text-green-600 dark:text-green-600 hover:text-green-800 dark:hover:text-green-500' : 'text-slate-600 dark:text-slate-600 hover:text-slate-800 dark:hover:text-slate-500'}`}/>
                        </button>
                        <button onClick={() => handleDelete("budgets", b.id)} className="flex-shrink-0">
                          <Trash2 size={14} className={`transition-colors ${usagePercent >= 80 ? 'text-red-600 dark:text-red-600 hover:text-red-800 dark:hover:text-red-500' : usagePercent >= 50 ? 'text-yellow-600 dark:text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-500' : usagePercent > 0 ? 'text-green-600 dark:text-green-600 hover:text-green-800 dark:hover:text-green-500' : 'text-slate-600 dark:text-slate-600 hover:text-slate-800 dark:hover:text-slate-500'}`}/>
                        </button>
                      </div>}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div>
                        <span className={`text-[9px] ${labelColor} block`}>Tersedia</span>
                        <span className={`text-sm font-bold block truncate ${textColor}`}>Rp {formatRupiah(available)}</span>
                      </div>
                      {parseRupiah(b.limit) > 0 && (
                        <>
                          <div>
                            <span className={`text-[9px] ${labelColor} block`}>Terpakai</span>
                            <span className={`text-xs font-medium ${labelColor} block truncate`}>Rp {formatRupiah(used)}</span>
                          </div>
                          <div>
                            <span className={`text-[9px] ${labelColor} block`}>Anggaran</span>
                            <span className={`text-xs font-medium ${labelColor} block truncate`}>Rp {b.limit}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {parseRupiah(b.limit) > 0 && (
                      <div className="w-full bg-slate-300 dark:bg-black/20 rounded-full h-1.5 overflow-hidden transition-colors duration-300">
                         <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${Math.min(100, usagePercent)}%` }}></div>
                      </div>
                    )}
                 </div>
               );
             })}
           </div>
         )}
      </div>
    </div>
  );
};
