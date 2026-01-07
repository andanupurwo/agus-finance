import React from 'react';
import { X } from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';

const WALLET_COLORS = [
  { name: 'Merah', value: '#FF0000', rgbValue: 'rgb(255, 0, 0)' },
  { name: 'Magenta', value: '#C00080', rgbValue: 'rgb(192, 0, 128)' },
  { name: 'Ungu', value: '#8000C0', rgbValue: 'rgb(128, 0, 192)' },
  { name: 'Biru-Ungu', value: '#4B00B5', rgbValue: 'rgb(75, 0, 181)' },
  { name: 'Biru', value: '#0066FF', rgbValue: 'rgb(0, 102, 255)' },
  { name: 'Toska', value: '#00B5B5', rgbValue: 'rgb(0, 181, 181)' },
  { name: 'Hijau', value: '#00A000', rgbValue: 'rgb(0, 160, 0)' },
  { name: 'Hijau-Kuning', value: '#80D000', rgbValue: 'rgb(128, 208, 0)' },
  { name: 'Kuning-Oranye', value: '#FFCC00', rgbValue: 'rgb(255, 204, 0)' },
  { name: 'Oranye', value: '#FF9900', rgbValue: 'rgb(255, 153, 0)' },
  { name: 'Oranye-Merah', value: '#FF5500', rgbValue: 'rgb(255, 85, 0)' },
  { name: 'Hitam', value: '#000000', rgbValue: 'rgb(0, 0, 0)' }
];

export const Modal = ({
  showModal,
  setShowModal,
  wallets,
  budgets,
  transferData,
  setTransferData,
  newData,
  setNewData,
  loading,
  handleTransfer,
  handleCreate,
  handleEdit,
  user,
  setLoading,
  editingData,
  setEditingData
}) => {
  const { handleNominalInput } = useTransactions();

  // Determine source type (wallet or budget)
  const sourceType = React.useMemo(() => {
    if (!transferData.fromId) return null;
    const isWallet = wallets.find(w => w.id === transferData.fromId);
    return isWallet ? 'wallet' : 'budget';
  }, [transferData.fromId, wallets]);

  // Guard: don't render if modal is not open
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white/40 dark:bg-black/60 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowModal(null)}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in zoom-in-95 transition-colors duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            {showModal === 'transfer' ? 'Alokasi / Pindah Dana' : showModal === 'addWallet' ? 'Buat Wallet Baru' : showModal === 'addBudget' ? 'Buat Budget Baru' : showModal === 'editWallet' ? 'Edit Wallet' : 'Edit Budget'}
          </h3>
          <button onClick={() => setShowModal(null)}><X size={20} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"/></button>
        </div>

        {showModal === 'transfer' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Dari (Sumber)</label>
              <select className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" value={transferData.fromId} onChange={e => setTransferData({...transferData, fromId: e.target.value})}>
                <option value="">Pilih Sumber</option>
                <optgroup label="Wallets">{wallets.map(w => <option key={w.id} value={w.id}>{w.name} (Rp {w.amount})</option>)}</optgroup>
                <optgroup label="Budgets">{budgets.map(b => <option key={b.id} value={b.id}>{b.name} (Rp {b.amount})</option>)}</optgroup>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Ke (Tujuan)</label>
              <select className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300 disabled:opacity-50" value={transferData.toId} onChange={e => setTransferData({...transferData, toId: e.target.value})} disabled={!transferData.fromId}>
                <option value="">Pilih Tujuan</option>
                {sourceType !== 'budget' && (
                  <optgroup label="Wallets">{wallets.map(w => <option key={w.id} value={w.id} disabled={w.id === transferData.fromId}>{w.name} (Rp {w.amount})</option>)}</optgroup>
                )}
                <optgroup label="Budgets">{budgets.map(b => <option key={b.id} value={b.id} disabled={b.id === transferData.fromId}>{b.name} (Rp {b.amount})</option>)}</optgroup>
              </select>
              {sourceType === 'budget' && (
                <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-1">⚠️ Budget hanya bisa transfer ke Budget lain</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">Nominal</label>
              <input type="text" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-3 rounded-xl text-sm font-bold placeholder-slate-500 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" placeholder="0" value={transferData.amount} onChange={e => handleNominalInput(e, val => setTransferData({...transferData, amount: val}))} />
            </div>
            <button onClick={() => handleTransfer(transferData, wallets, budgets, setTransferData, setShowModal, user, setLoading)} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 py-3 rounded-xl font-bold text-white mt-2 transition-all disabled:opacity-50">Proses Alokasi</button>
          </div>
        ) : showModal === 'editWallet' || showModal === 'editBudget' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">Nama</label>
              <input type="text" placeholder="Nama" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" value={editingData.name} onChange={e => setEditingData({...editingData, name: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">Deskripsi</label>
              <input type="text" placeholder="Deskripsi" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" value={editingData.description || ''} onChange={e => setEditingData({...editingData, description: e.target.value})} />
            </div>
            {showModal === 'editWallet' && (
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">Warna Wallet</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {WALLET_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setEditingData({...editingData, color: color.value})}
                      style={{ backgroundColor: color.value }}
                      className={`w-full h-10 rounded-lg transition-all ${editingData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => handleEdit(editingData.type, editingData.id, editingData.name, editingData.description, editingData.color, setShowModal, setEditingData)} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 py-3 rounded-xl font-bold text-white mt-2 transition-all disabled:opacity-50">Simpan Perubahan</button>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="Nama (mis: Tabungan, Makan)" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" value={newData.name} onChange={e => setNewData({...newData, name: e.target.value})} />
            <input type="text" placeholder="Deskripsi (mis: Cash, Muamalat, Seabank)" className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 p-3 rounded-xl text-sm focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors duration-300" value={newData.description || ''} onChange={e => setNewData({...newData, description: e.target.value})} />
            {showModal === 'addWallet' && (
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-400 block mb-2">Warna Wallet</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {WALLET_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewData({...newData, color: color.value})}
                      style={{ backgroundColor: color.value }}
                      className={`w-full h-10 rounded-lg transition-all ${newData.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'}`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => handleCreate(showModal, newData, setShowModal, setNewData, setLoading, wallets, budgets)} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 dark:hover:bg-emerald-500 py-3 rounded-xl font-bold text-white mt-2 transition-all disabled:opacity-50">Simpan</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
