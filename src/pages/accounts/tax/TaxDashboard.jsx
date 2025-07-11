import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTaxSummary } from '../../../services/taxService';
import { formatCurrency } from '../../../utils/formatters';
import TaxCalendarWidget from './components/TaxCalendarWidget';
import TaxDueWidget from './components/TaxDueWidget';

const TaxDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taxSummary, setTaxSummary] = useState({
    gst: {
      collectedTotal: 0,
      paidTotal: 0,
      netPayable: 0,
      pendingReturns: 0
    },
    tds: {
      deductedTotal: 0,
      paidTotal: 0,
      pendingPayable: 0,
      pendingReturns: 0
    }
  });
  
  // Current tax period (based on current month)
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long' });
  const currentYear = today.getFullYear();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1).toLocaleString('default', { month: 'long' });

  useEffect(() => {
    const loadTaxSummary = async () => {
      try {
        setLoading(true);
        const data = await fetchTaxSummary();
        setTaxSummary(data);
        setError(null);
      } catch (err) {
        setError('Failed to load tax summary. Please try again later.');
        console.error('Error loading tax summary:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTaxSummary();
  }, []);

  return (
    <div>
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* GST Summary Stats */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">GST Collected (Current Quarter)</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.gst.collectedTotal)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">GST Paid (Current Quarter)</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.gst.paidTotal)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Net GST Payable</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.gst.netPayable)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending GST Returns</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                taxSummary.gst.pendingReturns
              )}
            </dd>
          </div>
        </div>

        {/* TDS Summary Stats */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">TDS Deducted (Current Quarter)</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.tds.deductedTotal)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">TDS Paid (Current Quarter)</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.tds.paidTotal)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending TDS Payment</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                formatCurrency(taxSummary.tds.pendingPayable)
              )}
            </dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending TDS Returns</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {loading ? (
                <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
              ) : (
                taxSummary.tds.pendingReturns
              )}
            </dd>
          </div>
        </div>
      </div>

      {/* Upcoming Tax Calendar */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Tax Deadlines</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <TaxDueWidget />
          </div>
        </div>

        {/* Tax Calendar */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Tax Calendar</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <TaxCalendarWidget />
          </div>
        </div>
      </div>

      {/* Quick Links for Tax Returns */}
      <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">GST Returns</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Generate and file GST returns for the previous month ({previousMonth} {currentYear}).
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to="/accounts/tax/gst/gstr1"
              className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg text-center"
            >
              <div className="font-medium text-gray-900 mb-1">GSTR-1</div>
              <div className="text-sm text-gray-500">Outward Supplies</div>
            </Link>
            <Link
              to="/accounts/tax/gst/gstr2"
              className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg text-center"
            >
              <div className="font-medium text-gray-900 mb-1">GSTR-2</div>
              <div className="text-sm text-gray-500">Inward Supplies</div>
            </Link>
            <Link
              to="/accounts/tax/gst/gstr3b"
              className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg text-center"
            >
              <div className="font-medium text-gray-900 mb-1">GSTR-3B</div>
              <div className="text-sm text-gray-500">Monthly Return</div>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">TDS Returns</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Generate and file TDS returns for the current quarter.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/accounts/tax/tds"
              className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg text-center"
            >
              <div className="font-medium text-gray-900 mb-1">TDS Returns</div>
              <div className="text-sm text-gray-500">Generate TDS Returns and Challans</div>
            </Link>
            <Link
              to="/accounts/tax/settings"
              className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg text-center"
            >
              <div className="font-medium text-gray-900 mb-1">Tax Settings</div>
              <div className="text-sm text-gray-500">Configure GST and TDS Settings</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxDashboard;
