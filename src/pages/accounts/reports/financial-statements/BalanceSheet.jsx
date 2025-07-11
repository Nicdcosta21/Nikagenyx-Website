import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchBalanceSheet } from '../../../../services/reportService';
import { formatCurrency } from '../../../../utils/formatters';
import DatePicker from '../../../../components/ui/DatePicker';
import ExportOptions from '../components/ExportOptions';
import ReportHeader from '../components/ReportHeader';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const BalanceSheet = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [comparativeMode, setComparativeMode] = useState(false);
  const [compareDate, setCompareDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
  );

  useEffect(() => {
    loadBalanceSheet();
  }, [asOfDate, comparativeMode, compareDate]);

  const loadBalanceSheet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('asOfDate', asOfDate);
      
      if (comparativeMode) {
        params.append('compareDate', compareDate);
      }
      
      const data = await fetchBalanceSheet(params);
      setBalanceSheet(data);
    } catch (err) {
      console.error('Error loading balance sheet:', err);
      setError('Failed to load balance sheet data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    // This would be implemented in the reportService
    // Example: await exportBalanceSheet(format, asOfDate, comparativeMode ? compareDate : null);
    alert(`Exporting Balance Sheet as ${format}...`);
  };

  // Helper to render a section of accounts (like Assets, Liabilities)
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Balance Sheet</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Financial statement showing assets, liabilities and equity
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <DatePicker 
              label="As of"
              value={asOfDate}
              onChange={setAsOfDate}
              className="sm:w-40"
            />
            
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
              <DatePicker 
                label="Compare to"
                value={compareDate}
                onChange={setCompareDate}
                className="sm:w-40"
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
        ) : balanceSheet ? (
          <div className="px-4 py-5 sm:p-6">
            <ReportHeader 
              title="Balance Sheet"
              subtitle={`As of ${new Date(asOfDate).toLocaleDateString()}`}
              company={balanceSheet.companyName}
            />
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              {/* Header for columns */}
              <div className="flex justify-end mb-4">
                {comparativeMode && (
                  <div className="text-sm font-medium text-gray-500 w-24 text-right">
                    {new Date(compareDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                )}
                <div className="text-sm font-medium text-gray-500 w-24 text-right ml-6">
                  {new Date(asOfDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              
              {/* Assets Section */}
              {renderSection(
                'Assets', 
                balanceSheet.assets, 
                balanceSheet.totalAssets,
                comparativeMode ? balanceSheet.compareAssets?.total : null
              )}
              
              {/* Liabilities Section */}
              {renderSection(
                'Liabilities', 
                balanceSheet.liabilities, 
                balanceSheet.totalLiabilities,
                comparativeMode ? balanceSheet.compareLiabilities?.total : null
              )}
              
              {/* Equity Section */}
              {renderSection(
                'Equity', 
                balanceSheet.equity, 
                balanceSheet.totalEquity,
                comparativeMode ? balanceSheet.compareEquity?.total : null
              )}
              
              {/* Total Liabilities and Equity */}
              <div className="bg-gray-100 rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-900">Total Liabilities and Equity</div>
                  <div className="flex space-x-6">
                    {comparativeMode && (
                      <div className="font-bold text-gray-700">
                        {formatCurrency((balanceSheet.compareLiabilities?.total || 0) + (balanceSheet.compareEquity?.total || 0))}
                      </div>
                    )}
                    <div className="font-bold text-gray-900">
                      {formatCurrency(balanceSheet.totalLiabilities + balanceSheet.totalEquity)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <p className="text-gray-500">No balance sheet data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceSheet;
