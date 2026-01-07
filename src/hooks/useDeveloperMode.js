import { addDoc, collection, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { formatRupiah, parseRupiah } from '../utils/formatter';

export const useDeveloperMode = (showToast, showConfirm) => {
  const loadDummyData = async (setLoading) => {
    const confirmed = await showConfirm?.("Load dummy data untuk testing? Ini akan menambahkan data contoh.");
    if (!confirmed) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // WALLETS - 4 diversifikasi
        const wallet1Ref = doc(collection(db, "wallets"));
      batch.set(wallet1Ref, {
        name: "Bank Muamalat",
        description: "Tabungan Utama Keluarga",
        amount: formatRupiah(12450000),
        type: "Rekening",
        color: "from-blue-800 to-blue-900 border-blue-700",
        createdAt: Date.now() - 10000
      });
      
      const wallet2Ref = doc(collection(db, "wallets"));
      batch.set(wallet2Ref, {
        name: "Dompet Cash",
        description: "Uang tunai harian",
        amount: formatRupiah(1240000),
        type: "Cash",
        color: "from-emerald-800 to-emerald-900 border-emerald-700",
        createdAt: Date.now() - 9000
      });

      const wallet3Ref = doc(collection(db, "wallets"));
      batch.set(wallet3Ref, {
        name: "Emas Pegadaian",
        description: "Investasi jangka panjang",
        amount: formatRupiah(8000000),
        type: "Investasi",
        color: "from-yellow-700 to-yellow-900 border-yellow-700",
        createdAt: Date.now() - 8000
      });

      const wallet4Ref = doc(collection(db, "wallets"));
      batch.set(wallet4Ref, {
        name: "E-Wallet",
        description: "Gopay, OVO, Dana",
        amount: formatRupiah(850000),
        type: "Digital",
        color: "from-purple-800 to-purple-900 border-purple-700",
        createdAt: Date.now() - 7500
      });

      // BUDGETS - tampilkan semua status traffic light
      // CATATAN: Ini adalah sisa budget setelah transaksi Januari 2026
      // Untuk simulasi Desember 2025, budget akan memiliki sisa yang berbeda
      const budget1Ref = doc(collection(db, "budgets"));
      batch.set(budget1Ref, {
        name: "Makan & Minum",
        description: "Masak, Gofood, Galon",
        amount: formatRupiah(1450000),  // Sisa 1.45jt dari 3jt = 48% terpakai = GREEN
        limit: formatRupiah(3000000),
        color: "bg-red-900 text-red-200 border border-red-800",
        bar: "bg-red-500",
        createdAt: Date.now() - 7000
      });

      const budget2Ref = doc(collection(db, "budgets"));
      batch.set(budget2Ref, {
        name: "Transportasi",
        description: "Bensin, Gocar, Parkir",
        amount: formatRupiah(400000),  // Sisa 400K dari 1.2jt = 67% terpakai = YELLOW
        limit: formatRupiah(1200000),
        color: "bg-blue-900 text-blue-200 border border-blue-800",
        bar: "bg-blue-500",
        createdAt: Date.now() - 6000
      });

      const budget3Ref = doc(collection(db, "budgets"));
      batch.set(budget3Ref, {
        name: "Rumah Tangga",
        description: "Listrik, Internet, Air, Token",
        amount: formatRupiah(150000),  // Sisa 150K dari 2jt = 92% terpakai = RED
        limit: formatRupiah(2000000),
        color: "bg-orange-900 text-orange-200 border border-orange-800",
        bar: "bg-orange-500",
        createdAt: Date.now() - 5000
      });

      const budget4Ref = doc(collection(db, "budgets"));
      batch.set(budget4Ref, {
        name: "Anak",
        description: "Popok, Susu, Obat, Mainan",
        amount: formatRupiah(550000),  // Sisa 550K dari 1.5jt = 63% terpakai = YELLOW
        limit: formatRupiah(1500000),
        color: "bg-pink-900 text-pink-200 border border-pink-800",
        bar: "bg-pink-500",
        createdAt: Date.now() - 4000
      });

      const budget5Ref = doc(collection(db, "budgets"));
      batch.set(budget5Ref, {
        name: "Hiburan",
        description: "Netflix, Nonton, Rekreasi",
        amount: formatRupiah(750000),  // Sisa 750K dari 800K = 6% terpakai = GREEN
        limit: formatRupiah(800000),
        color: "bg-indigo-900 text-indigo-200 border border-indigo-800",
        bar: "bg-indigo-500",
        createdAt: Date.now() - 3500
      });

      // ===================================
      // TRANSAKSI DESEMBER 2025
      // Untuk simulasi rollover budget
      // ===================================

      // 1 Des - Setup Budget Desember
      const transDec1Ref = doc(collection(db, "transactions"));
      batch.set(transDec1Ref, {
        title: "💰 Gaji Desember",
        amount: formatRupiah(14000000),
        type: "income",
        user: "Purwo",
        time: "08:00",
        date: "2025-12-01",
          target: "Bank Muamalat",
        targetId: wallet1Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2025-12-01T08:00:00").getTime()
      });

      const transDec2Ref = doc(collection(db, "transactions"));
      batch.set(transDec2Ref, {
        title: "🔄 Setup Budget Makan Des",
        amount: formatRupiah(2500000),
        type: "transfer",
        user: "Purwo",
        time: "09:00",
        date: "2025-12-01",
          target: "Bank Muamalat -> Makan & Minum",
        fromId: wallet1Ref.id,
        toId: budget1Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2025-12-01T09:00:00").getTime()
      });

      const transDec3Ref = doc(collection(db, "transactions"));
      batch.set(transDec3Ref, {
        title: "🔄 Setup Budget Transport Des",
        amount: formatRupiah(1000000),
        type: "transfer",
        user: "Purwo",
        time: "09:15",
        date: "2025-12-01",
          target: "Bank Muamalat -> Transportasi",
        fromId: wallet1Ref.id,
        toId: budget2Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2025-12-01T09:15:00").getTime()
      });

      const transDec4Ref = doc(collection(db, "transactions"));
      batch.set(transDec4Ref, {
        title: "🔄 Setup Budget RT Des",
        amount: formatRupiah(1800000),
        type: "transfer",
        user: "Ashri",
        time: "09:30",
        date: "2025-12-01",
          target: "Bank Muamalat -> Rumah Tangga",
        fromId: wallet1Ref.id,
        toId: budget3Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2025-12-01T09:30:00").getTime()
      });

      const transDec5Ref = doc(collection(db, "transactions"));
      batch.set(transDec5Ref, {
        title: "🔄 Setup Budget Anak Des",
        amount: formatRupiah(1200000),
        type: "transfer",
        user: "Ashri",
        time: "09:45",
        date: "2025-12-01",
          target: "Bank Muamalat -> Anak",
        fromId: wallet1Ref.id,
        toId: budget4Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2025-12-01T09:45:00").getTime()
      });

      const transDec6Ref = doc(collection(db, "transactions"));
      batch.set(transDec6Ref, {
        title: "🔄 Setup Budget Hiburan Des",
        amount: formatRupiah(700000),
        type: "transfer",
        user: "Purwo",
        time: "10:00",
        date: "2025-12-01",
          target: "Bank Muamalat -> Hiburan",
        fromId: wallet1Ref.id,
        toId: budget5Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2025-12-01T10:00:00").getTime()
      });

      // Transaksi Desember - berbagai pengeluaran
      const transDec7Ref = doc(collection(db, "transactions"));
      batch.set(transDec7Ref, {
        title: "🍜 Belanja Bulanan",
        amount: formatRupiah(800000),
        type: "expense",
        user: "Ashri",
        time: "10:00",
        date: "2025-12-05",
          target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-05T10:00:00").getTime()
      });

      const transDec8Ref = doc(collection(db, "transactions"));
      batch.set(transDec8Ref, {
        title: "⛽ Bensin Motor & Mobil",
        amount: formatRupiah(400000),
        type: "expense",
        user: "Purwo",
        time: "14:00",
        date: "2025-12-07",
          target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-07T14:00:00").getTime()
      });

      const transDec9Ref = doc(collection(db, "transactions"));
      batch.set(transDec9Ref, {
        title: "💡 Bayar Listrik Des",
        amount: formatRupiah(650000),
        type: "expense",
        user: "Ashri",
        time: "11:00",
        date: "2025-12-10",
          target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-10T11:00:00").getTime()
      });

      const transDec10Ref = doc(collection(db, "transactions"));
      batch.set(transDec10Ref, {
        title: "🍼 Popok & Susu",
        amount: formatRupiah(450000),
        type: "expense",
        user: "Ashri",
        time: "15:00",
        date: "2025-12-12",
          target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-12T15:00:00").getTime()
      });

      const transDec11Ref = doc(collection(db, "transactions"));
      batch.set(transDec11Ref, {
        title: "🍕 Makan Keluarga",
        amount: formatRupiah(350000),
        type: "expense",
        user: "Purwo",
        time: "19:00",
        date: "2025-12-15",
          target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-15T19:00:00").getTime()
      });

      const transDec12Ref = doc(collection(db, "transactions"));
      batch.set(transDec12Ref, {
        title: "🚗 Service Rutin",
        amount: formatRupiah(300000),
        type: "expense",
        user: "Purwo",
        time: "10:00",
        date: "2025-12-18",
          target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-18T10:00:00").getTime()
      });

      const transDec13Ref = doc(collection(db, "transactions"));
      batch.set(transDec13Ref, {
        title: "🌐 Internet Des",
        amount: formatRupiah(400000),
        type: "expense",
        user: "Purwo",
        time: "16:00",
        date: "2025-12-20",
          target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-20T16:00:00").getTime()
      });

      const transDec14Ref = doc(collection(db, "transactions"));
      batch.set(transDec14Ref, {
        title: "🎁 Kado Natal Anak",
        amount: formatRupiah(250000),
        type: "expense",
        user: "Ashri",
        time: "13:00",
        date: "2025-12-23",
          target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-23T13:00:00").getTime()
      });

      const transDec15Ref = doc(collection(db, "transactions"));
      batch.set(transDec15Ref, {
        title: "🎄 Makan Natal",
        amount: formatRupiah(500000),
        type: "expense",
        user: "Purwo",
        time: "18:00",
        date: "2025-12-25",
          target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-25T18:00:00").getTime()
      });

      const transDec16Ref = doc(collection(db, "transactions"));
      batch.set(transDec16Ref, {
        title: "🎉 Nonton Bioskop",
        amount: formatRupiah(200000),
        type: "expense",
        user: "Purwo",
        time: "15:00",
        date: "2025-12-28",
        target: "Hiburan",
        targetId: budget5Ref.id,
        targetType: 'budget',
        createdAt: new Date("2025-12-28T15:00:00").getTime()
      });

      // SISA BUDGET DESEMBER (yang akan di-rollover):
      // Makan: 2.5jt - 800K - 350K - 500K = 850K
      // Transport: 1jt - 400K - 300K = 300K  
      // RT: 1.8jt - 650K - 400K = 750K
      // Anak: 1.2jt - 450K - 250K = 500K
      // Hiburan: 700K - 200K = 500K
      // TOTAL SISA = 2.9 juta (akan masuk ke wallet di Jan)

      // TRANSACTIONS 1 JANUARI - DOMINASI INCOME BESAR
      // Gaji, bonus, dan setup budget awal
      const trans1Ref = doc(collection(db, "transactions"));
      batch.set(trans1Ref, {
        title: "💰 Gaji Bulanan",
        amount: formatRupiah(15000000),
        type: "income",
        user: "Purwo",
        time: "08:00",
        date: "2026-01-01",
        target: "Bank Muamalat",
        targetId: wallet1Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-01T08:00:00").getTime()
      });

      const trans2Ref = doc(collection(db, "transactions"));
      batch.set(trans2Ref, {
        title: "💵 Bonus Kinerja",
        amount: formatRupiah(5000000),
        type: "income",
        user: "Purwo",
        time: "08:30",
        date: "2026-01-01",
        target: "Bank Muamalat",
        targetId: wallet1Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-01T08:30:00").getTime()
      });

      const trans3Ref = doc(collection(db, "transactions"));
      batch.set(trans3Ref, {
        title: "💎 Tarik Profit Emas",
        amount: formatRupiah(3000000),
        type: "income",
        user: "Ashri",
        time: "09:00",
        date: "2026-01-01",
        target: "Emas Pegadaian",
        targetId: wallet3Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-01T09:00:00").getTime()
      });

      const trans4Ref = doc(collection(db, "transactions"));
      batch.set(trans4Ref, {
        title: "🔄 Alokasi Budget Makan",
        amount: formatRupiah(3000000),
        type: "transfer",
        user: "Purwo",
        time: "10:00",
        date: "2026-01-01",
        target: "Bank Muamalat -> Makan & Minum",
        fromId: wallet1Ref.id,
        toId: budget1Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2026-01-01T10:00:00").getTime()
      });

      const trans5Ref = doc(collection(db, "transactions"));
      batch.set(trans5Ref, {
        title: "🔄 Alokasi Transportasi",
        amount: formatRupiah(1200000),
        type: "transfer",
        user: "Purwo",
        time: "10:15",
        date: "2026-01-01",
        target: "Bank Muamalat -> Transportasi",
        fromId: wallet1Ref.id,
        toId: budget2Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2026-01-01T10:15:00").getTime()
      });

      const trans6Ref = doc(collection(db, "transactions"));
      batch.set(trans6Ref, {
        title: "🔄 Alokasi Rumah Tangga",
        amount: formatRupiah(2000000),
        type: "transfer",
        user: "Ashri",
        time: "10:30",
        date: "2026-01-01",
        target: "Bank Muamalat -> Rumah Tangga",
        fromId: wallet1Ref.id,
        toId: budget3Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2026-01-01T10:30:00").getTime()
      });

      const trans7Ref = doc(collection(db, "transactions"));
      batch.set(trans7Ref, {
        title: "🔄 Alokasi Budget Anak",
        amount: formatRupiah(1500000),
        type: "transfer",
        user: "Ashri",
        time: "10:45",
        date: "2026-01-01",
        target: "Bank Muamalat -> Anak",
        fromId: wallet1Ref.id,
        toId: budget4Ref.id,
        fromType: 'wallet',
        toType: 'budget',
        createdAt: new Date("2026-01-01T10:45:00").getTime()
      });

      const trans8Ref = doc(collection(db, "transactions"));
      batch.set(trans8Ref, {
        title: "🔄 Alokasi Hiburan",
        amount: formatRupiah(800000),
        type: "transfer",
        user: "Purwo",
        time: "11:00",
        date: "2026-01-01",
        target: "Bank Muamalat -> Hiburan",
        fromId: wallet1Ref.id,
        toId: budget5Ref.id,
        fromType: 'wallets',
        toType: 'budgets',
        createdAt: new Date("2026-01-01T11:00:00").getTime()
      });

      const trans9Ref = doc(collection(db, "transactions"));
      batch.set(trans9Ref, {
        title: "💰 Top Up E-Wallet",
        amount: formatRupiah(1000000),
        type: "income",
        user: "Purwo",
        time: "14:00",
        date: "2026-01-01",
        target: "E-Wallet",
        targetId: wallet4Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-01T14:00:00").getTime()
      });

      const trans10Ref = doc(collection(db, "transactions"));
      batch.set(trans10Ref, {
        title: "💰 Isi Cash Dompet",
        amount: formatRupiah(1500000),
        type: "income",
        user: "Ashri",
        time: "15:00",
        date: "2026-01-01",
        target: "Dompet Cash",
        targetId: wallet2Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-01T15:00:00").getTime()
      });

      // 2 JANUARI - Transaksi Lengkap Harian
      const trans11Ref = doc(collection(db, "transactions"));
      batch.set(trans11Ref, {
        title: "🍜 Sarapan Warteg",
        amount: formatRupiah(35000),
        type: "expense",
        user: "Purwo",
        time: "07:30",
        date: "2026-01-02",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T07:30:00").getTime()
      });

      const trans12Ref = doc(collection(db, "transactions"));
      batch.set(trans12Ref, {
        title: "⛽ Isi Bensin Pertalite",
        amount: formatRupiah(200000),
        type: "expense",
        user: "Purwo",
        time: "08:00",
        date: "2026-01-02",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T08:00:00").getTime()
      });

      const trans13Ref = doc(collection(db, "transactions"));
      batch.set(trans13Ref, {
        title: "🛒 Belanja Sayur Pasar",
        amount: formatRupiah(150000),
        type: "expense",
        user: "Ashri",
        time: "09:00",
        date: "2026-01-02",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T09:00:00").getTime()
      });

      const trans14Ref = doc(collection(db, "transactions"));
      batch.set(trans14Ref, {
        title: "🍼 Susu Formula Bayi",
        amount: formatRupiah(250000),
        type: "expense",
        user: "Ashri",
        time: "11:00",
        date: "2026-01-02",
        target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T11:00:00").getTime()
      });

      const trans15Ref = doc(collection(db, "transactions"));
      batch.set(trans15Ref, {
        title: "☕ Kopi Siang",
        amount: formatRupiah(25000),
        type: "expense",
        user: "Purwo",
        time: "13:00",
        date: "2026-01-02",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T13:00:00").getTime()
      });

      const trans16Ref = doc(collection(db, "transactions"));
      batch.set(trans16Ref, {
        title: "💡 Token Listrik 100K",
        amount: formatRupiah(100000),
        type: "expense",
        user: "Ashri",
        time: "15:00",
        date: "2026-01-02",
        target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T15:00:00").getTime()
      });

      const trans17Ref = doc(collection(db, "transactions"));
      batch.set(trans17Ref, {
        title: "🍕 Dinner Pizza",
        amount: formatRupiah(180000),
        type: "expense",
        user: "Purwo",
        time: "19:00",
        date: "2026-01-02",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-02T19:00:00").getTime()
      });

      // 3 JANUARI
      const trans18Ref = doc(collection(db, "transactions"));
      batch.set(trans18Ref, {
        title: "🚗 Parkir Mall",
        amount: formatRupiah(15000),
        type: "expense",
        user: "Ashri",
        time: "10:00",
        date: "2026-01-03",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-03T10:00:00").getTime()
      });

      const trans19Ref = doc(collection(db, "transactions"));
      batch.set(trans19Ref, {
        title: "🛍️ Belanja Popok",
        amount: formatRupiah(300000),
        type: "expense",
        user: "Ashri",
        time: "11:00",
        date: "2026-01-03",
        target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-03T11:00:00").getTime()
      });

      const trans20Ref = doc(collection(db, "transactions"));
      batch.set(trans20Ref, {
        title: "🍔 Makan KFC",
        amount: formatRupiah(120000),
        type: "expense",
        user: "Purwo",
        time: "12:30",
        date: "2026-01-03",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-03T12:30:00").getTime()
      });

      const trans21Ref = doc(collection(db, "transactions"));
      batch.set(trans21Ref, {
        title: "🧽 Sabun & Deterjen",
        amount: formatRupiah(85000),
        type: "expense",
        user: "Ashri",
        time: "14:00",
        date: "2026-01-03",
        target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-03T14:00:00").getTime()
      });

      const trans22Ref = doc(collection(db, "transactions"));
      batch.set(trans22Ref, {
        title: "🎮 Bayar Netflix",
        amount: formatRupiah(50000),
        type: "expense",
        user: "Purwo",
        time: "16:00",
        date: "2026-01-03",
        target: "Hiburan",
        targetId: budget5Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-03T16:00:00").getTime()
      });

      const trans23Ref = doc(collection(db, "transactions"));
      batch.set(trans23Ref, {
        title: "💰 Freelance Project",
        amount: formatRupiah(2500000),
        type: "income",
        user: "Purwo",
        time: "18:00",
        date: "2026-01-03",
        target: "Bank Muamalat",
        targetId: wallet1Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-03T18:00:00").getTime()
      });

      // 4 JANUARI
      const trans24Ref = doc(collection(db, "transactions"));
      batch.set(trans24Ref, {
        title: "🥤 Beli Galon",
        amount: formatRupiah(25000),
        type: "expense",
        user: "Ashri",
        time: "08:00",
        date: "2026-01-04",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T08:00:00").getTime()
      });

      const trans25Ref = doc(collection(db, "transactions"));
      batch.set(trans25Ref, {
        title: "🚕 Grab ke Dokter",
        amount: formatRupiah(85000),
        type: "expense",
        user: "Ashri",
        time: "09:30",
        date: "2026-01-04",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T09:30:00").getTime()
      });

      const trans26Ref = doc(collection(db, "transactions"));
      batch.set(trans26Ref, {
        title: "💊 Obat Batuk Anak",
        amount: formatRupiah(150000),
        type: "expense",
        user: "Ashri",
        time: "10:00",
        date: "2026-01-04",
        target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T10:00:00").getTime()
      });

      const trans27Ref = doc(collection(db, "transactions"));
      batch.set(trans27Ref, {
        title: "🍛 Catering Mingguan",
        amount: formatRupiah(400000),
        type: "expense",
        user: "Ashri",
        time: "12:00",
        date: "2026-01-04",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T12:00:00").getTime()
      });

      const trans28Ref = doc(collection(db, "transactions"));
      batch.set(trans28Ref, {
        title: "📱 Pulsa & Paket Data",
        amount: formatRupiah(150000),
        type: "expense",
        user: "Purwo",
        time: "14:00",
        date: "2026-01-04",
        target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T14:00:00").getTime()
      });

      const trans29Ref = doc(collection(db, "transactions"));
      batch.set(trans29Ref, {
        title: "⛽ Isi Bensin Motor",
        amount: formatRupiah(50000),
        type: "expense",
        user: "Purwo",
        time: "17:00",
        date: "2026-01-04",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-04T17:00:00").getTime()
      });

      // 5 JANUARI
      const trans30Ref = doc(collection(db, "transactions"));
      batch.set(trans30Ref, {
        title: "🏪 Minimarket Snack",
        amount: formatRupiah(75000),
        type: "expense",
        user: "Ashri",
        time: "09:00",
        date: "2026-01-05",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T09:00:00").getTime()
      });

      const trans31Ref = doc(collection(db, "transactions"));
      batch.set(trans31Ref, {
        title: "💈 Potong Rambut",
        amount: formatRupiah(50000),
        type: "expense",
        user: "Purwo",
        time: "10:30",
        date: "2026-01-05",
        target: "Hiburan",
        targetId: budget5Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T10:30:00").getTime()
      });

      const trans32Ref = doc(collection(db, "transactions"));
      batch.set(trans32Ref, {
        title: "🧸 Mainan Anak",
        amount: formatRupiah(200000),
        type: "expense",
        user: "Ashri",
        time: "13:00",
        date: "2026-01-05",
        target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T13:00:00").getTime()
      });

      const trans33Ref = doc(collection(db, "transactions"));
      batch.set(trans33Ref, {
        title: "🌐 Bayar IndiHome",
        amount: formatRupiah(400000),
        type: "expense",
        user: "Purwo",
        time: "15:00",
        date: "2026-01-05",
        target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T15:00:00").getTime()
      });

      const trans34Ref = doc(collection(db, "transactions"));
      batch.set(trans34Ref, {
        title: "🍜 Bakso Malam",
        amount: formatRupiah(60000),
        type: "expense",
        user: "Purwo",
        time: "19:00",
        date: "2026-01-05",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T19:00:00").getTime()
      });

      const trans35Ref = doc(collection(db, "transactions"));
      batch.set(trans35Ref, {
        title: "🚗 Service Motor",
        amount: formatRupiah(350000),
        type: "expense",
        user: "Purwo",
        time: "16:00",
        date: "2026-01-05",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-05T16:00:00").getTime()
      });

      // 6 JANUARI - Hari ini
      const trans36Ref = doc(collection(db, "transactions"));
      batch.set(trans36Ref, {
        title: "🍳 Telur & Roti",
        amount: formatRupiah(45000),
        type: "expense",
        user: "Ashri",
        time: "07:00",
        date: "2026-01-06",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-06T07:00:00").getTime()
      });

      const trans37Ref = doc(collection(db, "transactions"));
      batch.set(trans37Ref, {
        title: "🧴 Skincare Bayi",
        amount: formatRupiah(150000),
        type: "expense",
        user: "Ashri",
        time: "10:00",
        date: "2026-01-06",
        target: "Anak",
        targetId: budget4Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-06T10:00:00").getTime()
      });

      const trans38Ref = doc(collection(db, "transactions"));
      batch.set(trans38Ref, {
        title: "🚌 Ongkos Ojol",
        amount: formatRupiah(45000),
        type: "expense",
        user: "Purwo",
        time: "08:00",
        date: "2026-01-06",
        target: "Transportasi",
        targetId: budget2Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-06T08:00:00").getTime()
      });

      const trans39Ref = doc(collection(db, "transactions"));
      batch.set(trans39Ref, {
        title: "💡 Token Listrik 100K",
        amount: formatRupiah(100000),
        type: "expense",
        user: "Ashri",
        time: "12:00",
        date: "2026-01-06",
        target: "Rumah Tangga",
        targetId: budget3Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-06T12:00:00").getTime()
      });

      const trans40Ref = doc(collection(db, "transactions"));
      batch.set(trans40Ref, {
        title: "🍕 Lunch Keluarga",
        amount: formatRupiah(250000),
        type: "expense",
        user: "Purwo",
        time: "13:30",
        date: "2026-01-06",
        target: "Makan & Minum",
        targetId: budget1Ref.id,
        targetType: 'budget',
        createdAt: new Date("2026-01-06T13:30:00").getTime()
      });

      const trans41Ref = doc(collection(db, "transactions"));
      batch.set(trans41Ref, {
        title: "💰 Jual Barang Bekas",
        amount: formatRupiah(500000),
        type: "income",
        user: "Ashri",
        time: "15:00",
        date: "2026-01-06",
        target: "Dompet Cash",
        targetId: wallet2Ref.id,
        targetType: 'wallet',
        createdAt: new Date("2026-01-06T15:00:00").getTime()
      });

      await batch.commit();
      showToast?.("✅ Dummy data berhasil ditambahkan!", "success");
    } catch (e) { 
      showToast?.("Error: " + e.message, "error");
    }
    setLoading(false);
  }

  const loadDefaultCategories = async (setLoading) => {
    const confirmed = await showConfirm?.("Load kategori default untuk Wallet dan Budget?");
    if(!confirmed) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      const defaultWallets = [
        { name: "Tabungan", description: "Cash, Muamalat, Seabank", color: "from-blue-800 to-blue-900 border-blue-700" },
        { name: "Emas", description: "Fisik, Pegadaian Digital", color: "from-yellow-700 to-yellow-900 border-yellow-700" },
        { name: "Saham", description: "Bibit, Stockbit", color: "from-emerald-800 to-emerald-900 border-emerald-700" }
      ];

      defaultWallets.forEach((w, idx) => {
        const ref = doc(collection(db, "wallets"));
        batch.set(ref, {
          ...w,
          amount: "0",
          type: "Rekening",
          createdAt: Date.now() + idx
        });
      });

      const defaultBudgets = [
        { name: "Makan", description: "Masak, Gofood, Galon, Jajan", limit: "0", color: "bg-red-900 text-red-200 border border-red-800", bar: "bg-red-500" },
        { name: "Rumah Tangga", description: "Vitamin, Sewa Rumah, Internet, Listrik, Lampu, Kebersihan", limit: "0", color: "bg-orange-900 text-orange-200 border border-orange-800", bar: "bg-orange-500" },
        { name: "Anak", description: "Baju, Popok, Skincare, Dokter", limit: "0", color: "bg-pink-900 text-pink-200 border border-pink-800", bar: "bg-pink-500" },
        { name: "Transportasi", description: "Bensin, Gocar, Service", limit: "0", color: "bg-blue-900 text-blue-200 border border-blue-800", bar: "bg-blue-500" },
        { name: "Lain-lain", description: "Nyumbang, Sedekan Ortu, Infaq", limit: "0", color: "bg-purple-900 text-purple-200 border border-purple-800", bar: "bg-purple-500" }
      ];

      defaultBudgets.forEach((b, idx) => {
        const ref = doc(collection(db, "budgets"));
        batch.set(ref, {
          ...b,
          amount: "0",
          limit: "0",
          createdAt: Date.now() + idx + 100
        });
      });

      await batch.commit();
      showToast?.("✅ Kategori default berhasil ditambahkan!", "success");
    } catch (e) { 
      showToast?.("Error: " + e.message, "error");
    }
    setLoading(false);
  }

  const resetFactory = async (wallets, budgets, transactions, setLoading) => {
    const confirmed1 = await showConfirm?.("⚠️ RESET PABRIK: Semua data akan dihapus permanen! Lanjutkan?");
    if(!confirmed1) return;
    const confirmed2 = await showConfirm?.("Yakin? Ini tidak bisa dibatalkan!");
    if(!confirmed2) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      wallets.forEach(w => {
        batch.delete(doc(db, "wallets", w.id));
      });
      
      budgets.forEach(b => {
        batch.delete(doc(db, "budgets", b.id));
      });
      
      transactions.forEach(t => {
        batch.delete(doc(db, "transactions", t.id));
      });
      
      await batch.commit();
      showToast?.("✅ Reset pabrik berhasil! Semua data telah dihapus.", "success");
    } catch (e) { 
      showToast?.("Error: " + e.message, "error");
    }
    setLoading(false);
  }

  const clearTransactions = async (transactions, setLoading) => {
    const confirmed = await showConfirm?.("⚠️ Hapus semua transaksi? Wallet dan Budget tetap ada.");
    if(!confirmed) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      transactions.forEach(t => {
        batch.delete(doc(db, "transactions", t.id));
      });
      
      await batch.commit();
      showToast?.("✅ Semua transaksi berhasil dihapus!", "success");
    } catch (e) { 
      showToast?.("Error: " + e.message, "error");
    }
    setLoading(false);
  }

  const monthlyRollover = async (wallets, budgets, transactions, user, setLoading, skipConfirm = false) => {
    if (!skipConfirm) {
      const confirmed = await showConfirm?.("🔄 Monthly Rollover: Reset semua budget ke 0 dan kembalikan sisa ke Wallet Utama?");
      if(!confirmed) return;
    }
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      let totalSisa = 0;
      
      // Hitung total sisa dari semua budgets
      budgets.forEach(b => {
        totalSisa += parseRupiah(b.amount);
      });
      
      // Reset semua budgets ke 0
      budgets.forEach(b => {
        batch.update(doc(db, "budgets", b.id), { 
          amount: "0",
          limit: "0"
        });
      });
      
      // Cari Wallet Utama (wallet pertama atau yang paling besar saldonya)
      const mainWallet = wallets.length > 0 ? 
        wallets.reduce((prev, current) => 
          parseRupiah(current.amount) > parseRupiah(prev.amount) ? current : prev
        ) : null;
      
      if (mainWallet && totalSisa > 0) {
        const newWalletBalance = parseRupiah(mainWallet.amount) + totalSisa;
        batch.update(doc(db, "wallets", mainWallet.id), { 
          amount: formatRupiah(newWalletBalance)
        });
        
        // Catat transaksi rollover
        const transRef = doc(collection(db, "transactions"));
        batch.set(transRef, {
          title: "Monthly Rollover - Sisa Budget Bulan Lalu",
          amount: formatRupiah(totalSisa),
          type: "income",
          user: "System",
          time: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}),
          target: mainWallet.name,
          createdAt: Date.now()
        });
      }
      
      await batch.commit();
      showToast?.(`✅ Rollover berhasil! Rp ${formatRupiah(totalSisa)} dikembalikan ke ${mainWallet?.name || 'Wallet'}`, "success");
    } catch (e) { 
      showToast?.("Error: " + e.message, "error");
    }
    setLoading(false);
  }

  return {
    loadDummyData,
    loadDefaultCategories,
    resetFactory,
    clearTransactions,
    monthlyRollover
  };
};
