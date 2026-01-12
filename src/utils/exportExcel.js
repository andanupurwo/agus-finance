import * as XLSX from 'xlsx';

export const exportToExcel = (transactions, month, filterType) => {
  // Validasi input
  if (!transactions || !Array.isArray(transactions)) {
    alert('❌ Tidak ada transaksi untuk diexport');
    return;
  }
  if (transactions.length === 0) {
    alert('ℹ️ Daftar transaksi kosong');
    return;
  }

  // Prepare data for Excel
  const data = transactions.map((t, index) => ({
    'No': index + 1,
    'Tanggal': t.date || new Date(t.createdAt).toISOString().split('T')[0],
    'Waktu': t.time,
    'Tipe': t.type === 'income' ? 'Pemasukan' : t.type === 'expense' ? 'Pengeluaran' : 'Transfer',
    'Keterangan': t.title,
    'Target': t.target,
    'Nominal': t.amount.replace(/\./g, ''),
    'User': t.user
  }));

  // Calculate summary
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseInt(t.amount.replace(/\./g, '')), 0);
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseInt(t.amount.replace(/\./g, '')), 0);

  // Add summary rows (skip empty row)
  data.push({ 'No': '', 'Tanggal': 'RINGKASAN', 'Waktu': '', 'Tipe': '', 'Keterangan': '', 'Target': '', 'Nominal': '', 'User': '' });
  data.push({ 'No': '', 'Tanggal': 'Total Pemasukan', 'Waktu': '', 'Tipe': '', 'Keterangan': '', 'Target': '', 'Nominal': totalIncome, 'User': '' });
  data.push({ 'No': '', 'Tanggal': 'Total Pengeluaran', 'Waktu': '', 'Tipe': '', 'Keterangan': '', 'Target': '', 'Nominal': totalExpense, 'User': '' });
  data.push({ 'No': '', 'Tanggal': 'Selisih', 'Waktu': '', 'Tipe': '', 'Keterangan': '', 'Target': '', 'Nominal': totalIncome - totalExpense, 'User': '' });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // Tanggal
    { wch: 8 },  // Waktu
    { wch: 12 }, // Tipe
    { wch: 30 }, // Keterangan
    { wch: 20 }, // Target
    { wch: 15 }, // Nominal
    { wch: 10 }  // User
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaksi');

  // Generate filename
  const [year, monthNum] = month.split('-');
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const monthName = monthNames[parseInt(monthNum) - 1];
  const filterName = filterType === 'all' ? 'Semua' : 
                     filterType === 'income' ? 'Pemasukan' : 
                     filterType === 'expense' ? 'Pengeluaran' : 'Transfer';
  
  const filename = `Transaksi_${monthName}_${year}_${filterName}.xlsx`;

  // Download
  XLSX.writeFile(workbook, filename);
};
