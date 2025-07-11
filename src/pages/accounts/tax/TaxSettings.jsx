import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTaxSettings, saveTaxSettings } from '../../../services/taxService';

const TaxSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [settings, setSettings] = useState({
    gst: {
      gstin: '',
      registrationType: 'Regular',
      filingFrequency: 'Monthly',
      defaultTaxRate: 18,
      emailReminders: true,
      autoGenerate: true
    },
    tds: {
      panNo: '',
      tanNo: '',
      deductorType: 'Company',
      defaultRates: {
        '194A': 10,
        '194C': 2,
        '194H': 5,
        '194I': 10,
        '194J': 10
      },
      emailReminders: true
    }
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const data = await fetchTaxSettings();
        setSettings(data);
        setError(null);
      } catch (err) {
        setError('Failed to load tax settings. Please try again later.');
        console.error('Error loading tax settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleGstChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      gst: {
        ...prev.gst,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleTdsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      tds: {
        ...prev.tds,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleDefaultRateChange = (section, value) => {
    setSettings(prev => ({
      ...prev,
      tds: {
        ...prev.tds,
        defaultRates: {
          ...prev.tds.defaultRates,
          [section]: parseFloat(value)
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      await saveTaxSettings(settings);
      setSuccess('Tax settings have been saved successfully.');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError('Failed to save tax settings. Please try again.');
      console.error('Error saving tax settings:', err);
    } finally {
      setSaving(false);
    }
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

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Tax Settings</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Configure your GST and TDS filing preferences.</p>
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
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h4 className="text-md font-medium text-gray-900">GST Settings</h4>
              </div>
              <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="gstin" className="block text-sm font-medium text-gray-700">GSTIN</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="gstin"
                        id="gstin"
                        value={settings.gst.gstin}
                        onChange={handleGstChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="registrationType" className="block text-sm font-medium text-gray-700">Registration Type</label>
                    <div className="mt-1">
                      <select
                        id="registrationType"
                        name="registrationType"
                        value={settings.gst.registrationType}
                        onChange={handleGstChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="Regular">Regular</option>
                        <option value="Composition">Composition</option>
                        <option value="Casual">Casual</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label htmlFor="filingFrequency" className="block text-sm font-medium text-gray-700">Filing Frequency</label>
                    <div className="mt-1">
                      <select
                        id="filingFrequency"
                        name="filingFrequency"
                        value={settings.gst.filingFrequency}
                        onChange={handleGstChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="defaultTaxRate" className="block text-sm font-medium text-gray-700">Default GST Rate (%)</label>
                    <div className="mt-1">
                      <select
                        id="defaultTaxRate"
                        name="defaultTaxRate"
                        value={settings.gst.defaultTaxRate}
                        onChange={handleGstChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <div className="flex items-center">
                      <input
                        id="emailReminders"
                        name="emailReminders"
                        type="checkbox"
                        checked={settings.gst.emailReminders}
                        onChange={handleGstChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="emailReminders" className="ml-2 block text-sm text-gray-900">
                        Send email reminders for upcoming GST filings
                      </label>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <div className="flex items-center">
                      <input
                        id="autoGenerate"
                        name="autoGenerate"
                        type="checkbox"
                        checked={settings.gst.autoGenerate}
                        onChange={handleGstChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoGenerate" className="ml-2 block text-sm text-gray-900">
                        Auto-generate GST returns on due dates
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h4 className="text-md font-medium text-gray-900">TDS Settings</h4>
              </div>
              <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="panNo" className="block text-sm font-medium text-gray-700">PAN Number</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="panNo"
                        id="panNo"
                        value={settings.tds.panNo}
                        onChange={handleTdsChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="tanNo" className="block text-sm font-medium text-gray-700">TAN Number</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="tanNo"
                        id="tanNo"
                        value={settings.tds.tanNo}
                        onChange={handleTdsChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <label htmlFor="deductorType" className="block text-sm font-medium text-gray-700">Deductor Type</label>
                    <div className="mt-1">
                      <select
                        id="deductorType"
                        name="deductorType"
                        value={settings.tds.deductorType}
                        onChange={handleTdsChange}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="Company">Company</option>
                        <option value="Firm">Firm</option>
                        <option value="Individual/HUF">Individual/HUF</option>
                        <option value="Government">Government</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-3">
                    <div className="flex items-center">
                      <input
                        id="tdsEmailReminders"
                        name="emailReminders"
                        type="checkbox"
                        checked={settings.tds.emailReminders}
                        onChange={handleTdsChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="tdsEmailReminders" className="ml-2 block text-sm text-gray-900">
                        Send email reminders for upcoming TDS filings
                      </label>
                    </div>
                  </div>
                  
                  <div className="sm:col-span-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Default TDS Rates</h5>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="194A" className="block text-sm font-medium text-gray-700">Sec 194A (Interest)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="194A"
                            id="194A"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.tds.defaultRates['194A']}
                            onChange={(e) => handleDefaultRateChange('194A', e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="194C" className="block text-sm font-medium text-gray-700">Sec 194C (Contractors)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="194C"
                            id="194C"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.tds.defaultRates['194C']}
                            onChange={(e) => handleDefaultRateChange('194C', e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="194H" className="block text-sm font-medium text-gray-700">Sec 194H (Commission)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="194H"
                            id="194H"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.tds.defaultRates['194H']}
                            onChange={(e) => handleDefaultRateChange('194H', e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="194I" className="block text-sm font-medium text-gray-700">Sec 194I (Rent)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="194I"
                            id="194I"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.tds.defaultRates['194I']}
                            onChange={(e) => handleDefaultRateChange('194I', e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="194J" className="block text-sm font-medium text-gray-700">Sec 194J (Professional)</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            name="194J"
                            id="194J"
                            min="0"
                            max="100"
                            step="0.01"
                            value={settings.tds.defaultRates['194J']}
                            onChange={(e) => handleDefaultRateChange('194J', e.target.value)}
                            className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TaxSettings;
