import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  getExportTemplates,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate
} from '../../../services/exportTemplateService';
import {
  getBrandingProfiles,
  createBrandingProfile,
  updateBrandingProfile
} from '../../../services/brandingService';
import TemplateEditor from './TemplateEditor';
import BrandingProfileForm from './BrandingProfileForm';
import TemplatePreview from './TemplatePreview';

const ExportTemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [brandingProfiles, setBrandingProfiles] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedBrandingProfile, setSelectedBrandingProfile] = useState(null);
  const [showBrandingForm, setShowBrandingForm] = useState(false);
  const [view, setView] = useState('list'); // list, edit, preview
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, brandingData] = await Promise.all([
        getExportTemplates(),
        getBrandingProfiles()
      ]);
      setTemplates(templatesData);
      setBrandingProfiles(brandingData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load templates and branding profiles');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    description: Yup.string(),
    type: Yup.string().required('Template type is required'),
    template_data: Yup.object().required('Template data is required'),
    branding_profile_id: Yup.string(),
    is_public: Yup.boolean()
  });

  const formik = useFormik({
    initialValues: selectedTemplate || {
      name: '',
      description: '',
      type: 'pdf',
      template_data: {},
      branding_profile_id: '',
      is_public: false
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        if (selectedTemplate) {
          const updated = await updateExportTemplate(selectedTemplate.id, values);
          setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        } else {
          const created = await createExportTemplate(values);
          setTemplates(prev => [...prev, created]);
        }
        setView('list');
        setSelectedTemplate(null);
      } catch (err) {
        console.error('Error saving template:', err);
        setError('Failed to save template');
      }
    }
  });

  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteExportTemplate(id);
        setTemplates(prev => prev.filter(t => t.id !== id));
      } catch (err) {
        console.error('Error deleting template:', err);
        setError('Failed to delete template');
      }
    }
  };

  const handleBrandingSubmit = async (values) => {
    try {
      if (selectedBrandingProfile) {
        const updated = await updateBrandingProfile(selectedBrandingProfile.id, values);
        setBrandingProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createBrandingProfile(values);
        setBrandingProfiles(prev => [...prev, created]);
      }
      setShowBrandingForm(false);
      setSelectedBrandingProfile(null);
    } catch (err) {
      console.error('Error saving branding profile:', err);
      setError('Failed to save branding profile');
    }
  };

  const renderTemplateList = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {templates.map(template => (
          <li key={template.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {template.type === 'pdf' && (
                      <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    )}
                    {template.type === 'excel' && (
                      <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v2H7V9zm0 4h6v2H7v-2z" clipRule="evenodd" />
                      </svg>
                    )}
                    {template.type === 'csv' && (
                      <svg className="h-6 w-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v2H7V9zm0 4h6v2H7v-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {template.name}
                      {template.is_default && (
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Default
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{template.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setView('preview');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setView('edit');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Export Templates
            </h2>
          </div>
          <div className="mt-4 flex-shrink-0 flex md:mt-0 md:ml-4">
            <button
              type="button"
              onClick={() => setShowBrandingForm(true)}
              className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Manage Branding
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTemplate(null);
                setView('edit');
              }}
              className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Template
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
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

      {/* Main Content */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <>
            {view === 'list' && renderTemplateList()}
            
            {view === 'edit' && (
              <TemplateEditor
                template={selectedTemplate}
                brandingProfiles={brandingProfiles}
                onSubmit={formik.handleSubmit}
                onChange={formik.handleChange}
                values={formik.values}
                errors={formik.errors}
                onCancel={() => {
                  setView('list');
                  setSelectedTemplate(null);
                }}
              />
            )}

            {view === 'preview' && selectedTemplate && (
              <TemplatePreview
                template={selectedTemplate}
                onClose={() => {
                  setView('list');
                  setSelectedTemplate(null);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Branding Profile Form Modal */}
      {showBrandingForm && (
        <BrandingProfileForm
          profile={selectedBrandingProfile}
          onSubmit={handleBrandingSubmit}
          onCancel={() => {
            setShowBrandingForm(false);
            setSelectedBrandingProfile(null);
          }}
        />
      )}
    </div>
  );
};

export default ExportTemplateManager;
