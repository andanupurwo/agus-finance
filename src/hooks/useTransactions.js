import { addDoc, collection, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRupiah, parseRupiah, isCurrentMonth } from '../utils/formatter';

// ============================================
// HELPER FUNCTIONS UNTUK BUDGET CALCULATION
// ============================================

/**
 * Menghitung total pengeluaran untuk suatu budget
 * @param {string} budgetId - ID budget
 * @param {array} transactions - Semua transaksi
 * @returns {number} Total pengeluaran dalam rupiah
 */
const calculateBudgetUsed = (budgetId, transactions) => {
  return transactions
    .filter(t => t.type === 'expense' && t.targetId === budgetId)
    .reduce((sum, t) => sum + parseRupiah(t.amount), 0);
};

/**
 * Menghitung sisa budget
 * @param {object} budget - Budget object dengan field 'limit'
 * @param {number} used - Total pengeluaran
 * @returns {number} Sisa budget dalam rupiah (bisa negative jika over budget)
 */
const calculateBudgetRemaining = (budget, used) => {
  return parseRupiah(budget.limit || '0') - used;
};

export const useTransactions = (showToast, showConfirm) => {
  const handleDailyTransaction = async (
    type,
    nominal,
    description,
    selectedTarget,
    transactionDate,
    user,
    wallets,
    budgets,
    transactions,
    setNominal,
    setDescription,
    setSelectedTarget,
    setLoading
  ) => {
    if (!nominal) {
      showToast?.("Nominal harus diisi!", "error");
      return;
    }
    
    if (!selectedTarget) {
      showToast?.("Silakan pilih target terlebih dahulu", "error");
      return;
    }
    
    // Validasi tanggal harus di bulan berjalan
    if (!isCurrentMonth(transactionDate)) {
      showToast?.("⚠️ Transaksi hanya dapat dibuat untuk bulan berjalan saja!", "error");
      return;
    }
    
    setLoading(true);
    const amountVal = parseRupiah(nominal);
    const timeNow = new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});

    try {
      let targetName = '';
      let targetType = '';

      if (type === 'income') {
        const targetWallet = wallets.find(w => w.id === selectedTarget);
        if (!targetWallet) throw new Error('Wallet tidak ditemukan');
        targetName = targetWallet.name;
        targetType = 'wallet';
        const newBalance = parseRupiah(targetWallet.amount) + amountVal;
        await updateDoc(doc(db, "wallets", selectedTarget), { amount: formatRupiah(newBalance) });
      } else {
        const targetBudget = budgets.find(b => b.id === selectedTarget);
        if (!targetBudget) throw new Error('Budget tidak ditemukan');
        targetName = targetBudget.name;
        targetType = 'budget';
        
        // PERBAIKAN: Hitung sisa budget dari transaksi, bukan dari field amount
        const used = calculateBudgetUsed(selectedTarget, transactions || []);
        const remaining = calculateBudgetRemaining(targetBudget, used);
        
        if (remaining < amountVal) {
          const kurang = amountVal - remaining;
          showToast?.(
            `Budget "${targetName}" kurang Rp ${kurang.toLocaleString('id-ID')}. Top up dulu via transfer.`,
            "error"
          );
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, "transactions"), {
        title: description || (type === 'income' ? 'Pemasukan' : 'Pengeluaran'),
        amount: nominal,
        type: type,
        user: user,
        time: timeNow,
        date: transactionDate,
        target: targetName,
        targetId: selectedTarget,
        targetType,
        createdAt: Date.now()
      });

      setNominal(''); setDescription(''); setSelectedTarget('');
      showToast?.("Transaksi Berhasil!", "success");
    } catch (e) { 
      showToast?.(e.message, "error");
    }
    setLoading(false);
  };

  const handleTransfer = async (
    transferData,
    wallets,
    budgets,
    transactions,
    setTransferData,
    setShowModal,
    user,
    setLoading
  ) => {
    const { fromId, toId, amount } = transferData;
    if (!fromId || !toId || !amount) {
      showToast?.("Data transfer belum lengkap!", "error");
      return;
    }
    setLoading(true);

    const amountVal = parseRupiah(amount);
    
    try {
      // DETERMINE SOURCE (Wallet atau Budget)
      const isSourceWallet = wallets.some(w => w.id === fromId);
      const sourceData = isSourceWallet 
        ? wallets.find(w => w.id === fromId)
        : budgets.find(b => b.id === fromId);
      
      if (!sourceData) throw new Error('Sumber tidak ditemukan');
      
      // Validasi saldo sumber cukup
      let sourceAmount = parseRupiah(sourceData.amount || '0');
      
      // KHUSUS untuk budget source, jika tidak punya amount, hitung dari limit - used
      if (!isSourceWallet && !sourceData.amount) {
        const used = calculateBudgetUsed(fromId, transactions || []);
        sourceAmount = calculateBudgetRemaining(sourceData, used);
      }
      
      if (sourceAmount < amountVal) { 
        setLoading(false); 
        showToast?.("Saldo sumber tidak cukup!", "error");
        return;
      }

      // DETERMINE DESTINATION (Wallet atau Budget)
      const isDestWallet = wallets.some(w => w.id === toId);
      const destData = isDestWallet
        ? wallets.find(w => w.id === toId)
        : budgets.find(b => b.id === toId);
      
      if (!destData) throw new Error('Tujuan tidak ditemukan');

      // UPDATE SUMBER
      await updateDoc(doc(db, isSourceWallet ? 'wallets' : 'budgets', fromId), { 
        amount: formatRupiah(sourceAmount - amountVal) 
      });
      
      // UPDATE TUJUAN
      const destAmount = parseRupiah(destData.amount || '0');
      let updateDestData = { amount: formatRupiah(destAmount + amountVal) };
      
      // PENTING: Jika tujuan adalah BUDGET, NAIKKAN LIMIT (alokasi)
      // BUKAN amount! Limit adalah yang naik saat top up
      if (!isDestWallet) {
        const currentDestLimit = parseRupiah(destData.limit || '0');
        updateDestData.limit = formatRupiah(currentDestLimit + amountVal);
      }
      
      await updateDoc(doc(db, isDestWallet ? 'wallets' : 'budgets', toId), updateDestData);
      
      // Jika sumber adalah BUDGET dan tujuan juga BUDGET: kurangi limit sumber
      if (!isSourceWallet && !isDestWallet) {
        const currentSourceLimit = parseRupiah(sourceData.limit || '0');
        await updateDoc(doc(db, "budgets", fromId), { 
          limit: formatRupiah(Math.max(0, currentSourceLimit - amountVal)) 
        });
      }
      
      // Catat transaksi transfer
      await addDoc(collection(db, "transactions"), {
        title: "Alokasi Dana",
        amount: amount,
        type: 'transfer',
        user: user,
        time: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
        target: `${sourceData.name} → ${destData.name}`,
        fromId,
        toId,
        fromType: isSourceWallet ? 'wallet' : 'budget',
        toType: isDestWallet ? 'wallet' : 'budget',
        createdAt: Date.now()
      });
      setShowModal(null); 
      setTransferData({ fromId: '', toId: '', amount: '' });
      showToast?.("Transfer Berhasil!", "success");
    } catch (e) { 
      showToast?.(e.message, "error");
    }
    setLoading(false);
  };

  const handleCreate = async (
    showModal,
    newData,
    setShowModal,
    setNewData,
    setLoading,
    wallets,
    budgets
  ) => {
    if (!newData.name) {
      showToast?.("Nama harus diisi!", "error");
      return;
    }

    // Validasi duplikat nama
    const nameLower = newData.name.trim().toLowerCase();
    if (showModal === 'addWallet') {
      const exists = wallets.some(w => w.name.trim().toLowerCase() === nameLower);
      if (exists) {
        showToast?.(`Wallet dengan nama "${newData.name}" sudah ada!`, "error");
        return;
      }
    } else if (showModal === 'addBudget') {
      const exists = budgets.some(b => b.name.trim().toLowerCase() === nameLower);
      if (exists) {
        showToast?.(`Budget dengan nama "${newData.name}" sudah ada!`, "error");
        return;
      }
    }

    setLoading(true);
    try {
        if (showModal === 'addWallet') {
            await addDoc(collection(db, "wallets"), {
                name: newData.name.trim(),
                description: newData.description || '',
                amount: '0',
                type: 'Rekening',
                color: newData.color || 'from-slate-800 to-slate-900 border-slate-700',
                createdAt: Date.now()
            });
        } else {
            await addDoc(collection(db, "budgets"), {
                name: newData.name.trim(),
                description: newData.description || '',
                amount: '0',
                limit: '0',
                color: 'bg-slate-800 text-slate-200 border border-slate-700',
                bar: 'bg-blue-500',
                createdAt: Date.now()
            });
        }
        setShowModal(null); setNewData({name: '', limit: '', description: ''});
        showToast?.("Berhasil dibuat!", "success");
    } catch (e) { 
      showToast?.(e.message, "error");
    }
    setLoading(false);
  }

  const handleEdit = async (collectionName, id, name, description, color, setShowModal, setEditingData) => {
    if (!name.trim()) {
      showToast?.("Nama tidak boleh kosong", "error");
      return;
    }

    try {
      const updateData = { name: name.trim() };
      if (description !== undefined) {
        updateData.description = description.trim();
      }
      if (color !== undefined && collectionName === 'wallets') {
        updateData.color = color;
      }
      await updateDoc(doc(db, collectionName, id), updateData);
      showToast?.("Berhasil diperbarui", "success");
      setShowModal(null);
      setEditingData({ id: null, type: null, name: '', description: '' });
    } catch (e) {
      showToast?.(e.message, "error");
    }
  };

  const handleDelete = async (collectionName, id) => {
      const confirmed = await showConfirm?.("Hapus item ini? Saldo di dalamnya akan hilang.");
      if(!confirmed) return;

      // Safety: block delete if still has saldo/limit
      const snapshot = await getDoc(doc(db, collectionName, id));
      if (!snapshot.exists()) {
        showToast?.("Item tidak ditemukan", "error");
        return;
      }
      const data = snapshot.data() || {};
      const amountVal = parseRupiah(data.amount || '0');
      const limitVal = parseRupiah(data.limit || '0');

      if (amountVal > 0 || limitVal > 0) {
        showToast?.("Tidak bisa hapus: saldo atau limit masih ada. Kosongkan lewat transaksi/transfer dulu.", "error");
        return;
      }

      await deleteDoc(doc(db, collectionName, id));
      showToast?.("Item berhasil dihapus", "success");
  }

  const handleDeleteTransaction = async (tx, wallets, budgets, transactions) => {
    const confirmed = await showConfirm?.("Hapus transaksi ini dan kembalikan saldo?");
    if (!confirmed) return;
    const amountVal = parseRupiah(tx.amount);

    try {
      if (tx.type === 'income') {
        // Hapus income: kurangi saldo wallet
        const wallet = wallets.find(w => w.id === tx.targetId);
        if (wallet) {
          const newBalance = Math.max(0, parseRupiah(wallet.amount) - amountVal);
          await updateDoc(doc(db, 'wallets', wallet.id), { amount: formatRupiah(newBalance) });
        }
      } else if (tx.type === 'expense') {
        // Hapus expense: tidak perlu update amount budget
        // Karena sisa budget dihitung dari transaksi
        // Cukup hapus transaksi, sisa otomatis bertambah
      } else if (tx.type === 'transfer') {
        // Hapus transfer: reverse the changes
        const isFromWallet = (tx.fromType === 'wallet' || tx.fromType === 'wallets');
        const isToWallet = (tx.toType === 'wallet' || tx.toType === 'wallets');
        
        const fromEntity = isFromWallet
          ? wallets.find(w => w.id === tx.fromId)
          : budgets.find(b => b.id === tx.fromId);
        
        const toEntity = isToWallet
          ? wallets.find(w => w.id === tx.toId)
          : budgets.find(b => b.id === tx.toId);

        if (fromEntity) {
          // Kembalikan saldo/limit source
          if (isFromWallet) {
            const newAmount = parseRupiah(fromEntity.amount) + amountVal;
            await updateDoc(doc(db, 'wallets', fromEntity.id), { amount: formatRupiah(newAmount) });
          } else {
            // Budget source: kembalikan limit
            const currentLimit = parseRupiah(fromEntity.limit || '0');
            await updateDoc(doc(db, 'budgets', fromEntity.id), { limit: formatRupiah(currentLimit + amountVal) });
          }
        }

        if (toEntity) {
          // Kembalikan saldo/limit destination
          if (isToWallet) {
            const newAmount = Math.max(0, parseRupiah(toEntity.amount) - amountVal);
            await updateDoc(doc(db, 'wallets', toEntity.id), { amount: formatRupiah(newAmount) });
          } else {
            // Budget destination: kurangi limit
            const currentLimit = parseRupiah(toEntity.limit || '0');
            await updateDoc(doc(db, 'budgets', toEntity.id), { limit: formatRupiah(Math.max(0, currentLimit - amountVal)) });
          }
        }
      }

      await deleteDoc(doc(db, 'transactions', tx.id));
      showToast?.('Transaksi dihapus & saldo dipulihkan', 'success');
    } catch (e) {
      showToast?.(e.message, 'error');
    }
  };

  const handleNominalInput = (e, setter) => {
    const raw = e.target.value.replace(/\D/g, '');
    setter(raw ? formatRupiah(raw) : '');
  };

  const handleEditTransaction = async (transaction, updatedData, wallets, budgets, transactions, setLoading) => {
    if (!updatedData.nominal) {
      showToast?.("Nominal harus diisi!", "error");
      return;
    }

    const effectiveTargetId = updatedData.selectedTarget || transaction.targetId;
    const effectiveTargetName = updatedData.targetName || transaction.target;
    const effectiveDate = updatedData.transactionDate || transaction.date;

    setLoading(true);
    try {
      const oldAmountVal = parseRupiah(transaction.amount);
      const newAmountVal = parseRupiah(updatedData.nominal);
      const amountDifference = newAmountVal - oldAmountVal;
      const targetChanged = transaction.targetId !== effectiveTargetId;

      if (transaction.type === 'income') {
        // INCOME: update wallet saldo
        if (!targetChanged) {
          // Target sama: update selisih
          const wallet = wallets.find(w => w.id === transaction.targetId);
          if (wallet) {
            const newBalance = parseRupiah(wallet.amount) + amountDifference;
            await updateDoc(doc(db, 'wallets', wallet.id), { amount: formatRupiah(newBalance) });
          }
        } else {
          // Target berubah: reverse lama, apply baru
          const oldWallet = wallets.find(w => w.id === transaction.targetId);
          if (oldWallet) {
            const reversedBalance = parseRupiah(oldWallet.amount) - oldAmountVal;
            await updateDoc(doc(db, 'wallets', oldWallet.id), { amount: formatRupiah(reversedBalance) });
          }
          const newWallet = wallets.find(w => w.id === effectiveTargetId);
          if (newWallet) {
            const newBalance = parseRupiah(newWallet.amount) + newAmountVal;
            await updateDoc(doc(db, 'wallets', effectiveTargetId), { amount: formatRupiah(newBalance) });
          }
        }
      } else if (transaction.type === 'expense') {
        // EXPENSE: tidak perlu update amount budget (calculated dari transaksi)
        // Hanya cek apakah budget masih cukup untuk amount baru
        if (!targetChanged) {
          // Target sama: validasi sisa cukup untuk selisih
          const budget = budgets.find(b => b.id === transaction.targetId);
          if (budget && amountDifference > 0) {
            // Jika nominal naik, cek apakah sisa masih cukup
            const used = calculateBudgetUsed(transaction.targetId, transactions);
            const remaining = calculateBudgetRemaining(budget, used - oldAmountVal); // exclude transaksi lama
            if (remaining < newAmountVal) {
              showToast?.(`Budget tidak cukup untuk perubahan ke Rp ${newAmountVal.toLocaleString('id-ID')}`, "error");
              setLoading(false);
              return;
            }
          }
        } else {
          // Target berubah: validasi budget baru cukup
          const newBudget = budgets.find(b => b.id === effectiveTargetId);
          if (newBudget) {
            const used = calculateBudgetUsed(effectiveTargetId, transactions);
            const remaining = calculateBudgetRemaining(newBudget, used);
            if (remaining < newAmountVal) {
              showToast?.(`Budget tujuan tidak cukup untuk Rp ${newAmountVal.toLocaleString('id-ID')}`, "error");
              setLoading(false);
              return;
            }
          }
        }
      }

      // Update transaction document
      await updateDoc(doc(db, 'transactions', transaction.id), {
        amount: updatedData.nominal,
        title: updatedData.description || transaction.title,
        date: effectiveDate,
        target: effectiveTargetName,
        targetId: effectiveTargetId
      });

      showToast?.("Transaksi berhasil diubah!", "success");
    } catch (e) {
      showToast?.(e.message, "error");
    }
    setLoading(false);
  };

  return {
    handleDailyTransaction,
    handleTransfer,
    handleCreate,
    handleEdit,
    handleDelete,
    handleDeleteTransaction,
    handleEditTransaction,
    handleNominalInput
  };
};
