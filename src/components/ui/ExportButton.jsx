import React, { useState, useRef, useEffect } from 'react';

const ExportButton = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => { onExport('csv'); setIsOpen(false); }}
              role="menuitem"
            >
              Export as CSV
            </button>
            <button
              className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => { onExport('excel'); setIsOpen(false); }}
              role="menuitem"
            >
              Export as Excel
            </button>
            <button
              className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              onClick={() => { onExport('pdf'); setIsOpen(false); }}
              role="menuitem"
            >
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
