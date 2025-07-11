import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  fetchSavedReports, 
  fetchScheduledReport, 
  saveScheduledReport, 
  deleteScheduledReport 
} from '../../../../services/reportService';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';

const ScheduleReportForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  
  const [formData, setFormData] = useState({
    reportId: '',
    reportName: '',
    reportType: '',
    active: true,
    format: 'pdf',
    recipients: [''],
    schedule: {
      frequency: 'monthly',
      day: 1,
      time: '08:00'
    },
    emailSubject: 'Your scheduled financial report',
    emailBody: 'Please find attached your scheduled financial report.'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load saved reports for the dropdown
        const reports = await fetchSavedReports();
        setSavedReports(reports);
        
        if (isEditing) {
          // Load the scheduled report data if editing
          const scheduleData = await fetchScheduledReport(id);
          setFormData(scheduleData);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [name]: value
      }
    }));
  };

  const handleRecipientChange = (index, value) => {
    const newRecipients = [...formData.recipients];
    newRecipients[index] = value;
    
    setFormData(prev => ({
      ...prev,
      recipients: newRecipients
    }));
  };

  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const removeRecipient = (index) => {
    const newRecipients = [...formData.recipients];
    newRecipients.splice(index, 1);
    
    setFormData(prev => ({
      ...prev,
      recipients: newRecipients
    }));
  };

  const handleReportSelect = (e) => {
    const reportId = e.target.value;
    const selectedReport = savedReports.find(report => report.id === reportId);
    
    if (selectedReport) {
      setFormData(prev => ({
        ...prev,
        reportId,
        reportName: selectedReport.title,
        reportType: selectedReport.type,
        emailSubject: `Your scheduled ${selectedReport.title} report`,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = [];
    
    if (!formData.reportId) errors.push('Please select a report');
    if (formData.recipients.some(email => !email || !email.includes('@'))) {
      errors.push('Please provide valid email addresses for all recipients');
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      await saveScheduledReport(formData, isEditing ? id : null);
      
      // Navigate back to scheduled reports list
      navigate('/accounts/reports/scheduled');
    } catch (err) {
      console.error('Error saving scheduled report:', err);
      setError('Failed to save scheduled report. Please try again.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;
    
    if (window.confirm('Are you sure you want to delete this scheduled report? This cannot be undone.')) {
      try {
        setDeleting(true);
        setError(null);
        
        await deleteScheduledReport(id);
        
        // Navigate back to scheduled reports list
        navigate('/accounts/reports/scheduled');
      } catch (err) {
        console.error('Error deleting scheduled report:', err);
        setError('Failed to delete scheduled report. Please try again.');
        setDeleting(false);
      }
    }
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/reports/scheduled"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Scheduled Reports
        </Link>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg leading-6 font-medium text-gray-900">
            {isEditing ? 'Edit Scheduled Report' : 'Schedule New Report'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Configure automated report delivery settings
          </p>
        </div>
        
        {loading ? (
          <div className="px-4 py-12 sm:p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
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
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {/* Report Selection */}
                <div className="sm:col-span-4">
                  <label htmlFor="reportId" className="block text-sm font-medium text-gray-700">
                    Report
                  </label>
                  <div className="mt-1">
                    <select
                      id="reportId"
                      name="reportId"
                      value={formData.reportId}
                      onChange={handleReportSelect}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Select a report</option>
                      {savedReports.map(report => (
                        <option key={report.id} value={report.id}>
                          {report.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Report Format */}
                <div className="sm:col-span-2">
                  <label htmlFor="format" className="block text-sm font-medium text-gray-700">
                    Export Format
                  </label>
                  <div className="mt-1">
                    <select
                      id="format"
                      name="format"
                      value={formData.format}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>

                {/* Schedule Frequency */}
                <div className="sm:col-span-2">
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <div className="mt-1">
                    <select
                      id="frequency"
                      name="frequency"
                      value={formData.schedule.frequency}
                      onChange={handleScheduleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>

                {/* Day Selection */}
                {formData.schedule.frequency !== 'daily' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="day" className="block text-sm font-medium text-gray-700">
                      {formData.schedule.frequency === 'weekly' ? 'Day of Week' : 'Day of Period'}
                    </label>
                    <div className="mt-1">
                      <select
                        id="day"
                        name="day"
                        value={formData.schedule.day}
                        onChange={handleScheduleChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        {formData.schedule.frequency === 'weekly' ? (
                          <>
                            <option value="0">Sunday</option>
                            <option value="1">Monday</option>
                            <option value="2">Tuesday</option>
                            <option value="3">Wednesday</option>
                            <option value="4">Thursday</option>
                            <option value="5">Friday</option>
                            <option value="6">Saturday</option>
                          </>
                        ) : (
                          Array.from({ length: 31 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Day {i + 1}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* Time Selection */}
                <div className="sm:col-span-2">
                  <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <div className="mt-1">
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.schedule.time}
                      onChange={handleScheduleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Recipients */}
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Recipients
                  </label>
                  <div className="mt-1 space-y-2">
                    {formData.recipients.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => handleRecipientChange(index, e.target.value)}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter email address"
                        />
                        {formData.recipients.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRecipient(index)}
                            className="inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none"
                          >
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRecipient}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                    >
                      <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Recipient
                    </button>
                  </div>
                </div>

                {/* Email Subject */}
                <div className="sm:col-span-6">
                  <label htmlFor="emailSubject" className="block text-sm font-medium text-gray-700">
                    Email Subject
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="emailSubject"
                      name="emailSubject"
                      value={formData.emailSubject}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Email Body */}
                <div className="sm:col-span-6">
                  <label htmlFor="emailBody" className="block text-sm font-medium text-gray-700">
                    Email Message
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="emailBody"
                      name="emailBody"
                      rows={3}
                      value={formData.emailBody}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="sm:col-span-6">
                  <div className="flex items-center">
                    <input
                      id="active"
                      name="active"
                      type="checkbox"
                      checked={formData.active}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                      Schedule is active
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex justify-center mr-3 py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                >
                  {deleting ? 'Deleting...' : 'Delete Schedule'}
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                {saving ? 'Saving...' : (isEditing ? 'Update Schedule' : 'Create Schedule')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScheduleReportForm;
