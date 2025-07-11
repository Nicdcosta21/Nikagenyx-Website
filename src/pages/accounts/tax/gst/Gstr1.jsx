import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchGstr1Data, generateGstr1, saveGstr1 } from '../../../../services/taxService';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import ExportButton from '../../../../components/ui/ExportButton';

const Gstr1 = () => {
  const location = useLocation();
  const returnId = location.state?.returnId;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [returnData, setReturnData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0], // First day of previous month
    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0] // Last day of previous month
  });
  
  const [activeTab, setActiveTab] = useState('b2b');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // If returnId is provided, fetch existing return data
        if (returnId) {
          const data = await fetchGstr1Data({ id: returnId });
          setReturnData(data);
        } else {
          // Otherwise, generate a new return based on date range
          const params = new URLSearchParams();
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
          
          const data = await generateGstr1(params);
          setReturnData(data);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load GSTR-1 data. Please try again later.');
        console.error('Error loading GSTR-1 data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [returnId, dateRange]);

  const handleDateRangeChange = (range) => {
    // Only allow changing date range for new returns
    if (!returnId) {
      setDateRange(range);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const result = await saveGstr1(returnData);
      setSuccess('GSTR-1 return has been saved successfully.');
      
      // Update the returnId so we're now editing an existing return
      if (result.id && !returnId) {
        window.history.replaceState(
          { returnId: result.id }, 
          '', 
          window.location.pathname
        );
      }
    } catch (err) {
      setError('Failed to save GSTR-1 return. Please try again.');
      console.error('Error saving GSTR-1:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      // This would call the export function from taxService based on format
      // For example: exportGstr1ToCsv, exportGstr1ToExcel, exportGstr1ToJson
      alert(`Exporting GSTR-1 to ${format} format`);
    } catch (err) {
      setError(`Failed to export to ${format} format. Please try again.`);
      console.error(`Error exporting GSTR-1 to ${format}:`, err);
    }
  };

  const renderTabContent = () => {
    if (!returnData) return null;

    switch(activeTab) {
      case 'b2b':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GSTIN/UIN of Recipient
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Place of Supply
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxable Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integrated Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Central Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State/UT Tax
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnData.b2b.map((invoice, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.gstin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.invoiceValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.placeOfSupply}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.taxRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.taxableValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.sgst)}</td>
                  </tr>
                ))}
                {returnData.b2b.length === 0 && (
                  <tr>
                    <td colSpan="10" className="px-6 py-4 text-center text-sm text-gray-500">No B2B invoice data found for the selected period.</td>
                  </tr>
                )}
              </tbody>
              {returnData.b2b.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="6" className="px-6 py-3 text-right text-sm font-medium text-gray-900">Total:</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, invoice) => sum + invoice.taxableValue, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, invoice) => sum + invoice.igst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, invoice) => sum + invoice.cgst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, invoice) => sum + invoice.sgst, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
        
      case 'b2c':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Place of Supply
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Rate
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxable Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integrated Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Central Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State/UT Tax
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnData.b2c.map((invoice, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.invoiceValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.placeOfSupply}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.taxRate}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.taxableValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(invoice.sgst)}</td>
                  </tr>
                ))}
                {returnData.b2c.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">No B2C invoice data found for the selected period.</td>
                  </tr>
                )}
              </tbody>
              {returnData.b2c.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="5" className="px-6 py-3 text-right text-sm font-medium text-gray-900">Total:</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, invoice) => sum + invoice.taxableValue, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, invoice) => sum + invoice.igst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, invoice) => sum + invoice.cgst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, invoice) => sum + invoice.sgst, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
        
      case 'hsn':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HSN Code
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UQC
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxable Value
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Integrated Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Central Tax
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State/UT Tax
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {returnData.hsn.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hsnCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.uqc}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.totalQuantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.totalValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.taxableValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.sgst)}</td>
                  </tr>
                ))}
                {returnData.hsn.length === 0 && (
                  <tr>
                    <td colSpan="9" className="px-6 py-4 text-center text-sm text-gray-500">No HSN data found for the selected period.</td>
                  </tr>
                )}
              </tbody>
              {returnData.hsn.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="5" className="px-6 py-3 text-right text-sm font-medium text-gray-900">Total:</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.hsn.reduce((sum, item) => sum + item.taxableValue, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.hsn.reduce((sum, item) => sum + item.igst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.hsn.reduce((sum, item) => sum + item.cgst, 0))}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(returnData.hsn.reduce((sum, item) => sum + item.sgst, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );

      case 'summary':
        return (
          <div className="bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary of GSTR-1</h3>
            
            <div className="overflow-hidden shadow sm:rounded-lg mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxable Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IGST
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CGST
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SGST
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tax
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">B2B Invoices</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnData.b2b.length}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, item) => sum + item.taxableValue, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, item) => sum + item.igst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, item) => sum + item.cgst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2b.reduce((sum, item) => sum + item.sgst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.igst + item.cgst + item.sgst, 0)
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">B2C Invoices</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{returnData.b2c.length}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, item) => sum + item.taxableValue, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, item) => sum + item.igst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, item) => sum + item.cgst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(returnData.b2c.reduce((sum, item) => sum + item.sgst, 0))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(
                        returnData.b2c.reduce((sum, item) => sum + item.igst + item.cgst + item.sgst, 0)
                      )}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="2" className="px-6 py-3 text-right text-sm font-medium text-gray-900">Grand Total:</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.taxableValue, 0) +
                        returnData.b2c.reduce((sum, item) => sum + item.taxableValue, 0)
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.igst, 0) +
                        returnData.b2c.reduce((sum, item) => sum + item.igst, 0)
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.cgst, 0) +
                        returnData.b2c.reduce((sum, item) => sum + item.cgst, 0)
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.sgst, 0) +
                        returnData.b2c.reduce((sum, item) => sum + item.sgst, 0)
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(
                        returnData.b2b.reduce((sum, item) => sum + item.igst + item.cgst + item.sgst, 0) +
                        returnData.b2c.reduce((sum, item) => sum + item.igst + item.cgst + item.sgst, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
              >
                {saving ? 'Saving...' : returnId ? 'Update Return' : 'Save Return'}
              </button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/accounts/tax/gst"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to GST Returns
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex flex-wrap justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              GSTR-1: Outward Supplies
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {returnId ? `Return for ${returnData?.period || 'loading...'}` : 'New Return'}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {!returnId && (
              <DateRangePicker 
                onChange={handleDateRangeChange} 
                value={dateRange}
                buttonClass="bg-white border border-gray-300 rounded-md shadow-sm px-4 py-2 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50"
              />
            )}
            
            <ExportButton onExport={handleExport} />
          </div>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4 m-6">
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
          <div className="rounded-md bg-green-50 p-4 m-6">
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
          <div>
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('b2b')}
                  className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'b2b' 
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  B2B Invoices
                </button>
                <button
                  onClick={() => setActiveTab('b2c')}
                  
