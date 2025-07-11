import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { formatCurrency, formatPercentage } from '../../../utils/formatters';
import DashboardMetric from './DashboardMetric';
import DashboardChart from './DashboardChart';
import { getDashboardData } from '../../../services/dashboardService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FinancialDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // month, quarter, year
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 minutes
  const [layout, setLayout] = useState('default');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await getDashboardData(timeRange);
      setData(dashboardData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const renderMetrics = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardMetric
        title="Revenue"
        value={formatCurrency(data.revenue.current)}
        change={data.revenue.growth}
        trend={data.revenue.growth >= 0 ? 'up' : 'down'}
        sparklineData={data.revenue.trend}
      />
      
      <DashboardMetric
        title="Expenses"
        value={formatCurrency(data.expenses.current)}
        change={data.expenses.growth}
        trend={data.expenses.growth <= 0 ? 'up' : 'down'}
        sparklineData={data.expenses.trend}
      />
      
      <DashboardMetric
        title="Net Profit"
        value={formatCurrency(data.netProfit.current)}
        change={data.netProfit.growth}
        trend={data.netProfit.growth >= 0 ? 'up' : 'down'}
        sparklineData={data.netProfit.trend}
      />
      
      <DashboardMetric
        title="Cash Balance"
        value={formatCurrency(data.cashBalance.current)}
        change={data.cashBalance.growth}
        trend={data.cashBalance.growth >= 0 ? 'up' : 'down'}
        sparklineData={data.cashBalance.trend}
      />
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <DashboardChart
        title="Revenue vs Expenses"
        type="bar"
        data={{
          labels: data.monthlyTrend.labels,
          datasets: [
            {
              label: 'Revenue',
              data: data.monthlyTrend.revenue,
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1
            },
            {
              label: 'Expenses',
              data: data.monthlyTrend.expenses,
              backgroundColor: 'rgba(239, 68, 68, 0.5)',
              borderColor: 'rgb(239, 68, 68)',
              borderWidth: 1
            }
          ]
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => formatCurrency(value)
              }
            }
          }
        }}
      />

      <DashboardChart
        title="Cash Flow"
        type="line"
        data={{
          labels: data.cashFlow.labels,
          datasets: [
            {
              label: 'Operating',
              data: data.cashFlow.operating,
              borderColor: 'rgb(59, 130, 246)',
              fill: true,
              tension: 0.4
            },
            {
              label: 'Investing',
              data: data.cashFlow.investing,
              borderColor: 'rgb(16, 185, 129)',
              fill: true,
              tension: 0.4
            },
            {
              label: 'Financing',
              data: data.cashFlow.financing,
              borderColor: 'rgb(245, 158, 11)',
              fill: true,
              tension: 0.4
            }
          ]
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              ticks: {
                callback: (value) => formatCurrency(value)
              }
            }
          }
        }}
      />

      <DashboardChart
        title="Expense Breakdown"
        type="doughnut"
        data={{
          labels: data.expenseBreakdown.labels,
          datasets: [{
            data: data.expenseBreakdown.values,
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',
              'rgba(16, 185, 129, 0.5)',
              'rgba(245, 158, 11, 0.5)',
              'rgba(239, 68, 68, 0.5)',
              'rgba(167, 139, 250, 0.5)'
            ],
            borderColor: [
              'rgb(59, 130, 246)',
              'rgb(16, 185, 129)',
              'rgb(245, 158, 11)',
              'rgb(239, 68, 68)',
              'rgb(167, 139, 250)'
            ],
            borderWidth: 1
          }]
        }}
        options={{
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                }
              }
            }
          }
        }}
      />

      <DashboardChart
        title="Account Receivables Aging"
        type="bar"
        data={{
          labels: data.arAging.labels,
          datasets: [{
            label: 'Amount Outstanding',
            data: data.arAging.values,
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }]
        }}
        options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => formatCurrency(value)
              }
            }
          }
        }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Financial Dashboard
          </h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value={60000}>Refresh: 1m</option>
              <option value={300000}>Refresh: 5m</option>
              <option value={900000}>Refresh: 15m</option>
              <option value={3600000}>Refresh: 1h</option>
            </select>

            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="default">Default Layout</option>
              <option value="compact">Compact View</option>
              <option value="expanded">Expanded View</option>
            </select>

            <button
              onClick={loadDashboardData}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="space-y-6">
            {renderMetrics()}
            {renderCharts()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;
