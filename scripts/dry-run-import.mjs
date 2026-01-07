import * as XLSX from 'xlsx';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { formatRupiah, parseRupiah, isCurrentMonth } from '../src/utils/formatter.js';

// Load firebase config from src/firebase.js indirectly (hardcode to avoid bundling ESM issues)
const firebaseConfig = {
  apiKey: "AIzaSyDwnbGY076oONW1ny2yhOt9pdIJkdLLEfM",
  authDomain: "latihan-crud-sederhana.firebaseapp.com",
  projectId: "latihan-crud-sederhana",
  storageBucket: "latihan-crud-sederhana.firebasestorage.app",
  messagingSenderId: "1335762286",
  appId: "1:1335762286:web:2209cf10c5baa5218b357f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalizeAmount = (val) => {
  if (typeof val === 'number') return formatRupiah(val);
  if (!val) return '0';
  const cleaned = String(val).replace(/[^0-9-]/g, '');
  return formatRupiah(parseInt(cleaned || '0', 10));
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

const resolveByName = (list, name) => {
  if (!name) return undefined;
  const needle = String(name).trim().toLowerCase();
  return list.find(x => String(x.name).trim().toLowerCase() === needle);
};

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/dry-run-import.mjs <path-to-excel-or-csv>');
    process.exit(1);
  }

  console.log('Loading budgets & wallets from Firestore...');
  const [budgetsSnap, walletsSnap] = await Promise.all([
    getDocs(collection(db, 'budgets')),
    getDocs(collection(db, 'wallets'))
  ]);
  const budgets = budgetsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const wallets = walletsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Budgets: ${budgets.length}, Wallets: ${wallets.length}`);

  console.log('Reading file:', filePath);
  const fs = await import('fs').then(m => m.default);
  const data = fs.readFileSync(filePath);
  const wb = XLSX.read(data, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', cellDates: true });
  console.log(`Rows: ${rows.length}`);

  let success = 0;
  const errors = [];

  rows.forEach((r, idx) => {
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
      errors.push({ index: idx + 1, reason: 'Tipe tidak valid' });
      return;
    }

    const dateStr = tanggal ? String(tanggal).slice(0, 10) : new Date().toISOString().split('T')[0];
    if (!isCurrentMonth(dateStr)) {
      errors.push({ index: idx + 1, reason: 'Tanggal di luar bulan berjalan' });
      return;
    }

    const amountStr = normalizeAmount(nominalRaw);
    const amountVal = parseRupiah(amountStr);
    if (amountVal <= 0) {
      errors.push({ index: idx + 1, reason: 'Nominal harus > 0' });
      return;
    }

    try {
      if (tipe === 'income') {
        const wallet = resolveByName(wallets, target || toCol || fromCol);
        if (!wallet) throw new Error('Wallet tidak ditemukan');
        const newBalance = parseRupiah(wallet.amount) + amountVal;
        console.log(`[INCOME] ${ket} -> Wallet ${wallet.name} | +${amountVal} => ${formatRupiah(newBalance)}`);
        success++;
      } else if (tipe === 'expense') {
        const budget = resolveByName(budgets, target || toCol || fromCol);
        if (!budget) throw new Error('Budget tidak ditemukan');
        const newAmount = parseRupiah(budget.amount) - amountVal;
        if (newAmount < 0) throw new Error('Budget tidak cukup');
        console.log(`[EXPENSE] ${ket} -> Budget ${budget.name} | -${amountVal} => ${formatRupiah(newAmount)}`);
        success++;
      } else if (tipe === 'transfer') {
        const { fromName, toName } = parseTargetsForTransfer(target, fromCol, toCol);
        if (!fromName || !toName) throw new Error('Target transfer tidak valid (butuh asal & tujuan)');

        const fromWallet = resolveByName(wallets, fromName);
        const fromBudget = resolveByName(budgets, fromName);
        const toWallet = resolveByName(wallets, toName);
        const toBudget = resolveByName(budgets, toName);

        const source = fromWallet || fromBudget;
        const dest = toWallet || toBudget;
        if (!source || !dest) throw new Error('Sumber/Tujuan tidak ditemukan');
        const sourceType = fromWallet ? 'wallet' : 'budget';
        const destType = toWallet ? 'wallet' : 'budget';

        const currentSourceAmount = parseRupiah(source.amount);
        if (currentSourceAmount < amountVal) throw new Error('Saldo sumber tidak cukup');

        const currentDestAmount = parseRupiah(dest.amount);
        let destLimitChange = '';
        if (destType === 'budget') {
          const currentLimit = parseRupiah(dest.limit || '0');
          destLimitChange = `, limit +${amountVal} => ${formatRupiah(currentLimit + amountVal)}`;
        }
        console.log(`[TRANSFER] ${ket} ${source.name}(${sourceType}) -> ${dest.name}(${destType}) | -${amountVal} / +${amountVal}${destLimitChange}`);
        success++;
      }
    } catch (err) {
      errors.push({ index: idx + 1, reason: err.message || 'Gagal import baris' });
    }
  });

  console.log('Summary:');
  console.log(`  Berhasil (simulasi): ${success}`);
  console.log(`  Gagal: ${errors.length}`);
  if (errors.length) {
    console.log('Errors detail (max 30):');
    errors.slice(0, 30).forEach(e => console.log(`  Baris ${e.index}: ${e.reason}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
