import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { parseRupiah, formatRupiah } from '../utils/formatter';

export const Summary = ({ transactions, budgets }) => {
  const currentMonth = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Calculate monthly summary
  const summary = useMemo(() => {
    const currentMonthTx = transactions.filter(t => {
      const txMonth = t.date || new Date(t.createdAt).toISOString().split('T')[0];
      return txMonth.startsWith(currentMonth) && (t.type === 'income' || t.type === 'expense');
    });

    const totalIncome = currentMonthTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseRupiah(t.amount), 0);

    const totalExpense = currentMonthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseRupiah(t.amount), 0);

    const net = totalIncome - totalExpense;

    // Budget breakdown - hitung sisa dari transaksi expense
    const budgetBreakdown = budgets.map(b => {
      const limit = parseRupiah(b.limit || '0');
      const used = transactions
        .filter(t => t.type === 'expense' && t.targetId === b.id)
        .reduce((sum, t) => sum + parseRupiah(t.amount), 0);
      const remaining = limit - used;
      
      return {
        name: b.name,
        limit,
        used,
        remaining
      };
    }).filter(b => b.limit > 0);

    return { totalIncome, totalExpense, net, budgetBreakdown };
  }, [transactions, budgets, currentMonth]);

  return (
    <div className="space-y-4">
      {/* MAIN METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Income */}
        <div className="bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-4 transition-colors duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mb-1">Pemasukan</p>
              <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Rp {formatRupiah(summary.totalIncome)}</p>
            </div>
            <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-500" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-2xl p-4 transition-colors duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-red-700 dark:text-red-400 font-bold mb-1">Pengeluaran</p>
              <p className="text-xl font-bold text-red-900 dark:text-red-100">Rp {formatRupiah(summary.totalExpense)}</p>
            </div>
            <TrendingDown size={24} className="text-red-600 dark:text-red-500" />
          </div>
        </div>

        {/* Net */}
        <div className={`border rounded-2xl p-4 transition-colors duration-300 ${summary.net >= 0 ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800' : 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-800'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-xs font-bold mb-1 ${summary.net >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Sisa</p>
              <p className={`text-xl font-bold ${summary.net >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-orange-900 dark:text-orange-200'}`}>
                Rp {formatRupiah(Math.abs(summary.net))}
              </p>
            </div>
            <DollarSign size={24} className={summary.net >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'} />
          </div>
        </div>
      </div>

      {/* BUDGET BREAKDOWN */}
      {summary.budgetBreakdown.length > 0 && (
        <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 transition-colors duration-300 shadow-sm">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">Breakdown Budget</p>
          <div className="space-y-3">
            {summary.budgetBreakdown.map((budget, idx) => {
              const percentage = budget.limit > 0 ? (budget.used / budget.limit) * 100 : 0;
              const isOver = budget.remaining < 0;
              
              let barColor = 'bg-blue-500 dark:bg-blue-600';
              if (percentage >= 80) {
                barColor = 'bg-red-500 dark:bg-red-600';
              } else if (percentage >= 50) {
                barColor = 'bg-yellow-500 dark:bg-yellow-600';
              } else if (percentage > 0) {
                barColor = 'bg-emerald-500 dark:bg-emerald-600';
              }

              return (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{budget.name}</span>
                    <span className={`text-xs font-bold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      Rp {formatRupiah(budget.used)} / Rp {formatRupiah(budget.limit)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden transition-colors duration-300">
                    <div 
                      className={`h-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
