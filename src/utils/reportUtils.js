export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(2)}%`;
};

export const calculateGrowth = (current, previous) => {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
};

export const getReportingPeriods = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return {
    thisMonth: {
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentMonth + 1, 0)
    },
    lastMonth: {
      start: new Date(currentYear, currentMonth - 1, 1),
      end: new Date(currentYear, currentMonth, 0)
    },
    thisQuarter: {
      start: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
      end: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0)
    },
    lastQuarter: {
      start: new Date(currentYear, Math.floor(currentMonth / 3) * 3 - 3, 1),
      end: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 0)
    },
    thisYear: {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31)
    },
    lastYear: {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31)
    }
  };
};

export const groupByPeriod = (transactions, groupBy = 'month') => {
  const groups = {};
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    let key;
    
    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const firstDayOfWeek = new Date(date);
        firstDayOfWeek.setDate(date.getDate() - date.getDay());
        key = firstDayOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      default:
        key = 'all';
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(transaction);
  });
  
  return groups;
};

export const calculateTotals = (transactions) => {
  return transactions.reduce((totals, transaction) => {
    const amount = parseFloat(transaction.amount) || 0;
    
    if (transaction.type === 'debit') {
      totals.debits += amount;
    } else {
      totals.credits += amount;
    }
    
    totals.net = totals.credits - totals.debits;
    return totals;
  }, { debits: 0, credits: 0, net: 0 });
};

export const formatReportFileName = (reportName, format) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = reportName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${safeName}-${timestamp}.${format}`;
};
