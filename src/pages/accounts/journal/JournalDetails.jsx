import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getJournalEntryById, deleteJournalEntry } from '../../../services/journalService';
import { formatDate, formatCurrency } from '../../../utils/formatters';

const JournalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        setLoading(true);
        const data = await getJournalEntryById(id);
        setEntry(data);
      } catch (err) {
        setError('Failed to load journal entry. Please try again later.');
        console.error('Error loading journal entry:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete entry #${entry.entryNumber}?`)) {
      try {
        await deleteJournalEntry(id);
        navigate('/accounts/journal');
      } catch (err) {
        setError('Failed to delete journal entry. Please try again.');
        console.error('Error deleting journal entry:', err);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'posted': return 'bg-green-100 text-green-800';
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
                onClick={() => navigate('/accounts/journal')}
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Go back to Journal Entries
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!entry) {
    return <div>Journal entry not found.</div>;
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Journal Entry: {entry.entryNumber}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Created on {formatDate(entry.createdAt)} by {entry.createdBy}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to={`/accounts/journal/edit/${id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Entry Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.entryNumber}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(entry.date)}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Reference</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.reference || '-'}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(entry.status)}`}>
                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900">{entry.description}</dd>
          </div>
        </dl>
      </div>
      
      <div className="px-4 py-5 sm:px-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Journal Items</h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entry.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.accountCode} - {item.accountName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.type === 'debit' ? formatCurrency(item.amount) : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.type === 'credit' ? formatCurrency(item.amount) : ''}
                  </td>
                </tr>
              ))}
              
              {/* Totals row */}
              <tr className="bg-gray-50">
                <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                  Totals:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(entry.totalDebit)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(entry.totalCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Audit information */}
      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Audit Information</h4>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3 text-sm">
          <div className="sm:col-span-1">
            <dt className="font-medium text-gray-500">Created By</dt>
            <dd className="text-gray-900">{entry.createdBy}</dd>
          </div>
          <div className="sm:col-span-1">
            <dt className="font-medium text-gray-500">Created On</dt>
            <dd className="text-gray-900">{formatDate(entry.createdAt, true)}</dd>
          </div>
          {entry.updatedAt !== entry.createdAt && (
            <>
              <div className="sm:col-span-1">
                <dt className="font-medium text-gray-500">Last Updated By</dt>
                <dd className="text-gray-900">{entry.updatedBy || entry.createdBy}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="font-medium text-gray-500">Last Updated On</dt>
                <dd className="text-gray-900">{formatDate(entry.updatedAt, true)}</dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default JournalDetails;
