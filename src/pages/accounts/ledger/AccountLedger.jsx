import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAccountLedger, fetchAccountDetails } from '../../../services/ledgerService';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import DateRangePicker from '../../../components/ui/DateRangePicker';
import ExportButton from '../../../components/ui/ExportButton';

const AccountLedger = () => {
  const { accountId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [account, setAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st of current year
    end: new Date().toISOString().split('T')[0] // Today
  });
  
  // Calculate totals
  const totals = ledgerEntries.reduce((acc, entry) => {
    if (entry.type === 'debit') {
      acc.totalDebit += parseFloat(entry.amount);
    } else {
      acc.totalCredit += parseFloat(entry.amount);
    }
    return acc;
  }, { totalDebit: 0, totalCredit: 0 });
  
  const openingBalance = ledgerEntries.length > 0 ? 
    ledgerEntries[0].openingBalance : 
    (account ? account.openingBalance : 0);
  
  const closingBalance = ledgerEntries.length > 0 ? 
    ledgerEntries[ledgerEntries.length - 1].runningBalance : 
    openingBalance;

  // Load account details and ledger
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get account details
        const accountData = await fetchAccountDetails(accountId);
        setAccount(accountData);
        
        // Build query params for ledger
        const params = new URLSearchParams();
        params.append('accountId', accountId);
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);
        
        // Get ledger entries
        const ledgerData = await fetchAccountLedger(params);
        setLedgerEntries(ledgerData);
        setError(null);
      } catch (err) {
        console.error('Error loading account ledger:', err);
        setError('Failed to load ledger data. Please try again later.');
        setLedgerEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [accountId, dateRange]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };
  
  // Export ledger data
  const handleExport = (format) => {
    // Create export data structure
    const exportData = {
      title: `Account Ledger: ${account?.code} - ${account?.name}`,
      dateRange: `${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}`,
      headers: ['Date', 'Entry #', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'],
      data: ledgerEntries.map(entry => [
        formatDate(entry.date),
        entry.entryNumber,
        entry.description,
        entry.reference || '',
        entry.type === 'debit' ? formatCurrency(entry.amount, '') : '',
        entry.type === 'credit' ? formatCurrency(entry.amount, '') : '',
        formatCurrency(entry.runningBalance, '')
      ])
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
          {loading && !account ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : error && !account ? (
            <div className="text-red-600">Failed to load account details</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {account?.code} - {account?.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Account Type: {account?.type} {account?.subtype ? `/ ${account?.subtype}` : ''}
                </p>
              </div>
              <div className="flex justify-end items-center space-x-4">
                <DateRangePicker 
                  onChange={handleDateRangeChange} 
                  value={dateRange}
                  buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                />
                <ExportButton onExport={handleExport} />
              </div>
            </div>
          )}
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
        ) : ledgerEntries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no transactions for this account in the selected date range.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry #
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-50">
                    <td colSpan="6" className="px-6 py-2 text-left text-sm font-medium text-gray-900">
                      Opening Balance as of {formatDate(dateRange.start)}
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(openingBalance)}
                    </td>
                  </tr>
                  
                  {/* Transaction Rows */}
                  {ledgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(entry.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link 
                          to={`/accounts/journal/${entry.journalEntryId}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {entry.entryNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.reference || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {entry.type === 'debit' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {entry.type === 'credit' ? formatCurrency(entry.amount) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Summary Rows */}
                  <tr className="bg-gray-50">
                    <td colSpan="4" className="px-6 py-2 text-left text-sm font-medium text-gray-900">
                      Total for the period
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(totals.totalDebit)}
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(totals.totalCredit)}
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                    </td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td colSpan="6" className="px-6 py-2 text-left text-sm font-medium text-gray-900">
                      Closing Balance as of {formatDate(dateRange.end)}
                    </td>
                    <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(closingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountLedger;
