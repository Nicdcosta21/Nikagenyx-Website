import React, { useState } from 'react';
import { PDFEditor } from './editors/PDFEditor';
import { ExcelEditor } from './editors/ExcelEditor';
import { CSVEditor } from './editors/CSVEditor';

const TemplateEditor = ({
  template,
  brandingProfiles,
  onSubmit,
  onChange,
  values,
  errors,
  onCancel
}) => {
  const [activeTab, setActiveTab] = useState('design'); // design, settings

  const renderEditor = () => {
    switch (values.type) {
      case 'pdf':
        return (
          <PDFEditor
            value={values.template_data}
            onChange={(data) => onChange({
              target: {
                name: 'template_data',
                value: data
              }
            })}
          />
        );
      case 'excel':
        return (
          <ExcelEditor
            value={values.template_data}
            onChange={(data) => onChange({
              target: {
                name: 'template_data',
                value: data
              }
            })}
          />
        );
      case 'csv':
        return (
          <CSVEditor
            value={values.template_data}
            onChange={(data) => onChange({
              target: {
                name: 'template_data',
                value: data
              }
            })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Customize your export template design and settings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`${
              activeTab === 'design'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Settings
          </button>
        </nav>
      </div>

      {activeTab === 'design' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={values.name}
                onChange={onChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Template Type
              </label>
              <select
                id="type"
                name="type"
                value={values.type}
                onChange={onChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div className="col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={values.description}
                onChange={onChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            {renderEditor()}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="branding_profile_id" className="block text-sm font-medium text-gray-700">
                Branding Profile
              </label>
              <select
                id="branding_profile_id"
                name="branding_profile_id"
                value={values.branding_profile_id}
                onChange={onChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">No branding</option>
                {brandingProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-6">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="is_public"
                    name="is_public"
                    type="checkbox"
                    checked={values.is_public}
                    onChange={onChange}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is_public" className="font-medium text-gray-700">
                    Make template public
                  </label>
                  <p className="text-gray-500">
                    Public templates can be used by other users in your organization
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

export default TemplateEditor;
