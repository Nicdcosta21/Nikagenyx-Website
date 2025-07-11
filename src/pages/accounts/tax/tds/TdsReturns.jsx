import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTdsReturns } from '../../../../services/taxService';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';

const TdsReturns = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [returns, setReturns] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadReturns = async () => {
      try {
        setLoading(true);
        
        // Build query params
        const params = new URLSearchParams();
        if (dateRange.start) params.append('startDate', dateRange.start);
        if (dateRange.end) params.append('endDate', dateRange.end);
        
        const data = await fetchTdsReturns(params);
        setReturns(data);
        setError(null);
      } catch (err) {
        setError('Failed to load TDS returns. Please try again later.');
        console.error('Error loading TDS returns:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReturns();
  }, [dateRange]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'filed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth();
    let quarter, year = now.getFullYear();
    
    if (month >= 0 && month <= 2) {
      quarter = 'Q4';
      year = now.getFullYear() - 1;
    } else if (month >= 3 && month <= 5) {
      quarter = 'Q1';
    } else if (month >= 6 && month <= 8) {
      quarter = 'Q2';
    } else {
      quarter = 'Q3';
    }
    
    return `${quarter} ${year}-${(year + 1).toString().slice(2)}`;
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/tax"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Tax Dashboard
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">TDS Returns</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">View your TDS return filing history and create new returns.</p>
          </div>
          <div>
            <DateRangePicker 
              onChange={handleDateRangeChange} 
              value={dateRange}
              buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            />
          </div>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="mb-6">
            <Link
              to="/accounts/tax/tds/form"
              className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create New TDS Return for {getCurrentQuarter()}
            </Link>
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

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : returns.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No TDS returns found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new TDS return.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total TDS
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filing Date
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {returns.map((tdsReturn) => (
                    <tr key={tdsReturn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tdsReturn.formType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tdsReturn.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tdsReturn.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(tdsReturn.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(tdsReturn.status)}`}>
                          {tdsReturn.status.charAt(0).toUpperCase() + tdsReturn.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tdsReturn.filingDate ? formatDate(tdsReturn.filingDate) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex space-x-4 justify-end">
                          <Link 
                            to={`/accounts/tax/tds/form/${tdsReturn.id}`} 
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </Link>
                          <button 
                            className="text-indigo-600 hover:text-indigo-900"
                            onClick={() => window.open(`/api/tax/tds/download?id=${tdsReturn.id}`, '_blank')}
                          >
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">TDS Filing Guidelines</h3>
        
        <div className="prose prose-sm text-gray-500">
          <p>TDS (Tax Deducted at Source) returns must be filed quarterly according to the following schedule:</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Quarter 1 (Apr-Jun):</strong> Due by July 31st</li>
            <li><strong>Quarter 2 (Jul-Sep):</strong> Due by October 31st</li>
            <li><strong>Quarter 3 (Oct-Dec):</strong> Due by January 31st</li>
            <li><strong>Quarter 4 (Jan-Mar):</strong> Due by May 31st</li>
          </ul>
          
          <p className="mt-4">Common TDS Return Forms:</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Form 24Q:</strong> For TDS on salaries</li>
            <li><strong>Form 26Q:</strong> For TDS on payments other than salaries to residents</li>
            <li><strong>Form 27Q:</strong> For TDS on payments to non-residents</li>
            <li><strong>Form 27EQ:</strong> For TCS (Tax Collected at Source)</li>
          </ul>
          
          <p className="mt-4">Late filing of TDS returns attracts penalties as per Section 234E of the Income Tax Act.</p>
        </div>
      </div>
    </div>
  );
};

export default TdsReturns;
