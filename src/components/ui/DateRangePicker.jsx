import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';

const DateRangePicker = ({ onChange, value, buttonClass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [localValue, setLocalValue] = useState({
    start: value?.start || '',
    end: value?.end || ''
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update local value when prop value changes
  useEffect(() => {
    if (value) {
      setLocalValue({
        start: value.start || '',
        end: value.end || ''
      });
    }
  }, [value]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocalValue(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyDateRange = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  // Predefined date ranges
  const applyPreset = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = format(today, 'yyyy-MM-dd');
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        start = end = format(yesterday, 'yyyy-MM-dd');
        break;
      case 'thisWeek':
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        start = format(thisWeekStart, 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        start = format(lastWeekStart, 'yyyy-MM-dd');
        end = format(lastWeekEnd, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        start = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        start = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), 'yyyy-MM-dd');
        end = format(new Date(today.getFullYear(), today.getMonth(), 0), 'yyyy-MM-dd');
        break;
      case 'thisYear':
        start = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
        end = format(today, 'yyyy-MM-dd');
        break;
      case 'lastYear':
        start = format(new Date(today.getFullYear() - 1, 0, 1), 'yyyy-MM-dd');
        end = format(new Date(today.getFullYear() - 1, 11, 31), 'yyyy-MM-dd');
        break;
      default:
        return;
    }

    setLocalValue({ start, end });
    onChange({ start, end });
    setIsOpen(false);
  };

  // Format display date
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return format(date, 'dd-MM-yyyy');
  };

  const displayValue = localValue.start && localValue.end
    ? `${formatDisplayDate(localValue.start)} to ${formatDisplayDate(localValue.end)}`
    : 'Select date range';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={buttonClass || "inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"}
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="-ml-1 mr-2 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        {displayValue}
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-96 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="start" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  id="start"
                  name="start"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={localValue.start}
                  onChange={handleChange}
                  max={localValue.end}
                />
              </div>
              <div>
                <label htmlFor="end" className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  id="end"
                  name="end"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={localValue.end}
                  onChange={handleChange}
                  min={localValue.start}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('today')}
              >
                Today
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('yesterday')}
              >
                Yesterday
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('thisWeek')}
              >
                This Week
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('lastWeek')}
              >
                Last Week
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('thisMonth')}
              >
                This Month
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('lastMonth')}
              >
                Last Month
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('thisYear')}
              >
                This Year
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                onClick={() => applyPreset('lastYear')}
              >
                Last Year
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none mr-2"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none"
                onClick={applyDateRange}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
