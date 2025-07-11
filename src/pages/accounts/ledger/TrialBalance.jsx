import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTrialBalance } from '../../../services/ledgerService';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import DateRangePicker from '../../../components/ui/DateRangePicker';
import ExportButton from '../../../components/ui/ExportButton';

const TrialBalance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trialBalance, setTrialBalance] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st of current year
    end: new Date().toISOString().split('T')[0] // Today
  });
  
  // Calculate totals
  const totals = trialBalance.reduce((acc, item) => {
    acc.totalDebit += parseFloat(item.debitBalance || 0);
    acc.totalCredit += parseFloat(item.creditBalance || 0);
    return acc;
  }, { totalDebit: 0, totalCredit: 0 });

  // Load trial balance data
  useEffect(() => {
    const loadTrialBalance = async () => {
      try {
        setLoading(true);
        
        // Build query params
        const params = new URLSearchParams();
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);
        
        const data = await fetchTrialBalance(params);
        setTrialBalance(data);
        setError(null);
      } catch (err) {
        console.error('Error loading trial balance:', err);
        setError('Failed to load trial balance. Please try again later.');
        setTrialBalance([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTrialBalance();
  }, [dateRange]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };
  
  // Export trial balance data
  const handleExport = (format) => {
    // Create export data structure
    const exportData = {
      title: 'Trial Balance',
      dateRange: `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
      headers: ['Account Code', 'Account Name', 'Debit Balance', 'Credit Balance'],
      data: trialBalance.map(item => [
        item.accountCode,
        item.accountName,
        formatCurrency(item.debitBalance || 0, ''),
        formatCurrency(item.creditBalance || 0, '')
      ]),
      summary: {
        totalDebit: formatCurrency(totals.totalDebit, ''),
        totalCredit: formatCurrency(totals.totalCredit, '')
      }
    };
    
    // Use the export utility based on format (CSV, Excel, PDF)
    switch(format) {
      case 'csv':
        exportToCsv(exportData);
        break;
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'pdf':
        exportToPdf(exportData);
        break;
      default:
        console.error('Unsupported export format');
    }
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/ledger"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to General Ledger
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Trial Balance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Summary of all account balances as of {formatDate(dateRange.end)}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-4">
              <DateRangePicker 
                onChange={handleDateRangeChange} 
                value={dateRange}
                buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              />
              <ExportButton onExport={handleExport} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : trialBalance.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no accounts with transactions in the selected date range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit Balance
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trialBalance.map((item) => (
                  <tr key={item.accountId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.accountCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <Link 
                        to={`/accounts/ledger/account/${item.accountId}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {item.accountName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.debitBalance ? formatCurrency(item.debitBalance) : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.creditBalance ? formatCurrency(item.creditBalance) : ''}
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-gray-100">
                  <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {formatCurrency(totals.totalDebit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                    {formatCurrency(totals.totalCredit)}
                  </td>
                </tr>
                
                {/* Difference Row */}
                {Math.abs(totals.totalDebit - totals.totalCredit) > 0.01 && (
                  <tr className="bg-red-50">
                    <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-700">
                      Difference
                    </td>
                    <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-700">
                      {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrialBalance;
