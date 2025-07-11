import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getInvoiceById, deleteInvoice, updateInvoiceStatus, generatePdf } from '../../../services/invoiceService';
import { formatDate, formatCurrency } from '../../../utils/formatters';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);
  const actionMenuRef = useRef(null);
  
  // Company details would normally come from settings
  const companyDetails = {
    name: 'Nikagenyx',
    gstin: '29AADCB2230M1ZT',
    address: '123 Main Street, Bangalore, Karnataka 560001',
    email: 'accounts@nikagenyx.com',
    phone: '+91 98765 43210',
    bankDetails: 'Account Name: Nikagenyx\nAccount #: 12345678901\nIFSC: HDFC0001234\nBank: HDFC Bank'
  };

  // Get GST rates and totals
  const gstRateTotals = invoice?.items.reduce((acc, item) => {
    const taxRate = parseFloat(item.taxRate);
    if (!acc[taxRate]) {
      acc[taxRate] = {
        taxableAmount: 0,
        taxAmount: 0,
      };
    }
    
    // Calculate pre-tax amount
    const preTaxAmount = item.amount - item.taxAmount;
    
    acc[taxRate].taxableAmount += preTaxAmount;
    acc[taxRate].taxAmount += item.taxAmount;
    
    return acc;
  }, {});

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const data = await getInvoiceById(id);
        setInvoice(data);
        setError(null);
      } catch (err) {
        setError('Failed to load invoice. Please try again later.');
        console.error('Error loading invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setStatusMenuOpen(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStatusChange = async (newStatus) => {
    try {
      setProcessing(true);
      await updateInvoiceStatus(id, newStatus);
      setInvoice(prev => ({ ...prev, status: newStatus }));
      setStatusMenuOpen(false);
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete invoice #${invoice.invoiceNumber}?`)) {
      try {
        setProcessing(true);
        await deleteInvoice(id);
        navigate('/accounts/invoicing');
      } catch (err) {
        setError('Failed to delete invoice. Please try again.');
        console.error('Error deleting invoice:', err);
        setProcessing(false);
      }
    }
  };

  const handlePdfDownload = async () => {
    try {
      setProcessing(true);
      const pdfBlob = await generatePdf(id);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setProcessing(false);
    } catch (err) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Error generating PDF:', err);
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'voided': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => navigate('/accounts/invoicing')}
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back to Invoices
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return <div>Invoice not found.</div>;
  }

  return (
    <div>
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

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Invoice Header */}
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              {invoice.invoiceType === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'}: {invoice.invoiceNumber}
              <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Created on {formatDate(invoice.createdAt || invoice.date)} • Due on {formatDate(invoice.dueDate)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            {/* Status dropdown */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                disabled={processing}
              >
                Change Status
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {statusMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleStatusChange('draft')}
                      role="menuitem"
                    >
                      Draft
                    </button>
                    <button
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleStatusChange('sent')}
                      role="menuitem"
                    >
                      Sent
                    </button>
                    <button
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleStatusChange('paid')}
                      role="menuitem"
                    >
                      Paid
                    </button>
                    <button
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => handleStatusChange('voided')}
                      role="menuitem"
                    >
                      Voided
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions dropdown */}
            <div className="relative" ref={actionMenuRef}>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                onClick={() => setActionMenuOpen(!actionMenuOpen)}
                disabled={processing}
              >
                Actions
                <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              
              {actionMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={handlePdfDownload}
                      role="menuitem"
                    >
                      Download PDF
                    </button>
                    <Link
                      to={`/accounts/invoicing/edit/${id}`}
                      className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      role="menuitem"
                    >
                      Edit Invoice
                    </Link>
                    <button
                      className="text-red-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={handleDelete}
                      role="menuitem"
                    >
                      Delete Invoice
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:px-6">
            {/* Addresses */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 mb-8">
              <div>
                <h4 className="text-md font-medium text-gray-900">From</h4>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">{companyDetails.name}</p>
                  <p className="text-sm text-gray-600">GSTIN: {companyDetails.gstin}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
                  <p className="text-sm text-gray-600">{companyDetails.email}</p>
                  <p className="text-sm text-gray-600">{companyDetails.phone}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-gray-900">To</h4>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">{invoice.partyName}</p>
                  {invoice.partyGstin && <p className="text-sm text-gray-600">GSTIN: {invoice.partyGstin}</p>}
                  {invoice.partyAddress && <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.partyAddress}</p>}
                  {invoice.partyEmail && <p className="text-sm text-gray-600">{invoice.partyEmail}</p>}
                  {invoice.partyPhone && <p className="text-sm text-gray-600">{invoice.partyPhone}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="mt-8">
              <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item & Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Disc %
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST %
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST Amt
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-right whitespace-nowrap">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-right whitespace-nowrap">
                          {item.discountPercent}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 text-right whitespace-nowrap">
                          {item.taxRate}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right whitespace-nowrap">
                          {formatCurrency(item.taxAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium text-right whitespace-nowrap">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="mt-8 sm:w-1/2 sm:ml-auto">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between py-2 text-sm text-gray-700">
                  <div>Subtotal</div>
                  <div>{formatCurrency(invoice.subtotal)}</div>
                </div>
                
                {/* GST Breakup by Rate */}
                {Object.entries(gstRateTotals || {}).map(([rate, values]) => (
                  <div key={rate} className="flex justify-between py-2 text-sm text-gray-700">
                    <div>GST @ {rate}%</div>
                    <div>{formatCurrency(values.taxAmount)}</div>
                  </div>
                ))}
                
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-base font-medium text-gray-900">
                  <div>Total</div>
                  <div>{formatCurrency(invoice.total)}</div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="mt-8 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              {invoice.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Notes</h4>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              
              {invoice.terms && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Terms & Conditions</h4>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{invoice.terms}</p>
                </div>
              )}
            </div>

            {/* Bank Details */}
            <div className="mt-8">
              <h4 className="text-sm font-medium text-gray-900">Payment Details</h4>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{companyDetails.bankDetails}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;
