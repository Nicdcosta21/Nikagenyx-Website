import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchGstr3bData, generateGstr3b, saveGstr3b } from '../../../../services/taxService';
import { formatDate, formatCurrency } from '../../../../utils/formatters';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import ExportButton from '../../../../components/ui/ExportButton';

const Gstr3b = () => {
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
  
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // If returnId is provided, fetch existing return data
        if (returnId) {
          const data = await fetchGstr3bData({ id: returnId });
          setReturnData(data);
        } else {
          // Otherwise, generate a new return based on date range
          const params = new URLSearchParams();
          params.append('startDate', dateRange.start);
          params.append('endDate', dateRange.end);
          
          const data = await generateGstr3b(params);
          setReturnData(data);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load GSTR-3B data. Please try again later.');
        console.error('Error loading GSTR-3B data:', err);
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
      
      const result = await saveGstr3b(returnData);
      setSuccess('GSTR-3B return has been saved successfully.');
      
      // Update the returnId so we're now editing an existing return
      if (result.id && !returnId) {
        window.history.replaceState(
          { returnId: result.id }, 
          '', 
          window.location.pathname
        );
      }
    } catch (err) {
      setError('Failed to save GSTR-3B return. Please try again.');
      console.error('Error saving GSTR-3B:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      // This would call the export function from taxService based on format
      alert(`Exporting GSTR-3B to ${format} format`);
    } catch (err) {
      setError(`Failed to export to ${format} format. Please try again.`);
      console.error(`Error exporting GSTR-3B to ${format}:`, err);
    }
  };

  const renderTabContent = () => {
    if (!returnData) return null;

    switch(activeTab) {
      case 'summary':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">3.1 Details of Outward Supplies and inward supplies liable to reverse charge</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nature of Supplies
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Taxable Value
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cess
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.outwardSupplies.taxable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.outwardSupplies.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.outwardSupplies.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.outwardSupplies.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.outwardSupplies.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (b) Outward taxable supplies (zero rated)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.zeroRated.taxable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.zeroRated.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.zeroRated.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.zeroRated.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.zeroRated.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (c) Other outward supplies (Nil rated, exempted)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.exempted.taxable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (d) Inward supplies (liable to reverse charge)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.reverseCharge.taxable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.reverseCharge.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.reverseCharge.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.reverseCharge.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.reverseCharge.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (e) Non-GST outward supplies
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.nonGst.taxable)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">3.2 Of the supplies shown in 3.1(a), details of inter-state supplies</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Place of Supply (State/UT)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Taxable Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount of Integrated Tax
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnData.interStateSupplies.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.placeOfSupply}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.taxable)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.igst)}</td>
                      </tr>
                    ))}
                    {returnData.interStateSupplies.length === 0 && (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">No inter-state supplies found for the selected period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">4. Eligible ITC</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cess
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (A) ITC Available (whether in full or part)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.available.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.available.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.available.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.available.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (B) ITC Reversed
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.reversed.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.reversed.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.reversed.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.reversed.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (C) Net ITC Available (A) - (B)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnData.itc.available.igst - returnData.itc.reversed.igst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnData.itc.available.cgst - returnData.itc.reversed.cgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnData.itc.available.sgst - returnData.itc.reversed.sgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(returnData.itc.available.cess - returnData.itc.reversed.cess)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        (D) Ineligible ITC
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.ineligible.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.ineligible.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.ineligible.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itc.ineligible.cess)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">5. Values of exempt, nil-rated and non-GST inward supplies</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nature of supplies
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inter-State supplies
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Intra-State supplies
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        From a supplier under composition scheme, Exempt and Nil rated supply
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.exemptedInward.interstate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.exemptedInward.intrastate)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Non GST supply
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.nonGstInward.interstate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.nonGstInward.intrastate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">5.1 Interest & Late Fee</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cess
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Interest
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.igst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.cess)}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Late Fee
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.lateFee.cgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.lateFee.sgst)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
        
      case 'payment':
        return (
          <div className="space-y-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">6. Payment of tax</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cess
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Tax Payable
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayable.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayable.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayable.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayable.cess)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Tax already paid
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxAlreadyPaid.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxAlreadyPaid.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxAlreadyPaid.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxAlreadyPaid.cess)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Utilization of ITC
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itcUtilization.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itcUtilization.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itcUtilization.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.itcUtilization.cess)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Tax payable in cash
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayableInCash.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayableInCash.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayableInCash.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.taxPayableInCash.cess)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Interest
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.interest.cess)}</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Late Fee
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.lateFee.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(returnData.lateFee.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">-</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      Total Amount to be paid in cash
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(returnData.totalPayableInCash.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(returnData.totalPayableInCash.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(returnData.totalPayableInCash.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(returnData.totalPayableInCash.cess)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Payment Information</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      After saving this GSTR-3B return, use the payment details above to make your GST payment through the official GST portal or your bank's payment gateway.
                    </p>
                  </div>
                </div>
              </div>
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
        
      case 'verification':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Verification</h3>
            
            <div className="border rounded-md p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Declaration</h4>
              <p className="text-sm text-gray-600 mb-4">
                I hereby solemnly affirm and declare that the information given herein above is true and correct to the best of my knowledge and belief and nothing has been concealed therefrom.
              </p>
              
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6 mt-6">
                <div className="sm:col-span-3">
                  <label htmlFor="signatory" className="block text-sm font-medium text-gray-700">Name of Authorized Signatory</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="signatory"
                      id="signatory"
                      value={returnData.verification.signatory || ''}
                      onChange={(e) => setReturnData({
                        ...returnData,
                        verification: {
                          ...returnData.verification,
                          signatory: e.target.value
                        }
                      })}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700">Designation/Status</label>
                  <div className="mt-1">
                    <select
                      id="designation"
                      name="designation"
                      value={returnData.verification.designation || ''}
                      onChange={(e) => setReturnData({
                        ...returnData,
                        verification: {
                          ...returnData.verification,
                          designation: e.target.value
                        }
                      })}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Select Designation</option>
                      <option value="Proprietor">Proprietor</option>
                      <option value="Partner">Partner</option>
                      <option value="Director">Director</option>
                      <option value="Authorized Representative">Authorized Representative</option>
                      <option value="Manager">Manager</option>
                      <option value="Managing Director">Managing Director</option>
                      <option value="Company Secretary">Company Secretary</option>
                      <option value="Trustee">Trustee</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex items-center">
                  <input
                    id="verification"
                    name="verification"
                    type="checkbox"
                    checked={returnData.verification.agreed || false}
                    onChange={(e) => setReturnData({
                      ...returnData,
                      verification: {
                        ...returnData.verification,
                        agreed: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="verification" className="ml-2 block text-sm text-gray-900">
                    I verify that the information provided above is true and correct to the best of my knowledge.
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !returnData.verification.agreed}
                className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm ${
                  returnData.verification.agreed ? 'hover:bg-indigo-700' : 'opacity-50 cursor-not-allowed'
                } focus:outline-none`}
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
              GSTR-3B: Monthly Return
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
                  onClick={() => setActiveTab('summary')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'summary' 
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('payment')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'payment' 
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Payment
                </button>
                <button
                  onClick={() => setActiveTab('verification')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'verification' 
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Verification
                </button>
              </nav>
            </div>

            <div className="px-4 py-5 sm:p-6">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gstr3b;
