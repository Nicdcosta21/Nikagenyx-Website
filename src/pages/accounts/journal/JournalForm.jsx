import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createJournalEntry, getJournalEntryById, updateJournalEntry } from '../../../services/journalService';
import { fetchAccounts } from '../../../services/accountService';
import { useAccounting } from '../../../hooks/useAccounting';
import { v4 as uuidv4 } from 'uuid';

const JournalForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshAccountingData } = useAccounting();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const emptyItem = {
    id: uuidv4(),
    account: '',
    description: '',
    debit: '',
    credit: ''
  };
  
  const [form, setForm] = useState({
    entryNumber: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    status: 'draft',
    items: [emptyItem, emptyItem] // Start with two empty items
  });

  // Grouped account options by type
  const accountsByType = accounts.reduce((acc, account) => {
    if (!acc[account.type]) acc[account.type] = [];
    acc[account.type].push(account);
    return acc;
  }, {});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch accounts
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
        
        // If editing, fetch journal entry details
        if (isEditing) {
          const entry = await getJournalEntryById(id);
          
          // Transform API response to form state
          setForm({
            entryNumber: entry.entryNumber,
            date: new Date(entry.date).toISOString().split('T')[0],
            description: entry.description || '',
            reference: entry.reference || '',
            status: entry.status,
            items: entry.items.map(item => ({
              id: item.id,
              account: item.accountId,
              description: item.description || '',
              debit: item.type === 'debit' ? item.amount.toString() : '',
              credit: item.type === 'credit' ? item.amount.toString() : ''
            }))
          });
        } else {
          // For new entries, generate a new entry number
          generateEntryNumber();
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load required data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id, isEditing]);

  // Generate a unique entry number (format: JE-YYYYMMDD-XXX)
  const generateEntryNumber = () => {
    const today = new Date();
    const datePart = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setForm(prev => ({ ...prev, entryNumber: `JE-${datePart}-${randomPart}` }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (id, field, value) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem, id: uuidv4() }]
    }));
  };

  const removeItem = (id) => {
    if (form.items.length <= 2) {
      alert("Journal entries must have at least two items.");
      return;
    }
    
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const calculateTotals = () => {
    return form.items.reduce((totals, item) => {
      const debit = parseFloat(item.debit) || 0;
      const credit = parseFloat(item.credit) || 0;
      return {
        totalDebit: totals.totalDebit + debit,
        totalCredit: totals.totalCredit + credit
      };
    }, { totalDebit: 0, totalCredit: 0 });
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const validateForm = () => {
    // Check if the form is balanced
    if (!isBalanced) {
      setError('Journal entry must be balanced. Debits must equal credits.');
      return false;
    }
    
    // Check if total amount is greater than 0
    if (totalDebit === 0) {
      setError('Journal entry must have a non-zero amount.');
      return false;
    }
    
    // Check if all items have an account selected
    const hasEmptyAccount = form.items.some(item => !item.account);
    if (hasEmptyAccount) {
      setError('All items must have an account selected.');
      return false;
    }
    
    // Check if each item has either debit or credit (but not both)
    const hasInvalidItem = form.items.some(item => {
      const hasDebit = !!item.debit;
      const hasCredit = !!item.credit;
      return (!hasDebit && !hasCredit) || (hasDebit && hasCredit);
    });
    
    if (hasInvalidItem) {
      setError('Each line must have either a debit or credit amount (not both).');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Format data for API
      const journalData = {
        entryNumber: form.entryNumber,
        date: form.date,
        description: form.description,
        reference: form.reference,
        status: form.status,
        items: form.items.map(item => ({
          accountId: item.account,
          description: item.description,
          type: item.debit ? 'debit' : 'credit',
          amount: parseFloat(item.debit || item.credit)
        }))
      };
      
      if (isEditing) {
        await updateJournalEntry(id, journalData);
      } else {
        await createJournalEntry(journalData);
      }
      
      refreshAccountingData();
      navigate('/accounts/journal');
    } catch (err) {
      console.error('Error saving journal entry:', err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} journal entry: ${err.message}`);
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
          {isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {isEditing 
            ? 'Update the details of this journal entry.'
            : 'Create a new journal entry to record a financial transaction.'}
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

      <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="entryNumber" className="block text-sm font-medium text-gray-700">Entry Number *</label>
            <div className="mt-1">
              <input
                type="text"
                name="entryNumber"
                id="entryNumber"
                required
                readOnly
                value={form.entryNumber}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 bg-gray-100 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date *</label>
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

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description *</label>
            <div className="mt-1">
              <input
                type="text"
                name="description"
                id="description"
                required
                value={form.description}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Brief description of this transaction"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="reference" className="block text-sm font-medium text-gray-700">Reference</label>
            <div className="mt-1">
              <input
                type="text"
                name="reference"
                id="reference"
                value={form.reference}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Invoice #, PO #, etc."
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
                <option value="posted">Posted</option>
                <option value="voided">Voided</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h4 className="text-md font-medium text-gray-900">Journal Items</h4>
          <p className="text-sm text-gray-500 mb-4">Add line items to record debits and credits.</p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                  <th scope="col" className="relative px-6 py-3 w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {form.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={item.account}
                        onChange={(e) => handleItemChange(item.id, 'account', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select Account</option>
                        {Object.entries(accountsByType).map(([type, accountsList]) => (
                          <optgroup key={type} label={type}>
                            {accountsList.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="Line description"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={item.debit}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleItemChange(item.id, 'debit', value);
                          if (value) handleItemChange(item.id, 'credit', '');
                        }}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={item.credit}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleItemChange(item.id, 'credit', value);
                          if (value) handleItemChange(item.id, 'debit', '');
                        }}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                
                {/* Totals row */}
                <tr className="bg-gray-50">
                  <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    Totals:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {totalDebit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {totalCredit.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
                
                {/* Difference row */}
                <tr className={`${isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                  <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    Difference:
                  </td>
                  <td colSpan="2" className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'} text-center`}>
                    {Math.abs(totalDebit - totalCredit).toFixed(2)}
                    {isBalanced && (
                      <span className="ml-2">✓</span>
                    )}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Line
            </button>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/accounts/journal')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isBalanced}
              className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isBalanced ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JournalForm;
