import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchCashFlowStatement } from '../../../../services/reportService';
import { formatCurrency } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import ExportOptions from '../components/ExportOptions';
import ReportHeader from '../components/ReportHeader';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const CashFlowStatement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of current year
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [comparativeMode, setComparativeMode] = useState(false);
  const [compareRange, setCompareRange] = useState({
    start: new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0], // Start of last year
    end: new Date(new Date().getFullYear() - 1, 11, 31).toISOString().split('T')[0] // End of last year
  });

  useEffect(() => {
    loadCashFlowStatement();
  }, [dateRange, comparativeMode, compareRange]);

  const loadCashFlowStatement = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('startDate', dateRange.start);
      params.append('endDate', dateRange.end);
      
      if (comparativeMode) {
        params.append('compareStartDate', compareRange.start);
        params.append('compareEndDate', compareRange.end);
      }
      
      const data = await fetchCashFlowStatement(params);
      setCashFlow(data);
    } catch (err) {
      console.error('Error loading cash flow statement:', err);
      setError('Failed to load cash flow data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    // This would be implemented in the reportService
    // Example: await exportCashFlow(format, dateRange, comparativeMode ? compareRange : null);
    alert(`Exporting Cash Flow Statement as ${format}...`);
  };

  // Helper to render a section of the cash flow statement
  const renderSection = (title, items, totalAmount, compareAmount = null) => (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <div className="bg-white shadow overflow-hidden rounded-md">
        <ul className="divide-y divide-gray-200">
          {items.map((item, index) => (
            <li key={index} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">{item.description}</div>
                <div className="flex space-x-6">
                  {comparativeMode && (
                    <div className="text-sm text-gray-700">
                      {formatCurrency(item.compareAmount || 0)}
                    </div>
                  )}
                  <div className="text-sm text-gray-900">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              </div>
            </li>
          ))}
          <li className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">Net Cash from {title}</div>
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
            <h2 className="text-lg leading-6 font-medium text-gray-900">Cash Flow Statement</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Track how cash is flowing into and out of your business
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <DateRangePicker 
              value={dateRange}
              onChange={setDateRange}
              buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        ) : cashFlow ? (
          <div className="px-4 py-5 sm:p-6">
            <ReportHeader 
              title="Cash Flow Statement"
              subtitle={`${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`}
              company={cashFlow.companyName}
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
              
              {/* Opening Balance */}
              <div className="mb-6">
                <div className="bg-white shadow overflow-hidden rounded-md">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-900">Opening Cash Balance</div>
                      <div className="flex space-x-6">
                        {comparativeMode && (
                          <div className="text-sm font-bold text-gray-700">
                            {formatCurrency(cashFlow.compareOpeningBalance || 0)}
                          </div>
                        )}
                        <div className="text-sm font-bold text-gray-900">
                          {formatCurrency(cashFlow.openingBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Operating Activities Section */}
              {renderSection(
                'Operating Activities', 
                cashFlow.operatingActivities, 
                cashFlow.netOperatingCash,
                comparativeMode ? cashFlow.compareOperatingCash : null
              )}
              
              {/* Investing Activities Section */}
              {renderSection(
                'Investing Activities', 
                cashFlow.investingActivities, 
                cashFlow.netInvestingCash,
                comparativeMode ? cashFlow.compareInvestingCash : null
              )}
              
              {/* Financing Activities Section */}
              {renderSection(
                'Financing Activities', 
                cashFlow.financingActivities, 
                cashFlow.netFinancingCash,
                comparativeMode ? cashFlow.compareFinancingCash : null
              )}
              
              {/* Net Change in Cash */}
              <div className="mb-6">
                <div className="bg-gray-100 rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-gray-900">Net Change in Cash</div>
                    <div className="flex space-x-6">
                      {comparativeMode && (
                        <div className="font-bold text-gray-700">
                          {formatCurrency((cashFlow.compareOperatingCash || 0) + 
                                         (cashFlow.compareInvestingCash || 0) + 
                                         (cashFlow.compareFinancingCash || 0))}
                        </div>
                      )}
                      <div className="font-bold text-gray-900">
                        {formatCurrency(cashFlow.netCashChange)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Closing Balance */}
              <div className="bg-white shadow overflow-hidden rounded-md">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-900">Closing Cash Balance</div>
                    <div className="flex space-x-6">
                      {comparativeMode && (
                        <div className="text-sm font-bold text-gray-700">
                          {formatCurrency((cashFlow.compareOpeningBalance || 0) + 
                                         (cashFlow.compareOperatingCash || 0) + 
                                         (cashFlow.compareInvestingCash || 0) + 
                                         (cashFlow.compareFinancingCash || 0))}
                        </div>
                      )}
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(cashFlow.closingBalance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <p className="text-gray-500">No cash flow data available.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashFlowStatement;
