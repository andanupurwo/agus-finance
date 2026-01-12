import React from 'react';
import { LogOut } from 'lucide-react';

export function Header({ user, onLogout }) {
  // Format current date
  const getCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('id-ID', options);
  };

  // Get first letter of email or display name
  const getInitial = () => {
    if (!user) return '?';
    const name = user.includes('@') ? user.split('@')[0] : user;
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-50/95 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 pt-[calc(env(safe-area-inset-top)+10px)] flex flex-col gap-3 transition-colors duration-300">
      {/* Date */}
      <div className="flex items-center justify-center">
        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-none tracking-wide">{getCurrentDate()}</p>
      </div>
      
      {/* Logo & User */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-base font-extrabold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-300 dark:to-cyan-200">
            Agus Finance.
          </h1>
          <p className="text-[9px] text-slate-600 dark:text-slate-400 font-medium leading-snug mt-0.5">Buat anggaran untuk masa depan</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* User Avatar */}
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/10 bg-blue-600 dark:bg-blue-600">
            {getInitial()}
          </div>
          
          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Logout"
              className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-red-700 bg-red-600 transition-colors duration-300 shadow-lg border border-white/10"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
