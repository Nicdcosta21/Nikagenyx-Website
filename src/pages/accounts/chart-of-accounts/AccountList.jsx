import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAccounts, deleteAccount } from '../../../services/accountService';
import { useAccounting } from '../../../hooks/useAccounting';

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();
  const { refreshData } = useAccounting();
  
  // Account types with their respective CSS classes
  const accountTypeClasses = {
    'Asset': 'bg-blue-100 text-blue-800',
    'Liability': 'bg-red-100 text-red-800',
    'Equity': 'bg-green-100 text-green-800',
    'Revenue': 'bg-purple-100 text-purple-800',
    'Expense': 'bg-yellow-100 text-yellow-800'
  };

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoading(true);
        const data = await fetchAccounts();
        setAccounts(data);
        setError(null);
      } catch (err) {
        setError('Failed to load accounts. Please try again later.');
        console.error('Error loading accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [refreshData]);

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedAccounts.length} selected accounts?`)) {
      try {
        await Promise.all(selectedAccounts.map(id => deleteAccount(id)));
        setAccounts(accounts.filter(account => !selectedAccounts.includes(account.id)));
        setSelectedAccounts([]);
      } catch (err) {
        setError('Failed to delete accounts. Please try again.');
        console.error('Error deleting accounts:', err);
      }
    }
  };

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(filter.toLowerCase()) || 
    account.code.toString().includes(filter)
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <label htmlFor="filter" className="sr-only">Filter accounts</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              id="filter"
              name="filter"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Filter by name or code"
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="ml-4 flex">
          {selectedAccounts.length > 0 && (
            <button
              type="button"
              className="mr-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={handleDeleteSelected}
            >
              Delete Selected
            </button>
          )}
          <Link
            to="new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Account
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredAccounts.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No accounts found. {filter && <button onClick={() => setFilter('')} className="text-indigo-600 hover:text-indigo-500">Clear filter</button>}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={selectedAccounts.length === filteredAccounts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAccounts(filteredAccounts.map(a => a.id));
                      } else {
                        setSelectedAccounts([]);
                      }
                    }}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      checked={selectedAccounts.includes(account.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts([...selectedAccounts, account.id]);
                        } else {
                          setSelectedAccounts(selectedAccounts.filter(id => id !== account.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {account.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link to={`${account.id}`} className="text-indigo-600 hover:text-indigo-900">
                      {account.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${accountTypeClasses[account.type] || 'bg-gray-100 text-gray-800'}`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹ {account.balance?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`edit/${account.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${account.name}"?`)) {
                          deleteAccount(account.id)
                            .then(() => {
                              setAccounts(accounts.filter(a => a.id !== account.id));
                            })
                            .catch(err => {
                              setError('Failed to delete account. Please try again.');
                              console.error('Error deleting account:', err);
                            });
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AccountList;
