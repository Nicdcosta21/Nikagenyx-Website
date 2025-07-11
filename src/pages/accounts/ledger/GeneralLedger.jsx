import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchLedgerEntries } from '../../../services/ledgerService';
import { fetchAccounts } from '../../../services/accountService';
import { formatDate, formatCurrency } from '../../../utils/formatters';
import DateRangePicker from '../../../components/ui/DateRangePicker';
import FilterDropdown from '../../../components/ui/FilterDropdown';
import ExportButton from '../../../components/ui/ExportButton';

const GeneralLedger = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: {
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Jan 1st of current year
      end: new Date().toISOString().split('T')[0] // Today
    },
    accountType: 'all',
    accountId: 'all',
    searchQuery: ''
  });

  // Get unique account types from accounts
  useEffect(() => {
    const getAccountTypes = () => {
      const types = [...new Set(accounts.map(account => account.type))];
      return [
        { value: 'all', label: 'All Types' },
        ...types.map(type => ({ value: type, label: type }))
      ];
    };
    
    if (accounts.length > 0) {
      setAccountTypes(getAccountTypes());
    }
  }, [accounts]);

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await fetchAccounts();
        setAccounts(data);
      } catch (err) {
        console.error('Error loading accounts:', err);
        setError('Failed to load accounts. Please try again later.');
      }
    };
    
    loadAccounts();
  }, []);

  // Load ledger entries when filters change
  useEffect(() => {
    const loadLedger = async () => {
      try {
        setLoading(true);
        
        // Build query params
        const params = new URLSearchParams();
        if (filters.dateRange.start) params.append('startDate', filters.dateRange.start);
        if (filters.dateRange.end) params.append('endDate', filters.dateRange.end);
        if (filters.accountId !== 'all') params.append('accountId', filters.accountId);
        if (filters.accountType !== 'all') params.append('accountType', filters.accountType);
        
        const data = await fetchLedgerEntries(params);
        setLedgerEntries(data);
        setError(null);
      } catch (err) {
        console.error('Error loading ledger entries:', err);
        setError('Failed to load ledger data. Please try again later.');
        setLedgerEntries([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadLedger();
  }, [filters.dateRange, filters.accountId, filters.accountType]);

  // Filter accounts based on selected account type
  const filteredAccounts = accounts.filter(
    account => filters.accountType === 'all' || account.type === filters.accountType
  );
  
  // Filter ledger entries based on search query
  const filteredEntries = ledgerEntries.filter(entry =>
    entry.accountName.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
    entry.description.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
    entry.entryNumber.toLowerCase().includes(filters.searchQuery.toLowerCase())
  );

  const handleDateRangeChange = (range) => {
    setFilters({
      ...filters,
      dateRange: range
    });
  };

  const handleAccountTypeChange = (value) => {
    setFilters({
      ...filters,
      accountType: value,
      accountId: 'all' // Reset account selection when account type changes
    });
  };

  const handleAccountChange = (value) => {
    setFilters({
      ...filters,
      accountId: value
    });
  };

  const handleSearchChange = (e) => {
    setFilters({
      ...filters,
      searchQuery: e.target.value
    });
  };
  
  // Export ledger data
  const handleExport = (format) => {
    // Create export data structure
    const exportData = {
      title: 'General Ledger',
      dateRange: `${formatDate(filters.dateRange.start)} to ${formatDate(filters.dateRange.end)}`,
      headers: ['Date', 'Entry #', 'Account', 'Description', 'Debit', 'Credit', 'Balance'],
      data: filteredEntries.map(entry => [
        formatDate(entry.date),
        entry.entryNumber,
        `${entry.accountCode} - ${entry.accountName}`,
        entry.description,
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
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <DateRangePicker 
                onChange={handleDateRangeChange} 
                value={filters.dateRange}
                buttonClass="bg-white w-full border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <FilterDropdown
                options={accountTypes}
                value={filters.accountType}
                onChange={handleAccountTypeChange}
                fullWidth
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <FilterDropdown
                options={[
                  { value: 'all', label: 'All Accounts' },
                  ...filteredAccounts.map(account => ({
                    value: account.id,
                    label: `${account.code} - ${account.name}`
                  }))
                ]}
                value={filters.accountId}
                onChange={handleAccountChange}
                fullWidth
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="relative rounded-md shadow-sm max-w-xs flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search ledger entries"
                className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                value={filters.searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="ml-4 flex items-center space-x-4">
              <Link
                to="/accounts/ledger/trial-balance"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Trial Balance
              </Link>
              
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
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No ledger entries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        ) : (
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
                    Account
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {filteredEntries.map((entry, index) => {
                  // Determine if this is a new account section
                  const isNewAccount = index === 0 || 
                    filteredEntries[index - 1].accountId !== entry.accountId;
                  
                  // Show account header and opening balance if it's a new account section
                  return (
                    <React.Fragment key={entry.id}>
                      {isNewAccount && (
                        <>
                          <tr className="bg-gray-50">
                            <td colSpan="7" className="px-6 py-3 text-left text-sm font-medium text-gray-900">
                              <Link 
                                to={`/accounts/ledger/account/${entry.accountId}`}
                                className="hover:text-indigo-600"
                              >
                                <span className="font-bold">{entry.accountCode} - {entry.accountName}</span>
                              </Link>
                            </td>
                          </tr>
                          <tr className="bg-gray-50">
                            <td colSpan="6" className="px-6 py-2 text-left text-sm text-gray-500">
                              Opening Balance
                            </td>
                            <td className="px-6 py-2 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(entry.openingBalance)}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.contraAccountCode} - {entry.contraAccountName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {entry.description}
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
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
