import React, { useEffect } from 'react';

export const ClearCache = () => {
  useEffect(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
    
    // Show message
    console.log('✓ Cache cleared! Reloading...');
    
    // Reload after 1 second
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center space-y-4 px-4">
        <div className="text-5xl">🔄</div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Clearing Cache...</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Aplikasi sedang clear cache dan restart.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          Tunggu beberapa detik...
        </p>
      </div>
    </div>
  );
};

export default ClearCache;
