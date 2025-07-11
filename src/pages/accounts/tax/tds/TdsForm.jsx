import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchTdsReturn, generateTdsReturn, saveTdsReturn } from '../../../../services/taxService';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import ExportButton from '../../../../components/ui/ExportButton';

const TdsForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    formType: '26Q',
    quarter: '',
    financialYear: '',
    deductions: [],
    challanDetails: {
      bsrCode: '',
      challanNo: '',
      paymentDate: '',
      amount: 0
    },
    verification: {
      name: '',
      designation: '',
      place: '',
      date: new Date().toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isEditing) {
          // Load existing TDS return
          setLoading(true);
          const data = await fetchTdsReturn(id);
          setFormData(data);
          setLoading(false);
        } else {
          // Generate new TDS return for current quarter
          const data = await generateTdsReturn();
          setFormData(data);
        }
      } catch (err) {
        setError('Failed to load TDS return data. Please try again later.');
        console.error('Error loading TDS return data:', err);
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChallanChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      challanDetails: {
        ...prev.challanDetails,
        [name]: value
      }
    }));
  };

  const handleVerificationChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      verification: {
        ...prev.verification,
        [name]: value
      }
    }));
  };

  const handleDeductionChange = (index, field, value) => {
    setFormData(prev => {
      const updatedDeductions = [...prev.deductions];
      updatedDeductions[index] = {
        ...updatedDeductions[index],
        [field]: value
      };
      
      // If amount changed, recalculate TDS amount based on rate
      if (field === 'amount' || field === 'rate') {
        const amount = field === 'amount' ? parseFloat(value) : parseFloat(updatedDeductions[index].amount);
        const rate = field === 'rate' ? parseFloat(value) : parseFloat(updatedDeductions[index].rate);
        updatedDeductions[index].tdsAmount = (amount * rate / 100).toFixed(2);
      }
      
      return {
        ...prev,
        deductions: updatedDeductions
      };
    });
  };

  const addDeduction = () => {
    setFormData(prev => ({
      ...prev,
      deductions: [
        ...prev.deductions,
        {
          section: '194C',
          deducteeType: 'Individual',
          panNo: '',
          name: '',
          amount: '0.00',
          rate: '1.00',
          tdsAmount: '0.00',
          deductionDate: new Date().toISOString().split('T')[0]
        }
      ]
    }));
  };

  const removeDeduction = (index) => {
    setFormData(prev => {
      const updatedDeductions = [...prev.deductions];
      updatedDeductions.splice(index, 1);
      return {
        ...prev,
        deductions: updatedDeductions
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Calculate total TDS amount
      const totalTds = formData.deductions.reduce((sum, item) => sum + parseFloat(item.tdsAmount || 0), 0);
      
      // Update challan amount to match total TDS
      const updatedFormData = {
        ...formData,
        challanDetails: {
          ...formData.challanDetails,
          amount: totalTds.toFixed(2)
        }
      };
      
      const result = await saveTdsReturn(updatedFormData);
      setSuccess('TDS return has been saved successfully.');
      
      if (!isEditing) {
        // Redirect to the edit page after creation
        setTimeout(() => {
          navigate(`/accounts/tax/tds/form/${result.id}`);
        }, 2000);
      }
    } catch (err) {
      setError('Failed to save TDS return. Please check your input and try again.');
      console.error('Error saving TDS return:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      // This would call the export function from taxService based on format
      alert(`Exporting TDS return to ${format} format`);
    } catch (err) {
      setError(`Failed to export to ${format} format. Please try again.`);
      console.error(`Error exporting TDS return to ${format}:`, err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Calculate totals
  const totalAmount = formData.deductions.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalTds = formData.deductions.reduce((sum, item) => sum + parseFloat(item.tdsAmount || 0), 0);

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/tax/tds"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to TDS Returns
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isEditing ? 'Edit TDS Return' : 'New TDS Return'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {formData.formType} for {formData.quarter} {formData.financialYear}
            </p>
          </div>
          
          <div>
            <ExportButton onExport={handleExport} />
          </div>
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
        
        <form onSubmit={handleSubmit}>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label htmlFor="formType" className="block text-sm font-medium text-gray-700">Form Type</label>
                <select
                  id="formType"
                  name="formType"
                  value={formData.formType}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="24Q">Form 24Q (TDS on Salaries)</option>
                  <option value="26Q">Form 26Q (TDS on Non-Salary Payments to Residents)</option>
                  <option value="27Q">Form 27Q (TDS on Payments to Non-Residents)</option>
                  <option value="27EQ">Form 27EQ (TCS Return)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">Quarter</label>
                <select
                  id="quarter"
                  name="quarter"
                  value={formData.quarter}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="Q1 (Apr-Jun)">Q1 (Apr-Jun)</option>
                  <option value="Q2 (Jul-Sep)">Q2 (Jul-Sep)</option>
                  <option value="Q3 (Oct-Dec)">Q3 (Oct-Dec)</option>
                  <option value="Q4 (Jan-Mar)">Q4 (Jan-Mar)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="financialYear" className="block text-sm font-medium text-gray-700">Financial Year</label>
                <select
                  id="financialYear"
                  name="financialYear"
                  value={formData.financialYear}
                  onChange={handleChange}
                  className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                  <option value="2021-22">2021-22</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* TDS Deductions Section */}
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">TDS Deductions</h3>
              <button
                type="button"
                onClick={addDeduction}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Deduction
              </button>
            </div>
            
            {formData.deductions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No deductions added yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by adding a TDS deduction record.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Section
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deductee Type
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PAN
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (%)
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        TDS Amount
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="relative px-3 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.deductions.map((deduction, index) => (
                      <tr key={index}>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <select
                            value={deduction.section}
                            onChange={(e) => handleDeductionChange(index, 'section', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="194C">194C</option>
                            <option value="194I">194I</option>
                            <option value="194J">194J</option>
                            <option value="194H">194H</option>
                            <option value="194A">194A</option>
                            <option value="other">Other</option>
                          </select>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <select
                            value={deduction.deducteeType}
                            onChange={(e) => handleDeductionChange(index, 'deducteeType', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          >
                            <option value="Individual">Individual</option>
                            <option value="Company">Company</option>
                            <option value="Firm">Firm</option>
                            <option value="AOP/BOI">AOP/BOI</option>
                            <option value="HUF">HUF</option>
                          </select>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={deduction.panNo}
                            onChange={(e) => handleDeductionChange(index, 'panNo', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="ABCDE1234F"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={deduction.name}
                            onChange={(e) => handleDeductionChange(index, 'name', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Deductee name"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={deduction.amount}
                            onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={deduction.rate}
                            onChange={(e) => handleDeductionChange(index, 'rate', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={deduction.tdsAmount}
                            readOnly
                            className="block w-full py-2 px-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm sm:text-sm"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={deduction.deductionDate}
                            onChange={(e) => handleDeductionChange(index, 'deductionDate', e.target.value)}
                            className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => removeDeduction(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                        Total:
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-500">
                        -
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        {formatCurrency(totalTds)}
                      </td>
                      <td colSpan="2" className="px-3 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          
          {/* Challan Details Section */}
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Challan Details</h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-4">
              <div>
                <label htmlFor="bsrCode" className="block text-sm font-medium text-gray-700">BSR Code</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="bsrCode"
                    name="bsrCode"
                    value={formData.challanDetails.bsrCode}
                    onChange={handleChallanChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="challanNo" className="block text-sm font-medium text-gray-700">Challan No.</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="challanNo"
                    name="challanNo"
                    value={formData.challanDetails.challanNo}
                    onChange={handleChallanChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="paymentDate"
                    name="paymentDate"
                    value={formData.challanDetails.paymentDate}
                    onChange={handleChallanChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.challanDetails.amount}
                    onChange={handleChallanChange}
                    step="0.01"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Verification Section */}
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Verification</h3>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name of Signatory</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.verification.name}
                    onChange={handleVerificationChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.verification.designation}
                    onChange={handleVerificationChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="place" className="block text-sm font-medium text-gray-700">Place</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="place"
                    name="place"
                    value={formData.verification.place}
                    onChange={handleVerificationChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.verification.date}
                    onChange={handleVerificationChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center">
                <input
                  id="verificationCheck"
                  name="verificationCheck"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="verificationCheck" className="ml-2 block text-sm text-gray-900">
                  I hereby certify that all the particulars furnished above are correct and complete.
                </label>
              </div>
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              onClick={() => navigate('/accounts/tax/tds')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {saving ? 'Saving...' : 'Save Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TdsForm;
