import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchProfitLossStatement } from '../../../../services/reportService';
import { formatCurrency } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import ExportOptions from '../components/ExportOptions';
import ReportHeader from '../components/ReportHeader';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const ProfitLossStatement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [comparativeMode, setComparativeMode] = useState(false);
  const [compareRange, setCompareRange] = useState({
    start: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0], // Start of last year
    end: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0] // End of last year
  });
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'month', 'quarter'

  useEffect(() => {
    loadProfitLossStatement();
  }, [dateRange, comparativeMode, compareRange, groupBy]);

  const loadProfitLossStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
      params.append('groupBy', groupBy);
      
      if (comparativeMode) {
        params.append('compareStartDate', compareRange.start);
        params.append('compareEndDate', compareRange.end);
      }
      
      const data = await fetchProfitLossStatement(params);
      setProfitLoss(data);
    } catch (err) {
      console.error('Error loading profit & loss statement:', err);
      setError('Failed to load profit & loss data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    // This would be implemented in the reportService
    // Example: await exportProfitLoss(format, dateRange, comparativeMode ? compareRange : null, groupBy);
    alert(`Exporting Profit & Loss as ${format}...`);
  };

  // Helper to render a section of accounts (like Income, Expenses)
  const renderSection = (title, accounts, totalAmount, compareAmount = null) => (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {accounts.map((account) => (
            <li key={account.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">{account.name}</div>
                <div className="flex space-x-6">
                  {comparativeMode && (
                    <div className="text-sm text-gray-700">
                      {formatCurrency(account.compareAmount || 0)}
                    </div>
                  )}
                  <div className="text-sm text-gray-900">
                    {formatCurrency(account.amount)}
                  </div>
                </div>
              </div>
            </li>
          ))}
          <li className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">Total {title}</div>
              <div className="flex space-x-6">
                {comparativeMode && (
                  <div className="text-sm font-bold text-gray-700">
                    {formatCurrency(compareAmount || 0)}
                  </div>
                )}
                <div className="text-sm font-bold text-gray-900">
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );

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
        <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center">
          <div>
            <h2 className="text-lg leading-6 font-medium text-gray-900">Profit & Loss Statement</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Income statement showing revenue, expenses, and net profit
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex flex-wrap space-x-3">
            <DateRangePicker 
              value={dateRange}
              onChange={setDateRange}
              buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            />
            
            <div className="inline-flex shadow-sm rounded-md">
              <button
                type="button"
                onClick={() => setGroupBy('none')}
                className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  groupBy === 'none' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                No Grouping
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('month')}
                className={`relative inline-flex items-center px-3 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium ${
                  groupBy === 'month' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('quarter')}
                className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  groupBy === 'quarter' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Quarterly
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="comparative"
                checked={comparativeMode}
                onChange={(e) => setComparativeMode(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="comparative" className="text-sm text-gray-700">
                Comparative
              </label>
            </div>
            
            {comparativeMode && (
              <DateRangePicker 
                value={compareRange}
                onChange={setCompareRange}
                buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              />
            )}
            
            <ExportOptions onExport={handleExport} />
          </div>
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
        ) : profitLoss ? (
          <div className="px-4 py-5 sm:p-6">
            <ReportHeader 
              title="Profit & Loss Statement"
              subtitle={`${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`}
              company={profitLoss.companyName}
            />
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              {/* Header for columns */}
              <div className="flex justify-end mb-4">
                {comparativeMode && (
                  <div className="text-sm font-medium text-gray-500 w-24 text-right">
                    Comparative
                  </div>
                )}
                <div className="text-sm font-medium text-gray-500 w-24 text-right ml-6">
                  Current
                </div>
              </div>
              
              {/* Income Section */}
              {renderSection(
                'Income', 
                profitLoss.income, 
                profitLoss.totalIncome,
                comparativeMode ? profitLoss.compareIncome?.total : null
              )}
              
              {/* Expenses Section */}
              {renderSection(
                'Expenses', 
                profitLoss.expenses, 
                profitLoss.totalExpenses,
                comparativeMode ? profitLoss.compareExpenses?.total : null
              )}
              
              {/* Net Profit / Loss */}
              <div className="bg-gray-100 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-900">Net Profit / (Loss)</div>
                  <div className="flex space-x-6">
                    {comparativeMode && (
                      <div className={`font-bold ${
                        (profitLoss.compareIncome?.total || 0) - (profitLoss.compareExpenses?.total || 0) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {formatCurrency((profitLoss.compareIncome?.total || 0) - (profitLoss.compareExpenses?.total || 0))}
                      </div>
                    )}
                    <div className={`font-bold ${
                      profitLoss.netProfit >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(profitLoss.netProfit)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <p className="text-gray-500">No profit & loss data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossStatement;
