import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createAccount, updateAccount, getAccountById } from '../../../services/accountService';
import { useAccounting } from '../../../hooks/useAccounting';

const AccountForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshAccountingData } = useAccounting();
  const isEditing = Boolean(id);
  
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    type: '',
    subtype: '',
    isActive: true,
    parentId: '',
    taxRate: 0,
    openingBalance: 0,
  });
  
  const [loading, setLoading] = useState(isEditing);
  const [error, setError] = useState(null);
  const [parents, setParents] = useState([]);

  const accountTypes = [
    { value: 'Asset', label: 'Asset' },
    { value: 'Liability', label: 'Liability' },
    { value: 'Equity', label: 'Equity' },
    { value: 'Revenue', label: 'Revenue' },
    { value: 'Expense', label: 'Expense' },
  ];

  const subtypeOptions = {
    Asset: [
      'Current Asset',
      'Fixed Asset',
      'Investment',
      'Other Asset'
    ],
    Liability: [
      'Current Liability',
      'Long-term Liability',
      'Other Liability'
    ],
    Equity: [
      'Owner\'s Equity',
      'Retained Earnings',
      'Capital',
      'Drawing'
    ],
    Revenue: [
      'Operating Revenue',
      'Non-operating Revenue'
    ],
    Expense: [
      'Operating Expense',
      'Non-operating Expense',
      'Tax Expense'
    ]
  };

  useEffect(() => {
    // Load parent accounts for dropdown
    const fetchParentAccounts = async () => {
      try {
        // This would be replaced with an actual API call
        const parentAccountsResponse = await fetchAccounts();
        setParents(parentAccountsResponse);
      } catch (err) {
        console.error('Error fetching parent accounts:', err);
      }
    };

    // Load account details if editing
    const fetchAccount = async () => {
      if (!isEditing) return;
      
      try {
        setLoading(true);
        const account = await getAccountById(id);
        setForm({
          code: account.code || '',
          name: account.name || '',
          description: account.description || '',
          type: account.type || '',
          subtype: account.subtype || '',
          isActive: account.isActive !== false,
          parentId: account.parentId || '',
          taxRate: account.taxRate || 0,
          openingBalance: account.openingBalance || 0,
        });
      } catch (err) {
        setError('Failed to load account details. Please try again.');
        console.error('Error loading account:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchParentAccounts();
    fetchAccount();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
      // If changing the account type, reset the subtype
      ...(name === 'type' && { subtype: '' })
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (isEditing) {
        await updateAccount(id, form);
      } else {
        await createAccount(form);
      }
      refreshAccountingData(); // Refresh data in the context
      navigate('/accounts/chart-of-accounts');
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} account. Please check your input and try again.`);
      console.error(`Error ${isEditing ? 'updating' : 'creating'} account:`, err);
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          {isEditing ? 'Edit Account' : 'Create New Account'}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          {isEditing 
            ? 'Update the details of the existing account.'
            : 'Add a new account to your chart of accounts.'}
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mx-6 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
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
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">Account Code *</label>
            <div className="mt-1">
              <input
                type="text"
                name="code"
                id="code"
                required
                value={form.code}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Account Name *</label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                required
                value={form.name}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Account Type *</label>
            <div className="mt-1">
              <select
                id="type"
                name="type"
                required
                value={form.type}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select Type</option>
                {accountTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="subtype" className="block text-sm font-medium text-gray-700">Account Subtype</label>
            <div className="mt-1">
              <select
                id="subtype"
                name="subtype"
                value={form.subtype}
                onChange={handleChange}
                disabled={!form.type}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select Subtype</option>
                {form.type && subtypeOptions[form.type]?.map(subtype => (
                  <option key={subtype} value={subtype}>{subtype}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="parentId" className="block text-sm font-medium text-gray-700">Parent Account</label>
            <div className="mt-1">
              <select
                id="parentId"
                name="parentId"
                value={form.parentId}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">No Parent (Top Level)</option>
                {parents.map(parent => (
                  <option key={parent.id} value={parent.id}>{parent.name} ({parent.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700">Opening Balance</label>
            <div className="mt-1">
              <input
                type="number"
                name="openingBalance"
                id="openingBalance"
                value={form.openingBalance}
                onChange={handleChange}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
            <div className="mt-1">
              <input
                type="number"
                name="taxRate"
                id="taxRate"
                value={form.taxRate}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <div className="relative flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="isActive" className="font-medium text-gray-700">Active</label>
                <p className="text-gray-500">Inactive accounts are not available for new transactions.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/accounts/chart-of-accounts')}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
