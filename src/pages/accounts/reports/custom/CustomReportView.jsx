import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  fetchCustomReport, 
  runCustomReport,
  deleteCustomReport
} from '../../../../services/reportService';
import { formatCurrency, formatDate } from '../../../../utils/formatters';
import ReportHeader from '../components/ReportHeader';
import ExportOptions from '../components/ExportOptions';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const CustomReportView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchCustomReport(id);
        setReport(data);
        
        // If report has results, set the report data
        if (data.results) {
          setReportData(data.results);
        } else {
          // Otherwise, run the report to get results
          await runReport();
        }
      } catch (err) {
        console.error('Error loading custom report:', err);
        setError('Failed to load report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  const runReport = async () => {
    try {
      setRunning(true);
      setError(null);
      
      const data = await runCustomReport(id);
      setReportData(data);
    } catch (err) {
      console.error('Error running custom report:', err);
      setError('Failed to run report. Please try again.');
    } finally {
      setRunning(false);
    }
  };

  const handleExport = async (format) => {
    // This would be implemented in the reportService
    // Example: await exportCustomReport(id, format);
    alert(`Exporting Custom Report as ${format}...`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this report? This cannot be undone.')) {
      try {
        setDeleting(true);
        setError(null);
        
        await deleteCustomReport(id);
        
        // Navigate back to reports list
        navigate('/accounts/reports/saved');
      } catch (err) {
        console.error('Error deleting custom report:', err);
        setError('Failed to delete report. Please try again.');
        setDeleting(false);
      }
    }
  };

  // Helper to render the report table
  const renderReportTable = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-gray-500">No data available for this report.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {report.config.columns.includes('account') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
              )}
              {report.config.columns.includes('type') && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              )}
              {report.config.columns.includes('current') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
              )}
              {report.config.columns.includes('ytd') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  YTD Balance
                </th>
              )}
              {report.config.compareMode && report.config.columns.includes('compare') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comparative
                </th>
              )}
              {report.config.columns.includes('change') && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Change
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.rows.map((row, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {report.config.columns.includes('account') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.accountName}
                  </td>
                )}
                {report.config.columns.includes('type') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.accountType}
                  </td>
                )}
                {report.config.columns.includes('current') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(row.currentBalance)}
                  </td>
                )}
                {report.config.columns.includes('ytd') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(row.ytdBalance)}
                  </td>
                )}
                {report.config.compareMode && report.config.columns.includes('compare') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(row.compareBalance)}
                  </td>
                )}
                {report.config.columns.includes('change') && (
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
          {reportData.totals && (
            <tfoot className="bg-gray-100">
              <tr>
                {report.config.columns.includes('account') && (
                  <td className="px-6 py-3 text-sm font-bold text-gray-900">
                    Total
                  </td>
                )}
                {report.config.columns.includes('type') && (
                  <td className="px-6 py-3 text-sm font-bold text-gray-900"></td>
                )}
                {report.config.columns.includes('current') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(reportData.totals.currentBalance)}
                  </td>
                )}
                {report.config.columns.includes('ytd') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(reportData.totals.ytdBalance)}
                  </td>
                )}
                {report.config.compareMode && report.config.columns.includes('compare') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(reportData.totals.compareBalance)}
                  </td>
                )}
                {report.config.columns.includes('change') && (
                  <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                    {reportData.totals.percentChange}%
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
          to="/accounts/reports/saved"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Saved Reports
        </Link>
      </div>
      
      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : report ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg leading-6 font-medium text-gray-900">{report.config.title}</h2>
              {report.config.description && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {report.config.description}
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={runReport}
                disabled={running}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                {running ? 'Running...' : 'Refresh Data'}
              </button>
              
              <Link
                to={`/accounts/reports/custom/builder`}
                state={{ template: report.config }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Edit Report
              </Link>
              
              <ExportOptions onExport={handleExport} />
              
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
            <ReportHeader 
              title={report.config.title}
              subtitle={`${formatDate(report.config.dateRange.start)} - ${formatDate(report.config.dateRange.end)}`}
              company={report.companyName}
            />
            
            <div className="mt-6 border-t border-gray-200 pt-6">
              {running ? (
                <div className="py-10">
                  <LoadingSpinner />
                </div>
              ) : (
                renderReportTable()
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-right">
              Last updated: {formatDate(report.updatedAt || report.createdAt)} | Created: {formatDate(report.createdAt)}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500">Report not found.</p>
        </div>
      )}
    </div>
  );
};

export default CustomReportView;
