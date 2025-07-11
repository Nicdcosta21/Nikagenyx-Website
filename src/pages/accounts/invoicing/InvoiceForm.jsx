import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createInvoice, getInvoiceById, updateInvoice } from '../../../services/invoiceService';
import { fetchAccounts } from '../../../services/accountService';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../../../utils/formatters';

const InvoiceForm = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const invoiceType = isEditing ? null : type; // 'sale' or 'purchase'
  
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [companyDetails, setCompanyDetails] = useState({
    name: 'Nikagenyx',
    gstin: '',
    address: '',
    email: '',
    phone: '',
    bankDetails: ''
  });

  // Empty item template
  const emptyItem = {
    id: uuidv4(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    discountPercent: 0,
    taxRate: 5,  // Default to 5%
    taxAmount: 0,
    amount: 0
  };
  
  const [form, setForm] = useState({
    invoiceNumber: '',
    invoiceType: invoiceType || 'sale',
    status: 'draft',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0], // Default due date is 30 days from today
    partyName: '',
    partyGstin: '',
    partyAddress: '',
    partyEmail: '',
    partyPhone: '',
    items: [{ ...emptyItem }],
    notes: '',
    terms: 'Payment is due within 30 days.',
    subtotal: 0,
    gstTotal: 0,
    total: 0
  });

  // Group accounts by type
  const revenueAccounts = accounts.filter(account => account.type === 'Revenue');
  const expenseAccounts = accounts.filter(account => account.type === 'Expense');
  
  useEffect(() => {
    // Fetch company details from settings
    const fetchCompanyDetails = async () => {
      // This would normally come from an API or settings
      // For now, we'll just use hardcoded values
      setCompanyDetails({
        name: 'Nikagenyx',
        gstin: '29AADCB2230M1ZT', // Example GSTIN
        address: '123 Main Street, Bangalore, Karnataka 560001',
        email: 'accounts@nikagenyx.com',
        phone: '+91 98765 43210',
        bankDetails: 'Account Name: Nikagenyx\nAccount #: 12345678901\nIFSC: HDFC0001234\nBank: HDFC Bank'
      });
    };

    // Load accounts and generate invoice number
    const loadData = async () => {
      try {
        // Fetch accounts
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
        
        // If editing, fetch invoice details
        if (isEditing) {
          const invoice = await getInvoiceById(id);
          setForm({
            invoiceNumber: invoice.invoiceNumber,
            invoiceType: invoice.invoiceType,
            status: invoice.status,
            date: new Date(invoice.date).toISOString().split('T')[0],
            dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
            partyName: invoice.partyName,
            partyGstin: invoice.partyGstin || '',
            partyAddress: invoice.partyAddress || '',
            partyEmail: invoice.partyEmail || '',
            partyPhone: invoice.partyPhone || '',
            items: invoice.items.map(item => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              amount: item.amount,
              accountId: item.accountId
            })),
            notes: invoice.notes || '',
            terms: invoice.terms || '',
            subtotal: invoice.subtotal,
            gstTotal: invoice.gstTotal,
            total: invoice.total
          });
        } else {
          // For new invoices, generate a number
          generateInvoiceNumber(invoiceType);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanyDetails();
    loadData();
  }, [id, isEditing, invoiceType]);

  // Generate a unique invoice number (format: INV-YYYYMMDD-XXX for sales, PUR-YYYYMMDD-XXX for purchases)
  const generateInvoiceNumber = (type) => {
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const prefix = type === 'sale' ? 'INV' : 'PUR';
    
    setForm(prev => ({ 
      ...prev, 
      invoiceNumber: `${prefix}-${datePart}-${randomPart}`,
      invoiceType: type
    }));
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes to invoice items
  const handleItemChange = (id, field, value) => {
    setForm(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // Recalculate amount and tax whenever quantity, price, discount, or tax rate changes
          if (['quantity', 'unitPrice', 'discountPercent', 'taxRate'].includes(field)) {
            const quantity = parseFloat(updatedItem.quantity) || 0;
            const unitPrice = parseFloat(updatedItem.unitPrice) || 0;
            const discountPercent = parseFloat(updatedItem.discountPercent) || 0;
            const taxRate = parseFloat(updatedItem.taxRate) || 0;
            
            // Calculate line amount before tax
            const lineAmountBeforeTax = quantity * unitPrice * (1 - discountPercent / 100);
            
            // Calculate tax amount
            const taxAmount = lineAmountBeforeTax * (taxRate / 100);
            
            // Calculate total line amount
            const lineAmount = lineAmountBeforeTax + taxAmount;
            
            updatedItem.taxAmount = parseFloat(taxAmount.toFixed(2));
            updatedItem.amount = parseFloat(lineAmount.toFixed(2));
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // Recalculate invoice totals
      const subtotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const gstTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        gstTotal: parseFloat(gstTotal.toFixed(2)),
        total: parseFloat(subtotal.toFixed(2))
      };
    });
  };

  // Add a new item row
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem, id: uuidv4() }]
    }));
  };

  // Remove an item row
  const removeItem = (id) => {
    if (form.items.length <= 1) {
      alert("Invoice must have at least one item.");
      return;
    }
    
    setForm(prev => {
      const updatedItems = prev.items.filter(item => item.id !== id);
      
      // Recalculate invoice totals
      const subtotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const gstTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
      
      return {
        ...prev,
        items: updatedItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        gstTotal: parseFloat(gstTotal.toFixed(2)),
        total: parseFloat(subtotal.toFixed(2))
      };
    });
  };

  // Validate the form before submission
  const validateForm = () => {
    // Check if party name is provided
    if (!form.partyName.trim()) {
      setError('Party name is required.');
      return false;
    }
    
    // Check if all items have a description and valid numbers
    const hasInvalidItem = form.items.some(item => {
      return !item.description.trim() || 
             isNaN(item.quantity) || 
             item.quantity <= 0 ||
             isNaN(item.unitPrice) || 
             item.unitPrice < 0;
    });
    
    if (hasInvalidItem) {
      setError('All items must have a description, valid quantity, and price.');
      return false;
    }
    
    // Check if at least one item is added
    if (form.items.length === 0) {
      setError('Please add at least one item to the invoice.');
      return false;
    }
    
    return true;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (isEditing) {
        await updateInvoice(id, form);
      } else {
        await createInvoice(form);
      }
      
      navigate('/accounts/invoicing');
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} invoice: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {isEditing 
            ? `Edit Invoice #${form.invoiceNumber}` 
            : `New ${form.invoiceType === 'sale' ? 'Sales' : 'Purchase'} Invoice`}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {isEditing
            ? 'Update the details of this invoice.'
            : form.invoiceType === 'sale'
              ? 'Create a new sales invoice to bill your customers.'
              : 'Create a new purchase invoice to record vendor purchases.'
          }
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

      <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-8">
        {/* Invoice Header */}
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Invoice Number *</label>
            <div className="mt-1">
              <input
                type="text"
                name="invoiceNumber"
                id="invoiceNumber"
                required
                readOnly
                value={form.invoiceNumber}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 bg-gray-100 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status *</label>
            <div className="mt-1">
              <select
                id="status"
                name="status"
                required
                value={form.status}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="voided">Voided</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Invoice Date *</label>
            <div className="mt-1">
              <input
                type="date"
                name="date"
                id="date"
                required
                value={form.date}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date *</label>
            <div className="mt-1">
              <input
                type="date"
                name="dueDate"
                id="dueDate"
                required
                value={form.dueDate}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Company & Party Details */}
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-md font-medium text-gray-900">From</h3>
              <p className="mt-1 text-sm text-gray-600">{companyDetails.name}</p>
              <p className="mt-1 text-sm text-gray-600">GSTIN: {companyDetails.gstin}</p>
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{companyDetails.address}</p>
              <p className="mt-1 text-sm text-gray-600">{companyDetails.email}</p>
              <p className="mt-1 text-sm text-gray-600">{companyDetails.phone}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-md font-medium text-gray-900">To</h3>
              <div className="mt-1">
                <label htmlFor="partyName" className="block text-sm font-medium text-gray-700">Party Name *</label>
                <input
                  type="text"
                  name="partyName"
                  id="partyName"
                  required
                  value={form.partyName}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="mt-3">
                <label htmlFor="partyGstin" className="block text-sm font-medium text-gray-700">GSTIN</label>
                <input
                  type="text"
                  name="partyGstin"
                  id="partyGstin"
                  value={form.partyGstin}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="mt-3">
                <label htmlFor="partyAddress" className="block text-sm font-medium text-gray-700">Address</label>
                <textarea
                  id="partyAddress"
                  name="partyAddress"
                  rows={2}
                  value={form.partyAddress}
                  onChange={handleChange}
                  className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="partyEmail" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="partyEmail"
                    id="partyEmail"
                    value={form.partyEmail}
                    onChange={handleChange}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="partyPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    name="partyPhone"
                    id="partyPhone"
                    value={form.partyPhone}
                    onChange={handleChange}
                    className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div>
          <h4 className="text-md font-medium text-gray-900">Invoice Items</h4>
          <p className="text-sm text-gray-500 mb-4">Add line items to your invoice.</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item & Description
                  </th>
                  {form.invoiceType === 'sale' && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Income Account
                    </th>
                  )}
                  {form.invoiceType === 'purchase' && (
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expense Account
                    </th>
                  )}
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disc %
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST %
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST Amt
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="relative px-3 py-3 w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {form.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Item description"
                        required
                      />
                    </td>
                    <td className="px-3 py-4">
                      <select
                        value={item.accountId || ''}
                        onChange={(e) => handleItemChange(item.id, 'accountId', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Select Account</option>
                        {form.invoiceType === 'sale' ? (
                          revenueAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))
                        ) : (
                          expenseAccounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))
                        )}
                      </select>
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="1"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="number"
                        value={item.discountPercent}
                        onChange={(e) => handleItemChange(item.id, 'discountPercent', parseFloat(e.target.value))}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <select
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value))}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={formatCurrency(item.taxAmount)}
                        readOnly
                        className="shadow-sm block w-full sm:text-sm border-gray-300 bg-gray-100 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <input
                        type="text"
                        value={formatCurrency(item.amount)}
                        readOnly
                        className="shadow-sm block w-full sm:text-sm border-gray-300 bg-gray-100 rounded-md"
                      />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
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
              <tfoot>
                <tr>
                  <td colSpan={9} className="px-3 py-4">
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Line
                    </button>
                  </td>
                </tr>
                
                {/* Totals */}
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={7} className="px-3 py-4 text-right font-medium text-gray-700">
                    Subtotal:
                  </td>
                  <td colSpan={2} className="px-3 py-4 text-left font-medium text-gray-900">
                    {formatCurrency(form.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-right font-medium text-gray-700">
                    GST Total:
                  </td>
                  <td colSpan={2} className="px-3 py-4 text-left font-medium text-gray-900">
                    {formatCurrency(form.gstTotal)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-3 py-4 text-right font-medium text-gray-900">
                    Total:
                  </td>
                  <td colSpan={2} className="px-3 py-4 text-left font-medium text-gray-900">
                    {formatCurrency(form.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <div className="mt-1">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={form.notes}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Additional notes for the customer"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="terms" className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
            <div className="mt-1">
              <textarea
                id="terms"
                name="terms"
                rows={3}
                value={form.terms}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Payment terms and conditions"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/accounts/invoicing')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Invoice' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InvoiceForm;
