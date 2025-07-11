import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMISReports } from '../../../../services/reportService';
import { formatCurrency, formatPercentage } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import KPICard from './components/KPICard';
import Chart from './components/Chart';

const MISReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchMISReports(dateRange);
      setData(result);
    } catch (err) {
      console.error('Error loading MIS reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
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

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg leading-6 font-medium text-gray-900">Management Information System</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Key performance indicators and business metrics
            </p>
          </div>
          
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          />
        </div>

        {error && (
          <div className="px-4 py-5 sm:p-6 bg-red-50 text-red-800">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="px-4 py-12 sm:p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : data ? (
          <div className="px-4 py-5 sm:p-6">
            {/* Financial Health KPIs */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Health</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Revenue"
                  value={formatCurrency(data.revenue.current)}
                  change={data.revenue.growth}
                  trend={data.revenue.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Net Profit"
                  value={formatCurrency(data.netProfit.current)}
                  change={data.netProfit.growth}
                  trend={data.netProfit.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Cash Balance"
                  value={formatCurrency(data.cashBalance.current)}
                  change={data.cashBalance.growth}
                  trend={data.cashBalance.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Working Capital"
                  value={formatCurrency(data.workingCapital.current)}
                  change={data.workingCapital.growth}
                  trend={data.workingCapital.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
              </div>
            </div>
            
            {/* Revenue & Expenses Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Expenses</h3>
              <div className="bg-white rounded-lg shadow">
                <Chart
                  data={data.revenueExpenses}
                  type="bar"
                  height={300}
                  options={{
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(value)
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'top'
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Profitability Metrics */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profitability Metrics</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <KPICard
                  title="Gross Profit Margin"
                  value={formatPercentage(data.grossMargin.current)}
                  change={data.grossMargin.growth}
                  trend={data.grossMargin.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Operating Margin"
                  value={formatPercentage(data.operatingMargin.current)}
                  change={data.operatingMargin.growth}
                  trend={data.operatingMargin.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Net Profit Margin"
                  value={formatPercentage(data.netMargin.current)}
                  change={data.netMargin.growth}
                  trend={data.netMargin.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
              </div>
            </div>
            
            {/* Efficiency Metrics */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Efficiency Metrics</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="Days Sales Outstanding"
                  value={`${data.dso.current.toFixed(1)} days`}
                  change={data.dso.growth}
                  trend={data.dso.growth <= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Days Payable Outstanding"
                  value={`${data.dpo.current.toFixed(1)} days`}
                  change={data.dpo.growth}
                  trend={data.dpo.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Inventory Turnover"
                  value={data.inventoryTurnover.current.toFixed(2)}
                  change={data.inventoryTurnover.growth}
                  trend={data.inventoryTurnover.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Asset Turnover"
                  value={data.assetTurnover.current.toFixed(2)}
                  change={data.assetTurnover.growth}
                  trend={data.assetTurnover.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
              </div>
            </div>
            
            {/* Liquidity Metrics */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Liquidity Metrics</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <KPICard
                  title="Current Ratio"
                  value={data.currentRatio.current.toFixed(2)}
                  change={data.currentRatio.growth}
                  trend={data.currentRatio.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Quick Ratio"
                  value={data.quickRatio.current.toFixed(2)}
                  change={data.quickRatio.growth}
                  trend={data.quickRatio.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
                
                <KPICard
                  title="Cash Ratio"
                  value={data.cashRatio.current.toFixed(2)}
                  change={data.cashRatio.growth}
                  trend={data.cashRatio.growth >= 0 ? 'up' : 'down'}
                  compareLabel="vs. previous period"
                />
              </div>
            </div>
            
            {/* Cash Flow Analysis */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow Analysis</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <Chart
                    data={data.cashFlow}
                    type="line"
                    height={300}
                    options={{
                      scales: {
                        y: {
                          ticks: {
                            callback: (value) => formatCurrency(value)
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          position: 'top'
                        }
                      }
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 px-4 py-5 bg-gray-50 sm:p-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Operating Cash Flow</h4>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(data.cashFlow.operating.current)}
                    </p>
                    <p className={`text-sm ${
                      data.cashFlow.operating.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(data.cashFlow.operating.growth)} vs. previous period
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Investing Cash Flow</h4>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(data.cashFlow.investing.current)}
                    </p>
                    <p className={`text-sm ${
                      data.cashFlow.investing.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(data.cashFlow.investing.growth)} vs. previous period
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Financing Cash Flow</h4>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(data.cashFlow.financing.current)}
                    </p>
                    <p className={`text-sm ${
                      data.cashFlow.financing.growth >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(data.cashFlow.financing.growth)} vs. previous period
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <p className="text-gray-500">No data available for the selected period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MISReports;
