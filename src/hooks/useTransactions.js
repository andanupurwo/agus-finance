import { addDoc, collection, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRupiah, parseRupiah, isCurrentMonth } from '../utils/formatter';

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
        const newAmount = parseRupiah(targetBudget.amount) - amountVal;
        if (newAmount < 0) {
          showToast?.("Budget tidak cukup, top up dulu via transfer", "error");
          setLoading(false);
          return;
        }
        await updateDoc(doc(db, "budgets", selectedTarget), { amount: formatRupiah(newAmount) });
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
      let sourceRef, sourceData, sourceCollection;
      const isSourceWallet = wallets.find(w => w.id === fromId);
      
      if (isSourceWallet) {
        sourceCollection = "wallets";
        sourceData = isSourceWallet;
      } else {
        sourceCollection = "budgets";
        sourceData = budgets.find(b => b.id === fromId);
      }
      
      const currentSourceAmount = parseRupiah(sourceData.amount);
      if (currentSourceAmount < amountVal) { 
        setLoading(false); 
        showToast?.("Saldo sumber tidak cukup!", "error");
        return;
      }

      let destRef, destData, destCollection;
      const isDestWallet = wallets.find(w => w.id === toId);

      if (isDestWallet) {
        destCollection = "wallets";
        destData = isDestWallet;
      } else {
        destCollection = "budgets";
        destData = budgets.find(b => b.id === toId);
      }

      // Update sumber
      await updateDoc(doc(db, sourceCollection, fromId), { amount: formatRupiah(currentSourceAmount - amountVal) });
      
      // Update tujuan
      const currentDestAmount = parseRupiah(destData.amount);
      let updateDestData = { amount: formatRupiah(currentDestAmount + amountVal) };
      
      // Jika tujuan adalah budget, update limitnya juga
      if (destCollection === "budgets") {
        const currentDestLimit = parseRupiah(destData.limit || '0');
        updateDestData.limit = formatRupiah(currentDestLimit + amountVal);
      }
      
      await updateDoc(doc(db, destCollection, toId), updateDestData);
      
      // Jika sumber adalah budget dan tujuan budget, kurangi limit sumber
      if (sourceCollection === "budgets" && destCollection === "budgets") {
        const currentSourceLimit = parseRupiah(sourceData.limit || '0');
        await updateDoc(doc(db, "budgets", fromId), { limit: formatRupiah(Math.max(0, currentSourceLimit - amountVal)) });
      }
      
      await addDoc(collection(db, "transactions"), {
        title: "Alokasi Dana",
        amount: amount,
        type: 'transfer',
        user: user,
        time: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
        target: `${sourceData.name} -> ${destData.name}`,
        fromId,
        toId,
        fromType: sourceCollection === 'wallets' ? 'wallet' : 'budget',
        toType: destCollection === 'wallets' ? 'wallet' : 'budget',
        createdAt: Date.now()
      });

      setShowModal(null); setTransferData({ fromId: '', toId: '', amount: '' });
      showToast?.("Alokasi Berhasil!", "success");
    } catch (e) { 
      showToast?.(e.message, "error");
    }
    setLoading(false);
  }

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

  const handleDeleteTransaction = async (tx, wallets, budgets) => {
    const confirmed = await showConfirm?.("Hapus transaksi ini dan kembalikan saldo?");
    if (!confirmed) return;
    const amountVal = parseRupiah(tx.amount);

    try {
      if (tx.type === 'income') {
        const wallet = wallets.find(w => w.id === tx.targetId || w.name === tx.target);
        if (wallet) {
          const newBalance = Math.max(0, parseRupiah(wallet.amount) - amountVal);
          await updateDoc(doc(db, 'wallets', wallet.id), { amount: formatRupiah(newBalance) });
        }
      } else if (tx.type === 'expense') {
        const budget = budgets.find(b => b.id === tx.targetId || b.name === tx.target);
        if (budget) {
          const newAmount = parseRupiah(budget.amount) + amountVal;
          await updateDoc(doc(db, 'budgets', budget.id), { amount: formatRupiah(newAmount) });
        }
      } else if (tx.type === 'transfer') {
        const isFromWallet = (tx.fromType === 'wallet' || tx.fromType === 'wallets');
        const isToWallet = (tx.toType === 'wallet' || tx.toType === 'wallets');
        const fromEntity = isFromWallet
          ? wallets.find(w => w.id === tx.fromId || w.name === tx.target?.split(' -> ')[0])
          : budgets.find(b => b.id === tx.fromId || b.name === tx.target?.split(' -> ')[0]);
        const toEntity = isToWallet
          ? wallets.find(w => w.id === tx.toId || w.name === tx.target?.split(' -> ')[1])
          : budgets.find(b => b.id === tx.toId || b.name === tx.target?.split(' -> ')[1]);

        if (fromEntity) {
          const collectionName = isFromWallet ? 'wallets' : 'budgets';
          const newAmount = parseRupiah(fromEntity.amount) + amountVal;
          await updateDoc(doc(db, collectionName, fromEntity.id), { amount: formatRupiah(newAmount) });
          if (!isFromWallet) {
            const currentLimit = parseRupiah(fromEntity.limit || '0');
            await updateDoc(doc(db, 'budgets', fromEntity.id), { limit: formatRupiah(currentLimit + amountVal) });
          }
        }

        if (toEntity) {
          const collectionName = isToWallet ? 'wallets' : 'budgets';
          const newAmount = Math.max(0, parseRupiah(toEntity.amount) - amountVal);
          await updateDoc(doc(db, collectionName, toEntity.id), { amount: formatRupiah(newAmount) });
          if (!isToWallet) {
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

  const handleEditTransaction = async (transaction, updatedData, wallets, budgets, setLoading) => {
    if (!updatedData.nominal) {
      showToast?.("Nominal harus diisi!", "error");
      return;
    }

    // Gunakan nilai existing jika field tidak diedit
    const effectiveTargetId = updatedData.selectedTarget || transaction.targetId;
    const effectiveTargetName = updatedData.targetName || transaction.target;
    const effectiveDate = updatedData.transactionDate || transaction.date;

    setLoading(true);
    try {
      const oldAmountVal = parseRupiah(transaction.amount);
      const newAmountVal = parseRupiah(updatedData.nominal);
      const amountDifference = newAmountVal - oldAmountVal;
      const targetChanged = transaction.targetId !== effectiveTargetId;

      // Handle amount/target changes
      if (transaction.type === 'income') {
        if (!targetChanged) {
          // Target sama: update langsung dengan selisih
          const wallet = wallets.find(w => w.id === transaction.targetId);
          if (wallet) {
            const newBalance = parseRupiah(wallet.amount) + amountDifference;
            await updateDoc(doc(db, 'wallets', wallet.id), { amount: formatRupiah(newBalance) });
          }
        } else {
          // Target berubah: reverse old, apply new
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
        if (!targetChanged) {
          // Target sama: update langsung dengan selisih
          const budget = budgets.find(b => b.id === transaction.targetId);
          if (budget) {
            const newAmount = parseRupiah(budget.amount) - amountDifference;
            if (newAmount < 0) {
              showToast?.("Budget tidak cukup", "error");
              setLoading(false);
              return;
            }
            await updateDoc(doc(db, 'budgets', budget.id), { amount: formatRupiah(newAmount) });
          }
        } else {
          // Target berubah: reverse old, apply new
          const oldBudget = budgets.find(b => b.id === transaction.targetId);
          if (oldBudget) {
            const reversedAmount = parseRupiah(oldBudget.amount) + oldAmountVal;
            await updateDoc(doc(db, 'budgets', oldBudget.id), { amount: formatRupiah(reversedAmount) });
          }
          const newBudget = budgets.find(b => b.id === effectiveTargetId);
          if (newBudget) {
            const newAmount = parseRupiah(newBudget.amount) - newAmountVal;
            if (newAmount < 0) {
              showToast?.("Budget tidak cukup", "error");
              setLoading(false);
              return;
            }
            await updateDoc(doc(db, 'budgets', effectiveTargetId), { amount: formatRupiah(newAmount) });
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
