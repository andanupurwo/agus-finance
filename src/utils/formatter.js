export const formatRupiah = (num) => new Intl.NumberFormat('id-ID').format(num);
export const parseRupiah = (str) => parseInt(str.replace(/\./g, '')) || 0;

export const isCurrentMonth = (dateString) => {
  const selectedDate = new Date(dateString);
  const today = new Date();
  return selectedDate.getFullYear() === today.getFullYear() && 
         selectedDate.getMonth() === today.getMonth();
};

export const getMonthRange = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    min: firstDay.toISOString().split('T')[0],
    max: lastDay.toISOString().split('T')[0]
  };
};

export const getCurrentMonthKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
};

export const hasMonthlyResetOccurred = () => {
  const currentMonth = getCurrentMonthKey();
  const lastResetMonth = localStorage.getItem('lastBudgetResetMonth');
  return lastResetMonth === currentMonth;
};

export const markMonthlyResetDone = () => {
  const currentMonth = getCurrentMonthKey();
  localStorage.setItem('lastBudgetResetMonth', currentMonth);
};
