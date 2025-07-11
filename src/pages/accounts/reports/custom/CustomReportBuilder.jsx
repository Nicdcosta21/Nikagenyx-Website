import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  fetchAccounts, 
  fetchAccountTypes, 
  buildCustomReport, 
  saveCustomReport 
} from '../../../../services/reportService';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const CustomReportBuilder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    title: 'Custom Report',
    description: '',
    dateRange: {
      start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
      end: new Date().toISOString().split('T')[0] // Today
    },
    groupBy: 'none',
    compareMode: false,
    compareRange: {
      start: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0], // Start of last year
      end: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0] // End of last year
    },
    columns: ['account', 'type', 'current', 'ytd'],
    filters: {
      accountTypes: [],
      accounts: [],
      minAmount: '',
      maxAmount: ''
    },
    sortBy: 'account',
    sortDirection: 'asc'
  });
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch accounts and account types
        const [accountsData, typesData] = await Promise.all([
          fetchAccounts(),
          fetchAccountTypes()
        ]);
        
        setAccounts(accountsData);
        setAccountTypes(typesData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [field]: value
      }
    }));
  };

  const handleColumnToggle = (column) => {
    setReportConfig(prev => {
      const columns = [...prev.columns];
      
      if (columns.includes(column)) {
        return {
          ...prev,
          columns: columns.filter(c => c !== column)
        };
      } else {
        return {
          ...prev,
          columns: [...columns, column]
        };
      }
    });
  };

  const generatePreview = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const data = await buildCustomReport(reportConfig);
      setPreviewData(data);
    } catch (err) {
      console.error('Error generating report preview:', err);
      setError('Failed to generate report preview. Please check your configuration and try again.');
    } finally {
      setGenerating(false);
    }
  };

  const saveReport = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const result = await saveCustomReport(reportConfig);
      
      // Navigate to the saved report view
      navigate(`/accounts/reports/custom/view/${result.id}`);
    } catch (err) {
      console.error('Error saving report:', err);
      setError('Failed to save report. Please try again.');
      setSaving(false);
    }
  };

  // Helper to render the preview table
  const renderPreviewTable = () => {
    if (!previewData || !previewData.rows || previewData.rows.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500">No data available for the selected criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {reportConfig.columns.includes('account') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
              )}
              {reportConfig.columns.includes('type') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              )}
              {reportConfig.columns.includes('current') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
              )}
              {reportConfig.columns.includes('ytd') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  YTD Balance
                </th>
              )}
              {reportConfig.compareMode && reportConfig.columns.includes('compare') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comparative
                </th>
              )}
              {reportConfig.columns.includes('change') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Change
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewData.rows.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {reportConfig.columns.includes('account') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.accountName}
                  </td>
                )}
                {reportConfig.columns.includes('type') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.accountType}
                  </td>
                )}
                {reportConfig.columns.includes('current') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {row.currentBalance}
                  </td>
                )}
                {reportConfig.columns.includes('ytd') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {row.ytdBalance}
                  </td>
                )}
                {reportConfig.compareMode && reportConfig.columns.includes('compare') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {row.compareBalance}
                  </td>
                )}
                {reportConfig.columns.includes('change') && (
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                    parseFloat(row.percentChange) > 0 ? 'text-green-600' : 
                    parseFloat(row.percentChange) < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {row.percentChange}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {previewData.totals && (
            <tfoot className="bg-gray-100">
              <tr>
                {reportConfig.columns.includes('account') && (
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    Total
                  </td>
                )}
                {reportConfig.columns.includes('type') && (
                  <td className="px-6 py-3 text-sm font-bold text-gray-900"></td>
                )}
                {reportConfig.columns.includes('current') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {previewData.totals.currentBalance}
                  </td>
                )}
                {reportConfig.columns.includes('ytd') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {previewData.totals.ytdBalance}
                  </td>
                )}
                {reportConfig.compareMode && reportConfig.columns.includes('compare') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {previewData.totals.compareBalance}
                  </td>
                )}
                {reportConfig.columns.includes('change') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {previewData.totals.percentChange}%
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/reports"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Reports
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Custom Report Builder</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Create custom financial reports based on your specific requirements
          </p>
        </div>
        
        {error && (
          <div className="px-4 py-5 sm:p-6 bg-red-50 text-red-800">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="px-4 py-12 sm:p-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Report Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={reportConfig.title}
                    onChange={(e) => handleConfigChange('title', e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={reportConfig.description}
                    onChange={(e) => handleConfigChange('description', e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-4">
                <label className="block text-sm font-medium text-gray-700">Date Range</label>
                <div className="mt-1">
                  <DateRangePicker
                    value={reportConfig.dateRange}
                    onChange={(range) => handleConfigChange('dateRange', range)}
                    buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="groupBy" className="block text-sm font-medium text-gray-700">
                  Group By
                </label>
                <div className="mt-1">
                  <select
                    id="groupBy"
                    name="groupBy"
                    value={reportConfig.groupBy}
                    onChange={(e) => handleConfigChange('groupBy', e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="none">No Grouping</option>
                    <option value="type">Account Type</option>
                    <option value="parent">Parent Account</option>
                    <option value="month">Month</option>
                    <option value="quarter">Quarter</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comparative Mode
                </label>
                <div className="flex items-center">
                  <input
                    id="compareMode"
                    name="compareMode"
                    type="checkbox"
                    checked={reportConfig.compareMode}
                    onChange={(e) => handleConfigChange('compareMode', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="compareMode" className="ml-2 block text-sm text-gray-900">
                    Enable comparative data
                  </label>
                </div>
              </div>
              
              {reportConfig.compareMode && (
                <div className="sm:col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Compare to Date Range</label>
                  <div className="mt-1">
                    <DateRangePicker
                      value={reportConfig.compareRange}
                      onChange={(range) => handleConfigChange('compareRange', range)}
                      buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
                    />
                  </div>
                </div>
              )}
              
              <div className="sm:col-span-3">
                <label htmlFor="accountTypes" className="block text-sm font-medium text-gray-700">
                  Account Types (Filter)
                </label>
                <div className="mt-1">
                  <select
                    id="accountTypes"
                    name="accountTypes"
                    multiple
                    value={reportConfig.filters.accountTypes}
                    onChange={(e) => handleFilterChange('accountTypes', 
                      Array.from(e.target.selectedOptions, option => option.value)
                    )}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-32"
                  >
                    {accountTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple or leave empty for all</p>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="accounts" className="block text-sm font-medium text-gray-700">
                  Specific Accounts (Filter)
                </label>
                <div className="mt-1">
                  <select
                    id="accounts"
                    name="accounts"
                    multiple
                    value={reportConfig.filters.accounts}
                    onChange={(e) => handleFilterChange('accounts', 
                      Array.from(e.target.selectedOptions, option => option.value)
                    )}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md h-32"
                  >
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>{account.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple or leave empty for all</p>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Amount Range (Filter)
                </label>
                <div className="mt-1 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minAmount" className="block text-xs text-gray-500">
                      Min Amount
                    </label>
                    <input
                      type="number"
                      name="minAmount"
                      id="minAmount"
                      value={reportConfig.filters.minAmount}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxAmount" className="block text-xs text-gray-500">
                      Max Amount
                    </label>
                    <input
                      type="number"
                      name="maxAmount"
                      id="maxAmount"
                      value={reportConfig.filters.maxAmount}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Sorting
                </label>
                <div className="mt-1 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sortBy" className="block text-xs text-gray-500">
                      Sort By
                    </label>
                    <select
                      id="sortBy"
                      name="sortBy"
                      value={reportConfig.sortBy}
                      onChange={(e) => handleConfigChange('sortBy', e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="account">Account Name</option>
                      <option value="type">Account Type</option>
                      <option value="current">Current Balance</option>
                      <option value="ytd">YTD Balance</option>
                      {reportConfig.compareMode && <option value="compare">Comparative</option>}
                      <option value="change">% Change</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sortDirection" className="block text-xs text-gray-500">
                      Direction
                    </label>
                    <select
                      id="sortDirection"
                      name="sortDirection"
                      value={reportConfig.sortDirection}
                      onChange={(e) => handleConfigChange('sortDirection', e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Columns to Display
                </label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center">
                    <input
                      id="colAccount"
                      name="colAccount"
                      type="checkbox"
                      checked={reportConfig.columns.includes('account')}
                      onChange={() => handleColumnToggle('account')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colAccount" className="ml-2 block text-sm text-gray-900">
                      Account Name
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="colType"
                      name="colType"
                      type="checkbox"
                      checked={reportConfig.columns.includes('type')}
                      onChange={() => handleColumnToggle('type')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colType" className="ml-2 block text-sm text-gray-900">
                      Account Type
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="colCurrent"
                      name="colCurrent"
                      type="checkbox"
                      checked={reportConfig.columns.includes('current')}
                      onChange={() => handleColumnToggle('current')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colCurrent" className="ml-2 block text-sm text-gray-900">
                      Current Balance
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="colYtd"
                      name="colYtd"
                      type="checkbox"
                      checked={reportConfig.columns.includes('ytd')}
                      onChange={() => handleColumnToggle('ytd')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colYtd" className="ml-2 block text-sm text-gray-900">
                      YTD Balance
                    </label>
                  </div>
                  {reportConfig.compareMode && (
                    <div className="flex items-center">
                      <input
                        id="colCompare"
                        name="colCompare"
                        type="checkbox"
                        checked={reportConfig.columns.includes('compare')}
                        onChange={() => handleColumnToggle('compare')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="colCompare" className="ml-2 block text-sm text-gray-900">
                        Comparative
                      </label>
                    </div>
                  )}
                  <div className="flex items-center">
                    <input
                      id="colChange"
                      name="colChange"
                      type="checkbox"
                      checked={reportConfig.columns.includes('change')}
                      onChange={() => handleColumnToggle('change')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="colChange" className="ml-2 block text-sm text-gray-900">
                      % Change
                    </label>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-gray-200 pt-8">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={generatePreview}
                  disabled={generating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  {generating ? 'Generating...' : 'Preview Report'}
                </button>
              </div>
            </div>
            
            {previewData && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Report Preview</h3>
                {renderPreviewTable()}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={saveReport}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                  >
                    {saving ? 'Saving...' : 'Save Report'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomReportBuilder;
