import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchScheduledReports, toggleReportStatus } from '../../../../services/reportService';
import { formatDate } from '../../../../utils/formatters';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const ScheduledReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchScheduledReports();
        setReports(data);
      } catch (err) {
        console.error('Error loading scheduled reports:', err);
        setError('Failed to load scheduled reports. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const handleStatusToggle = async (reportId, currentActive) => {
    try {
      setUpdatingStatus(reportId);
      
      const updatedReport = await toggleReportStatus(reportId, !currentActive);
      
      // Update the report in the list
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId ? { ...report, active: updatedReport.active } : report
        )
      );
    } catch (err) {
      console.error('Error updating report status:', err);
      setError('Failed to update report status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getNextRunDate = (schedule) => {
    const today = new Date();
    
    // For demonstration purposes, we'll calculate a simple next run date
    // In a real implementation, you would have more complex logic based on the schedule
    switch(schedule.frequency) {
      case 'daily':
        return new Date(today.setDate(today.getDate() + 1));
      case 'weekly':
        return new Date(today.setDate(today.getDate() + (7 - today.getDay() + schedule.day) % 7));
      case 'monthly':
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, schedule.day);
        return nextMonth;
      case 'quarterly':
        const monthsUntilQuarter = 3 - (today.getMonth() % 3);
        const nextQuarter = new Date(today.getFullYear(), today.getMonth() + monthsUntilQuarter, schedule.day);
        return nextQuarter;
      default:
        return 'Unknown';
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
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg leading-6 font-medium text-gray-900">Scheduled Reports</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage your automated report delivery schedules
            </p>
          </div>
          
          <Link
            to="/accounts/reports/scheduled/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Schedule New Report
          </Link>
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
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled reports</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new scheduled report.
            </p>
            <div className="mt-6">
              <Link
                to="/accounts/reports/scheduled/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Schedule New Report
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col">
              <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                  <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Report Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Frequency
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recipients
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Sent
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Run
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reports.map((report) => (
                          <tr key={report.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {report.reportName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {report.reportType}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {report.schedule.frequency.charAt(0).toUpperCase() + report.schedule.frequency.slice(1)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.schedule.frequency === 'weekly'
                                  ? `Every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][report.schedule.day]}`
                                  : report.schedule.frequency === 'monthly' || report.schedule.frequency === 'quarterly'
                                    ? `Day ${report.schedule.day} of ${report.schedule.frequency === 'quarterly' ? 'quarter' : 'month'}`
                                    : ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {report.recipients.length} recipients
                              </div>
                              <div className="text-sm text-gray-500">
                                {report.recipients.slice(0, 2).join(', ')}
                                {report.recipients.length > 2 && '...'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {report.lastRunAt ? formatDate(report.lastRunAt) : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {report.active ? formatDate(getNextRunDate(report.schedule)) : 'Inactive'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                report.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {report.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-3">
                                <Link
                                  to={`/accounts/reports/scheduled/${report.id}`}
                                  className="text-indigo-600 hover:text-indigo-900"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleStatusToggle(report.id, report.active)}
                                  disabled={updatingStatus === report.id}
                                  className={`${
                                    report.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                                  }`}
                                >
                                  {updatingStatus === report.id ? 'Updating...' : (report.active ? 'Deactivate' : 'Activate')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduledReports;
