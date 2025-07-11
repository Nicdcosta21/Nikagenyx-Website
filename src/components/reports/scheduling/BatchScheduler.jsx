import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getReportTemplates } from '../../../services/reportService';
import { createBatchSchedules } from '../../../services/scheduleService';

const BatchScheduler = ({ onSchedulesCreated }) => {
  const [reportTemplates, setReportTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const templates = await getReportTemplates();
      setReportTemplates(templates);
    } catch (err) {
      console.error('Error loading report templates:', err);
      setError('Failed to load report templates');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    reports: Yup.array().of(
      Yup.object().shape({
        reportId: Yup.string().required('Report is required'),
        selected: Yup.boolean()
      })
    ),
    schedule: Yup.object().shape({
      frequency: Yup.string().required('Frequency is required'),
      time: Yup.string().required('Time is required'),
      days: Yup.array().when('frequency', {
        is: (val) => ['weekly', 'monthly'].includes(val),
        then: Yup.array().min(1, 'At least one day must be selected')
      }),
      monthDay: Yup.number().when('frequency', {
        is: 'monthly',
        then: Yup.number().min(1).max(31).required('Day of month is required')
      })
    }),
    format: Yup.string().required('Format is required'),
    recipients: Yup.array().of(
      Yup.string().email('Invalid email address')
    ).min(1, 'At least one recipient is required')
  });

  const formik = useFormik({
    initialValues: {
      reports: reportTemplates.map(template => ({
        reportId: template.id,
        selected: false
      })),
      schedule: {
        frequency: 'daily',
        time: '09:00',
        days: [],
        monthDay: 1
      },
      format: 'pdf',
      recipients: [''],
      parameters: {}
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const selectedReports = values.reports.filter(r => r.selected);
        
        const schedules = await createBatchSchedules({
          reports: selectedReports,
          schedule: values.schedule,
          format: values.format,
          recipients: values.recipients,
          parameters: values.parameters
        });

        onSchedulesCreated(schedules);
        formik.resetForm();
      } catch (err) {
        console.error('Error creating batch schedules:', err);
        setError('Failed to create schedules');
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-8">
      {/* Report Selection */}
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Select Reports
        </h3>
        <div className="mt-4 border rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      const newReports = formik.values.reports.map(r => ({
                        ...r,
                        selected: e.target.checked
                      }));
                      formik.setFieldValue('reports', newReports);
                    }}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportTemplates.map((template, index) => (
                <tr key={template.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={formik.values.reports[index]?.selected || false}
                      onChange={(e) => {
                        const newReports = [...formik.values.reports];
                        newReports[index] = {
                          reportId: template.id,
                          selected: e.target.checked
                        };
                        formik.setFieldValue('reports', newReports);
                      }}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {template.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {template.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Schedule Configuration
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <select
              id="frequency"
              {...formik.getFieldProps('schedule.frequency')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time
            </label>
            <input
              type="time"
              id="time"
              {...formik.getFieldProps('schedule.time')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {formik.values.schedule.frequency === 'weekly' && (
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">
                Days of Week
              </label>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const days = formik.values.schedule.days.includes(index)
                        ? formik.values.schedule.days.filter(d => d !== index)
                        : [...formik.values.schedule.days, index];
                      formik.setFieldValue('schedule.days', days);
                    }}
                    className={`p-2 text-sm font-medium rounded-md ${
                      formik.values.schedule.days.includes(index)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {formik.values.schedule.frequency === 'monthly' && (
            <div className="sm:col-span-3">
              <label htmlFor="monthDay" className="block text-sm font-medium text-gray-700">
                Day of Month
              </label>
              <input
                type="number"
                id="monthDay"
                min="1"
                max="31"
                {...formik.getFieldProps('schedule.monthDay')}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Export Format */}
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Export Configuration
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="format" className="block text-sm font-medium text-gray-700">
              Format
            </label>
            <select
              id="format"
              {...formik.getFieldProps('format')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div>
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Recipients
        </h3>
        <div className="mt-4">
          {formik.values.recipients.map((email, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  const newRecipients = [...formik.values.recipients];
                  newRecipients[index] = e.target.value;
                  formik.setFieldValue('recipients', newRecipients);
                }}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Email address"
              />
              <button
                type="button"
                onClick={() => {
                  const newRecipients = formik.values.recipients.filter((_, i) => i !== index);
                  formik.setFieldValue('recipients', newRecipients);
                }}
                className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              formik.setFieldValue('recipients', [...formik.values.recipients, '']);
            }}
            className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Recipient
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
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
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => formik.resetForm()}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {loading ? 'Creating...' : 'Create Schedules'}
        </button>
      </div>
    </form>
  );
};

export default BatchScheduler;
