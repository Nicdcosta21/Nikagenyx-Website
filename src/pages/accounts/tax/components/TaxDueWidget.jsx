import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchTaxDue } from '../../../../services/taxService';
import { formatDate, formatCurrency } from '../../../../utils/formatters';

const TaxDueWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dueDates, setDueDates] = useState([]);

  useEffect(() => {
    const loadDueDates = async () => {
      try {
        setLoading(true);
        const data = await fetchTaxDue();
        setDueDates(data);
        setError(null);
      } catch (err) {
        setError('Failed to load due dates.');
        console.error('Error loading due dates:', err);
        setDueDates([]);
      } finally {
        setLoading(false);
      }
    };

    loadDueDates();
  }, []);

  // Helper function to calculate days remaining
  const getDaysRemaining = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const timeDiff = due - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysDiff;
  };
  
  // Helper function to get appropriate styling based on urgency
  const getUrgencyClass = (daysRemaining) => {
    if (daysRemaining < 0) return 'text-red-600';
    if (daysRemaining <= 7) return 'text-orange-600';
    return 'text-gray-700';
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : dueDates.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-10 w-10 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">You have no upcoming tax deadlines at the moment.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {dueDates.map((item, index) => {
            const daysRemaining = getDaysRemaining(item.dueDate);
            const urgencyClass = getUrgencyClass(daysRemaining);
            
            return (
              <li key={index} className="py-4">
                <div className="flex justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{item.description}</h4>
                    <p className="text-xs text-gray-500">{item.period}</p>
                    <div className="mt-1">
                      {item.type === 'GST' ? (
                        <Link 
                          to={`/accounts/tax/gst/${item.formType.toLowerCase()}`}
                          className="text-xs text-indigo-600 hover:text-indigo-900"
                        >
                          Create {item.formType}
                        </Link>
                      ) : (
                        <Link 
                          to="/accounts/tax/tds/form"
                          className="text-xs text-indigo-600 hover:text-indigo-900"
                        >
                          Create {item.formType}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700">Due: {formatDate(item.dueDate)}</p>
                    <p className={`text-xs font-medium ${urgencyClass}`}>
                      {daysRemaining < 0 
                        ? `Overdue by ${Math.abs(daysRemaining)} days` 
                        : daysRemaining === 0 
                          ? 'Due today!' 
                          : `${daysRemaining} days remaining`
                      }
                    </p>
                    {item.estimatedAmount > 0 && (
                      <p className="text-sm text-gray-700 mt-1">
                        Approx: {formatCurrency(item.estimatedAmount)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TaxDueWidget;
