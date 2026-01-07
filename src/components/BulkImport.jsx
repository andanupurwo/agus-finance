import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRupiah, parseRupiah, isCurrentMonth } from '../utils/formatter';

const normalizeAmount = (val) => {
  if (typeof val === 'number') return formatRupiah(val);
  if (!val) return '0';
  const cleaned = String(val).replace(/[^0-9-]/g, '');
  return formatRupiah(parseInt(cleaned || '0', 10));
};

// Robust date/time normalization for varied Excel inputs
const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel serial-date epoch
const normalizeDate = (val) => {
  if (!val) return null;
  // If already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  // Excel serial date (number of days since 1899-12-30)
  if (typeof val === 'number') {
    const ms = Math.round(val * 86400000);
    const d = new Date(excelEpoch.getTime() + ms);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // String formats: try YYYY-MM-DD first, then DD/MM/YYYY, then DD-MM-YYYY
  const s = String(val).trim();
  // YYYY-MM-DD
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s;
  }
  // DD/MM/YYYY or D/M/YYYY
  const dmYSlash = s.match(/^([0-3]?\d)\/(1?\d)\/(\d{4})$/);
  if (dmYSlash) {
    const [_, dd, mm, yyyy] = dmYSlash;
    const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // DD-MM-YYYY or D-M-YYYY
  const dmYDash = s.match(/^([0-3]?\d)-(1?\d)-(\d{4})$/);
  if (dmYDash) {
    const [_, dd, mm, yyyy] = dmYDash;
    const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // Fallback: Date(s) parse (may be locale-dependent)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};

const normalizeTime = (val) => {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof val === 'number') {
    // Excel time as fraction of a day
    const totalMinutes = Math.round(val * 24 * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  const s = String(val).trim();
  // HH:MM or H:MM
  const hm = s.match(/^([0-2]?\d):([0-5]\d)$/);
  if (hm) {
    const hh = Math.min(23, parseInt(hm[1], 10));
    const mm = Math.min(59, parseInt(hm[2], 10));
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
  // HH.MM or H.MM (common typo)
  const hmDot = s.match(/^([0-2]?\d)\.([0-5]\d)$/);
  if (hmDot) {
    const hh = Math.min(23, parseInt(hmDot[1], 10));
    const mm = Math.min(59, parseInt(hmDot[2], 10));
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  }
  // Fallback: try Date parse and format
  const d = new Date(`1970-01-01T${s}`);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return '';
};

const normalizeType = (val) => {
  if (!val) return null;
  const v = String(val).toLowerCase();
  if (v.startsWith('pem') || v === 'income' || v === 'masuk' || v === 'pemasukan') return 'income';
  if (v.startsWith('pen') || v === 'expense' || v === 'keluar' || v === 'pengeluaran') return 'expense';
  if (v.startsWith('tra') || v === 'transfer') return 'transfer';
  return null;
};

const parseTargetsForTransfer = (target, from, to) => {
  if (from && to) return { fromName: String(from).trim(), toName: String(to).trim() };
  if (!target) return { fromName: null, toName: null };
  const parts = String(target).split('->');
  if (parts.length === 2) return { fromName: parts[0].trim(), toName: parts[1].trim() };
  return { fromName: null, toName: null };
};

export const BulkImport = ({ wallets = [], budgets = [], user, loading, setLoading, showToast, showConfirm }) => {
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [onlyThisMonth, setOnlyThisMonth] = useState(true);
  const [result, setResult] = useState(null);
  const [fallbackBudgetId, setFallbackBudgetId] = useState('');
  const [fallbackWalletId, setFallbackWalletId] = useState('');

  const sampleWallet = wallets[0]?.name || 'NamaWallet';
  const sampleBudget = budgets[0]?.name || 'NamaBudget';

  const downloadTemplateCSV = () => {
    const headers = ['Tanggal','Waktu','Tipe','Keterangan','Target','Nominal','User','Dari','Ke'];
    const sample = [
      ['2026-01-07','08:30','Pemasukan','Gaji Bulanan', sampleWallet, '2500000','Purwo','',''],
      ['2026-01-07','12:15','Pengeluaran','Makan Siang', sampleBudget, '50000','Purwo','',''],
      ['2026-01-07','14:00','Transfer','Alokasi Dana','', '100000','Purwo', sampleWallet, sampleBudget]
    ];
    const csv = [headers, ...sample]
      .map(row => row.map(v => {
        const s = String(v ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Transaksi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTemplateXLSX = () => {
    const headers = ['Tanggal','Waktu','Tipe','Keterangan','Target','Nominal','User','Dari','Ke'];
    const timeNumber = (hhmm) => {
      const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return 0;
      const h = Math.min(23, parseInt(m[1],10));
      const mi = Math.min(59, parseInt(m[2],10));
      return (h * 60 + mi) / (24 * 60);
    };
    const rows = [
      [new Date('2026-01-07'), timeNumber('08:30'), 'Pemasukan', 'Gaji Bulanan', sampleWallet, 2500000, 'Purwo', '', '' ],
      [new Date('2026-01-07'), timeNumber('12:15'), 'Pengeluaran', 'Makan Siang', sampleBudget, 50000, 'Purwo', '', '' ],
      [new Date('2026-01-07'), timeNumber('14:00'), 'Transfer', 'Alokasi Dana', '', 100000, 'Purwo', sampleWallet, sampleBudget ]
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // Column widths
    ws['!cols'] = [
      { wch: 12 },{ wch: 8 },{ wch: 12 },{ wch: 30 },{ wch: 18 },{ wch: 12 },{ wch: 10 },{ wch: 18 },{ wch: 18 }
    ];
    // Formats: Date (yyyy-mm-dd) and Time (hh:mm)
    ['A2','A3','A4'].forEach(addr => { if (ws[addr]) { ws[addr].t = 'd'; ws[addr].z = 'yyyy-mm-dd'; } });
    ['B2','B3','B4'].forEach(addr => { if (ws[addr]) { ws[addr].t = 'n'; ws[addr].z = 'hh:mm'; } });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Transaksi.xlsx');
  };

  const handleFile = async (file) => {
    setResult(null);
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, cellDates: true, dateNF: 'yyyy-mm-dd' });
      setRows(json);
      setPreview(json.slice(0, 5));
      showToast?.(`File terbaca: ${json.length} baris`, 'success');
    } catch (e) {
      showToast?.(e.message || 'Gagal membaca file', 'error');
    }
  };

  const resolveWalletByName = (name) => {
    if (!name) return undefined;
    const needle = String(name).trim().toLowerCase();
    return wallets.find(w => String(w.name).trim().toLowerCase() === needle);
  };
  const resolveBudgetByName = (name) => {
    if (!name) return undefined;
    const needle = String(name).trim().toLowerCase();
    return budgets.find(b => String(b.name).trim().toLowerCase() === needle);
  };

  const runImport = async () => {
    if (!rows.length) {
      showToast?.('Tidak ada data untuk diimport', 'error');
      return;
    }
    if (user === 'Demo') {
      showToast?.('Mode Demo: impor dinonaktifkan', 'error');
      return;
    }

    const errors = [];
    let success = 0;
    setLoading?.(true);
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        // Support both Indonesian export headers and generic ones
        const tanggal = r['Tanggal'] || r['Date'] || r['date'] || '';
        const waktu = r['Waktu'] || r['Time'] || r['time'] || '';
        const tipeRaw = r['Tipe'] || r['Type'] || r['type'] || '';
        const ket = r['Keterangan'] || r['Title'] || r['Judul'] || r['title'] || '';
        const target = r['Target'] || r['target'] || '';
        const nominalRaw = r['Nominal'] || r['Amount'] || r['amount'] || '';
        const userCol = r['User'] || r['Pengguna'] || r['user'] || '';
        const fromCol = r['Dari'] || r['From'] || r['from'] || '';
        const toCol = r['Ke'] || r['To'] || r['to'] || '';

        const tipe = normalizeType(tipeRaw);
        if (!tipe) {
          errors.push({ index: i + 1, reason: 'Tipe tidak valid' });
          continue;
        }

        const dateStr = normalizeDate(tanggal) || new Date().toISOString().split('T')[0];
        if (onlyThisMonth && !isCurrentMonth(dateStr)) {
          errors.push({ index: i + 1, reason: 'Tanggal di luar bulan berjalan' });
          continue;
        }

        const amountStr = normalizeAmount(nominalRaw);
        const amountVal = parseRupiah(amountStr);
        if (amountVal <= 0) {
          errors.push({ index: i + 1, reason: 'Nominal harus > 0' });
          continue;
        }

        try {
          if (tipe === 'income') {
            const wallet = resolveWalletByName(target || toCol || fromCol) || (fallbackWalletId ? wallets.find(w => w.id === fallbackWalletId) : null);
            if (!wallet) throw new Error('Wallet tidak ditemukan');
            const newBalance = parseRupiah(wallet.amount) + amountVal;
            
            await updateDoc(doc(db, 'wallets', wallet.id), { amount: formatRupiah(newBalance) });
            await addDoc(collection(db, 'transactions'), {
              title: ket || 'Pemasukan',
              amount: amountStr,
              type: 'income',
              user: userCol || user,
              time: normalizeTime(waktu) || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              date: dateStr,
              target: wallet.name,
              targetId: wallet.id,
              targetType: 'wallet',
              createdAt: Date.now()
            });
            success++;
          } else if (tipe === 'expense') {
            const budget = resolveBudgetByName(target || toCol || fromCol) || (fallbackBudgetId ? budgets.find(b => b.id === fallbackBudgetId) : null);
            if (!budget) throw new Error('Budget tidak ditemukan');
            const newAmount = parseRupiah(budget.amount) - amountVal;
            if (newAmount < 0) throw new Error('Budget tidak cukup');
            
            // Update budget terlebih dahulu SEBELUM menambah transaksi
            await updateDoc(doc(db, 'budgets', budget.id), { amount: formatRupiah(newAmount) });
            
            await addDoc(collection(db, 'transactions'), {
              title: ket || 'Pengeluaran',
              amount: amountStr,
              type: 'expense',
              user: userCol || user,
              time: normalizeTime(waktu) || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              date: dateStr,
              target: budget.name,
              targetId: budget.id,
              targetType: 'budget',
              createdAt: Date.now()
            });
            success++;
          } else if (tipe === 'transfer') {
            const { fromName, toName } = parseTargetsForTransfer(target, fromCol, toCol);
            if (!fromName || !toName) throw new Error('Target transfer tidak valid (butuh asal & tujuan)');

            const fromWallet = resolveWalletByName(fromName);
            const fromBudget = resolveBudgetByName(fromName);
            const toWallet = resolveWalletByName(toName);
            const toBudget = resolveBudgetByName(toName);

            const source = fromWallet || fromBudget;
            const dest = toWallet || toBudget;
            const fromCollection = fromWallet ? 'wallets' : 'budgets';
            const toCollection = toWallet ? 'wallets' : 'budgets';
            if (!source || !dest) throw new Error('Sumber/Tujuan tidak ditemukan');

            const currentSourceAmount = parseRupiah(source.amount);
            if (currentSourceAmount < amountVal) throw new Error('Saldo sumber tidak cukup');

            // Update sumber
            await updateDoc(doc(db, fromCollection, source.id), { amount: formatRupiah(currentSourceAmount - amountVal) });

            // Update tujuan (+ update limit jika budget)
            const currentDestAmount = parseRupiah(dest.amount);
            const destUpdate = { amount: formatRupiah(currentDestAmount + amountVal) };
            if (toCollection === 'budgets') {
              const currentLimit = parseRupiah(dest.limit || '0');
              destUpdate.limit = formatRupiah(currentLimit + amountVal);
            }
            await updateDoc(doc(db, toCollection, dest.id), destUpdate);

            // Jika sumber dan tujuan sama-sama budget, kurangi limit sumber
            if (fromCollection === 'budgets' && toCollection === 'budgets') {
              const currentSourceLimit = parseRupiah(source.limit || '0');
              await updateDoc(doc(db, 'budgets', source.id), { limit: formatRupiah(Math.max(0, currentSourceLimit - amountVal)) });
            }

            await addDoc(collection(db, 'transactions'), {
              title: ket || 'Alokasi Dana',
              amount: amountStr,
              type: 'transfer',
              user: userCol || user,
              time: normalizeTime(waktu) || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              date: dateStr,
              target: `${source.name} -> ${dest.name}`,
              fromId: source.id,
              toId: dest.id,
              fromType: fromCollection === 'wallets' ? 'wallet' : 'budget',
              toType: toCollection === 'wallets' ? 'wallet' : 'budget',
              createdAt: Date.now()
            });
            success++;
          }
        } catch (err) {
          errors.push({ index: i + 1, reason: err.message || 'Gagal import baris' });
        }
      }

      setResult({ success, failed: errors.length, errors });
      if (success > 0) {
        showToast?.(`Impor selesai: ${success} sukses, ${errors.length} gagal`, errors.length ? 'info' : 'success');
      } else {
        showToast?.('Tidak ada baris yang berhasil diimpor', 'error');
      }
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
        <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">Bulk Import Transaksi</div>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Unggah file .xlsx/.xls/.csv dengan kolom: Tanggal, Waktu, Tipe, Keterangan, Target, Nominal, User. Untuk Transfer, isi kolom Dari & Ke atau gunakan Target: "Sumber {'->'} Tujuan".</p>

        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={downloadTemplateCSV} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Download Template CSV</button>
          <button onClick={downloadTemplateXLSX} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Download Template Excel</button>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <div className="grid sm:grid-cols-2 gap-2 mt-3">
          <div>
            <label className="text-[11px] text-slate-600 dark:text-slate-400">Fallback Budget (untuk nama yang tidak dikenal)</label>
            <select
              value={fallbackBudgetId}
              onChange={(e) => setFallbackBudgetId(e.target.value)}
              className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="">— Tidak ada —</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-600 dark:text-slate-400">Fallback Wallet (untuk nama yang tidak dikenal)</label>
            <select
              value={fallbackWalletId}
              onChange={(e) => setFallbackWalletId(e.target.value)}
              className="mt-1 w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="">— Tidak ada —</option>
              {wallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <input id="onlyThisMonth" type="checkbox" checked={onlyThisMonth} onChange={(e) => setOnlyThisMonth(e.target.checked)} />
          <label htmlFor="onlyThisMonth" className="text-xs text-slate-700 dark:text-slate-300">Batasi hanya bulan ini</label>
        </div>

        {preview.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">Preview (5 baris pertama)</div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
                  <tr>
                    {Object.keys(preview[0]).map((k) => (
                      <th key={k} className="px-2 py-1 text-left whitespace-nowrap">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(preview[0]).map((k) => (
                        <td key={k} className="px-2 py-1 text-slate-700 dark:text-slate-300 whitespace-nowrap">{String(row[k])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={runImport}
            disabled={!rows.length || loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold active:scale-95"
          >
            Import {rows.length ? `(${rows.length})` : ''}
          </button>
          {rows.length > 0 && (
            <button
              onClick={() => { setRows([]); setPreview([]); setResult(null); }}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold active:scale-95"
            >
              Reset
            </button>
          )}
        </div>

        {result && (
          <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Hasil Impor</div>
            <div className="text-slate-700 dark:text-slate-300">Berhasil: {result.success} | Gagal: {result.failed}</div>
            {result.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-slate-700 dark:text-slate-300">Lihat detail error</summary>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-red-600 dark:text-red-400">
                  {result.errors.slice(0, 50).map((e, i) => (
                    <li key={i}>Baris {e.index}: {e.reason}</li>
                  ))}
                  {result.errors.length > 50 && (
                    <li>...dan {result.errors.length - 50} error lainnya</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;
