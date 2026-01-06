import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ message, type = 'success', onClose, duration = 1500}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-emerald-500 dark:text-emerald-400" />,
    error: <AlertCircle size={20} className="text-red-500 dark:text-red-400" />,
    info: <Info size={20} className="text-blue-500 dark:text-blue-400" />,
  };

  const colors = {
    success: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-800',
    error: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-800',
    info: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-800',
  };

  const textColors = {
    success: 'text-emerald-900 dark:text-emerald-100',
    error: 'text-red-900 dark:text-red-100',
    info: 'text-blue-900 dark:text-blue-100',
  };

  return (
    <div className="fixed top-20 left-0 right-0 z-[100] flex justify-center px-4 animate-in slide-in-from-top duration-300">
      <div className={`max-w-md w-full ${colors[type]} border rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 transition-colors duration-300`}>
        {icons[type]}
        <p className={`flex-1 text-sm ${textColors[type]} font-medium`}>{message}</p>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors duration-300">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200 px-4" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-6">
          <AlertCircle size={24} className="text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-900 dark:text-white text-base leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white py-3 rounded-xl font-medium transition-all active:scale-95 duration-300"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-all active:scale-95"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
