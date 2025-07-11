import React from 'react';

const FilterDropdown = ({ options, value, onChange, label, fullWidth = false }) => {
  return (
    <select
      className={`${fullWidth ? 'w-full' : ''} shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm border-gray-300 rounded-md`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default FilterDropdown;
