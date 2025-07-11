import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getInvoiceSettings, saveInvoiceSettings } from '../../../services/invoiceService';

const InvoiceSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({
    companyName: '',
    companyGstin: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    companyLogo: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    termsAndConditions: '',
    invoicePrefix: 'INV-',
    purchasePrefix: 'PUR-',
    nextInvoiceNumber: 1,
    nextPurchaseNumber: 1,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await getInvoiceSettings();
        setSettings(data);
        setError(null);
      } catch (err) {
        setError('Failed to load settings. Please try again later.');
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    
    try {
      setSaving(true);
      await saveInvoiceSettings(settings);
      setSuccess(true);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/invoicing"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Invoices
        </Link>
      </div>

      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Invoice Settings
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Configure your invoice preferences and company details.
        </p>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 mx-6 mb-4">
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
      
      {success && (
        <div className="rounded-md bg-green-50 p-4 mx-6 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Settings saved successfully.</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-8">
          {/* Company Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Company Information</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Company Name *</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="companyName"
                    id="companyName"
                    required
                    value={settings.companyName}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="companyGstin" className="block text-sm font-medium text-gray-700">GSTIN *</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="companyGstin"
                    id="companyGstin"
                    required
                    value={settings.companyGstin}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1">
                  <textarea
                    id="companyAddress"
                    name="companyAddress"
                    rows={3}
                    value={settings.companyAddress}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="companyEmail"
                    id="companyEmail"
                    value={settings.companyEmail}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="companyPhone"
                    id="companyPhone"
                    value={settings.companyPhone}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Bank Details</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="bankName"
                    id="bankName"
                    value={settings.bankName}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="bankAccountNumber" className="block text-sm font-medium text-gray-700">Account Number</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="bankAccountNumber"
                    id="bankAccountNumber"
                    value={settings.bankAccountNumber}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="bankIfsc" className="block text-sm font-medium text-gray-700">IFSC Code</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="bankIfsc"
                    id="bankIfsc"
                    value={settings.bankIfsc}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Invoice Settings</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="invoicePrefix" className="block text-sm font-medium text-gray-700">Sales Invoice Prefix</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="invoicePrefix"
                    id="invoicePrefix"
                    value={settings.invoicePrefix}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="nextInvoiceNumber" className="block text-sm font-medium text-gray-700">Next Invoice Number</label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="nextInvoiceNumber"
                    id="nextInvoiceNumber"
                    value={settings.nextInvoiceNumber}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="purchasePrefix" className="block text-sm font-medium text-gray-700">Purchase Invoice Prefix</label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="purchasePrefix"
                    id="purchasePrefix"
                    value={settings.purchasePrefix}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="nextPurchaseNumber" className="block text-sm font-medium text-gray-700">Next Purchase Number</label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="nextPurchaseNumber"
                    id="nextPurchaseNumber"
                    value={settings.nextPurchaseNumber}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="termsAndConditions" className="block text-sm font-medium text-gray-700">Default Terms & Conditions</label>
                <div className="mt-1">
                  <textarea
                    id="termsAndConditions"
                    name="termsAndConditions"
                    rows={3}
                    value={settings.termsAndConditions}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5">
            <div className="flex justify-end">
              <Link
                to="/accounts/invoicing"
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default InvoiceSettings;
