export const reportTemplates = {
  // Balance Sheet template
  balanceSheet: {
    title: 'Balance Sheet',
    type: 'financial-statement',
    sections: [
      {
        title: 'Assets',
        accountTypes: ['asset'],
        totalLabel: 'Total Assets'
      },
      {
        title: 'Liabilities',
        accountTypes: ['liability'],
        totalLabel: 'Total Liabilities'
      },
      {
        title: 'Equity',
        accountTypes: ['equity'],
        totalLabel: 'Total Equity'
      }
    ],
    options: {
      showComparative: true,
      showPercentages: true,
      showTotals: true
    }
  },
  
  // Profit & Loss template
  profitLoss: {
    title: 'Profit & Loss Statement',
    type: 'financial-statement',
    sections: [
      {
        title: 'Income',
        accountTypes: ['income'],
        totalLabel: 'Total Income'
      },
      {
        title: 'Expenses',
        accountTypes: ['expense'],
        totalLabel: 'Total Expenses'
      }
    ],
    options: {
      showComparative: true,
      showPercentages: true,
      showTotals: true,
      showNetIncome: true
    }
  },
  
  // Cash Flow template
  cashFlow: {
    title: 'Cash Flow Statement',
    type: 'financial-statement',
    sections: [
      {
        title: 'Operating Activities',
        accountTypes: ['operating'],
        totalLabel: 'Net Cash from Operations'
      },
      {
        title: 'Investing Activities',
        accountTypes: ['investing'],
        totalLabel: 'Net Cash from Investing'
      },
      {
        title: 'Financing Activities',
        accountTypes: ['financing'],
        totalLabel: 'Net Cash from Financing'
      }
    ],
    options: {
      showComparative: true,
      showPercentages: false,
      showTotals: true,
      showNetChange: true
    }
  },
  
  // Trial Balance template
  trialBalance: {
    title: 'Trial Balance',
    type: 'accounting',
    columns: [
      {
        key: 'account',
        label: 'Account',
        width: '40%'
      },
      {
        key: 'debit',
        label: 'Debit',
        width: '30%',
        align: 'right'
      },
      {
        key: 'credit',
        label: 'Credit',
        width: '30%',
        align: 'right'
      }
    ],
    options: {
      showTotals: true,
      sortBy: 'account'
    }
  },
  
  // General Ledger template
  generalLedger: {
    title: 'General Ledger',
    type: 'accounting',
    columns: [
      {
        key: 'date',
        label: 'Date',
        width: '15%'
      },
      {
        key: 'description',
        label: 'Description',
        width: '35%'
      },
      {
        key: 'reference',
        label: 'Reference',
        width: '15%'
      },
      {
        key: 'debit',
        label: 'Debit',
        width: '15%',
        align: 'right'
      },
      {
        key: 'credit',
        label: 'Credit',
        width: '15%',
        align: 'right'
      },
      {
        key: 'balance',
        label: 'Balance',
        width: '15%',
        align: 'right'
      }
    ],
    options: {
      groupBy: 'account',
      showRunningBalance: true,
      sortBy: 'date'
    }
  },
  
  // Tax Summary template
  taxSummary: {
    title: 'Tax Summary',
    type: 'tax',
    sections: [
      {
        title: 'GST Summary',
        subsections: [
          {
            key: 'collected',
            label: 'GST Collected'
          },
          {
            key: 'paid',
            label: 'GST Paid'
          },
          {
            key: 'netGst',
            label: 'Net GST Payable/Receivable'
          }
        ]
      },
      {
        title: 'TDS Summary',
        subsections: [
          {
            key: 'deducted',
            label: 'TDS Deducted'
          },
          {
            key: 'paid',
            label: 'TDS Paid'
          },
          {
            key: 'netTds',
            label: 'Net TDS Payable'
          }
        ]
      }
    ],
    options: {
      showMonthlyBreakdown: true,
      showQuarterlyTotals: true
    }
  }
};

export const formatOptions = [
  {
    id: 'pdf',
    label: 'PDF Document',
    icon: 'document',
    mimeType: 'application/pdf'
  },
  {
    id: 'excel',
    label: 'Excel Spreadsheet',
    icon: 'table',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  {
    id: 'csv',
    label: 'CSV File',
    icon: 'database',
    mimeType: 'text/csv'
  }
];

export const scheduleFrequencies = [
  {
    id: 'daily',
    label: 'Daily',
    description: 'Report will be generated every day'
  },
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Report will be generated once a week'
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Report will be generated once a month'
  },
  {
    id: 'quarterly',
    label: 'Quarterly',
    description: 'Report will be generated every three months'
  }
];

export const defaultReportOptions = {
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: {
    decimals: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: '1in',
    bottom: '1in',
    left: '1in',
    right: '1in'
  },
  header: {
    showLogo: true,
    showCompanyName: true,
    showReportTitle: true,
    showDateTime: true
  },
  footer: {
    showPageNumber: true,
    showTotalPages: true
  }
};
