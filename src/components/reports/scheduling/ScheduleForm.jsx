import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { getReportTemplates } from '../../../services/reportService';
import { getScheduleTemplates, saveScheduleTemplate } from '../../../services/scheduleService';

const ScheduleForm = ({ schedule, onSubmit, onCancel }) => {
  const [reportTemplates, setReportTemplates] = useState([]);
  const [scheduleTemplates, setScheduleTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const [reportData, scheduleData] = await Promise.all([
        getReportTemplates(),
        getScheduleTemplates()
      ]);
      setReportTemplates(reportData);
      setScheduleTemplates(scheduleData);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    reportId: Yup.string().required('Report template is required'),
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
    format: Yup.string().required('Export format is required'),
    recipients: Yup.array().of(
      Yup.string().email('Invalid email address')
    ).min(1, 'At least one recipient is required'),
    parameters: Yup.object(),
    active: Yup.boolean()
  });

  const formik = useFormik({
    initialValues: schedule || {
      name: '',
      reportId: '',
      schedule: {
        frequency: 'daily',
        time: '09:00',
        days: [],
        monthDay: 1
      },
      format: 'pdf',
      recipients: [''],
      parameters: {},
      active: true
    },
    validationSchema,
    onSubmit: async (values) => {
      await onSubmit(schedule?.id, values);
    }
  });

  const handleTemplateSelect = (templateId) => {
    const template = scheduleTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      formik.setValues({
        ...formik.values,
        ...template.config
      });
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = window.prompt('Enter template name:');
    if (name) {
      try {
        const template = await saveScheduleTemplate({
          name,
          config: formik.values
        });
        setScheduleTemplates(prev => [...prev, template]);
      } catch (err) {
        console.error('Error saving template:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {schedule ? 'Edit Schedule' : 'Create Schedule'}
        </h3>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select Template</option>
            {scheduleTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSaveAsTemplate}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save as Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Name */}
        <div className="sm:col-span-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Schedule Name
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="name"
              {...formik.getFieldProps('name')}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            {formik.touched.name && formik.errors.name && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.name}</p>
            )}
          </div>
        </div>

        {/* Report Template */}
        <div className="sm:col-span-4">
          <label htmlFor="reportId" className="block text-sm font-medium text-gray-700">
            Report Template
          </label>
          <div className="mt-1">
            <select
              id="reportId"
              {...formik.getFieldProps('reportId')}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              <option value="">Select a report template</option>
              {reportTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {formik.touched.reportId && formik.errors.reportId && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.reportId}</p>
            )}
          </div>
        </div>

        {/* Schedule Frequency */}
        <div className="sm:col-span-3">
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
            Frequency
          </label>
          <div className="mt-1">
            <select
              id="frequency"
              {...formik.getFieldProps('schedule.frequency')}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        {/* Schedule Time */}
        <div className="sm:col-span-3">
          <label htmlFor="time" className="block text-sm font-medium text-gray-700">
            Time
          </label>
          <div className="mt-1">
            <input
              type="time"
              id="time"
              {...formik.getFieldProps('schedule.time')}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Days Selection (for weekly/monthly) */}
        {['weekly', 'monthly'].includes(formik.values.schedule.frequency) && (
          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700">
              {formik.values.schedule.frequency === 'weekly' ? 'Days of Week' : 'Days of Month'}
            </label>
            <div className="mt-2">
              {formik.values.schedule.frequency === 'weekly' ? (
                <div className="grid grid-cols-7 gap-2">
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
              ) : (
                <input
                  type="number"
                  min="1"
                  max="31"
                  {...formik.getFieldProps('schedule.monthDay')}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              )}
            </div>
          </div>
        )}

        {/* Export Format */}
        <div className="sm:col-span-3">
          <label htmlFor="format" className="block text-sm font-medium text-gray-700">
            Export Format
          </label>
          <div className="mt-1">
            <select
              id="format"
              {...formik.getFieldProps('format')}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        {/* Recipients */}
        <div className="sm:col-span-6">
          <label className="block text-sm font-medium text-gray-700">
            Recipients
          </label>
          <div className="mt-1">
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
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
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

        {/* Active Status */}
        <div className="sm:col-span-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              {...formik.getFieldProps('active')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {schedule ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm;
