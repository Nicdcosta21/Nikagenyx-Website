import React from 'react';

export const ExcelEditor = ({ value, onChange }) => {
  const handleColumnChange = (index, field, newValue) => {
    const newColumns = [...value.columns];
    newColumns[index][field] = newValue;
    onChange({
      ...value,
      columns: newColumns
    });
  };

  const addColumn = () => {
    onChange({
      ...value,
      columns: [
        ...(value.columns || []),
        {
          header: '',
          field: '',
          width: 100,
          type: 'text',
          format: ''
        }
      ]
    });
  };

  const removeColumn = (index) => {
    const newColumns = [...value.columns];
    newColumns.splice(index, 1);
    onChange({
      ...value,
      columns: newColumns
    });
  };

  const moveColumn = (index, direction) => {
    const newColumns = [...value.columns];
    const column = newColumns[index];
    newColumns.splice(index, 1);
    newColumns.splice(index + direction, 0, column);
    onChange({
      ...value,
      columns: newColumns
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-900">Worksheet Settings</h4>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sheet Name
            </label>
            <input
              type="text"
              value={value.sheetName || ''}
              onChange={(e) => onChange({
                ...value,
                sheetName: e.target.value
              })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Freeze Header Row
            </label>
            <select
              value={value.freezeHeader ? 'true' : 'false'}
              onChange={(e) => onChange({
                ...value,
                freezeHeader: e.target.value === 'true'
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Auto Filter
            </label>
            <select
              value={value.autoFilter ? 'true' : 'false'}
              onChange={(e) => onChange({
                ...value,
                autoFilter: e.target.value === 'true'
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Columns</h4>
          <button
            type="button"
            onClick={addColumn}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Column
          </button>
        </div>

        <div className="mt-4 border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Header
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Width
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(value.columns || []).map((column, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={column.header}
                      onChange={(e) => handleColumnChange(index, 'header', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={column.field}
                      onChange={(e) => handleColumnChange(index, 'field', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={column.type}
                      onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="currency">Currency</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={column.format}
                      onChange={(e) => handleColumnChange(index, 'format', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder={column.type === 'date' ? 'YYYY-MM-DD' : '#,##0.00'}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={column.width}
                      onChange={(e) => handleColumnChange(index, 'width', parseInt(e.target.value))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => moveColumn(index, -1)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          ↑
                        </button>
                      )}
                      {index < value.columns.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveColumn(index, 1)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeColumn(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900">Styling</h4>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Header Background
            </label>
            <input
              type="color"
              value={value.headerStyle?.backgroundColor || '#FFFFFF'}
              onChange={(e) => onChange({
                ...value,
                headerStyle: {
                  ...value.headerStyle,
                  backgroundColor: e.target.value
                }
              })}
              className="mt-1 block w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Header Text Color
            </label>
            <input
              type="color"
              value={value.headerStyle?.color || '#000000'}
              onChange={(e) => onChange({
                ...value,
                headerStyle: {
                  ...value.headerStyle,
                  color: e.target.value
                }
              })}
              className="mt-1 block w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Alternate Row Color
            </label>
            <input
              type="color"
              value={value.alternateRowColor || '#F9FAFB'}
              onChange={(e) => onChange({
                ...value,
                alternateRowColor: e.target.value
              })}
              className="mt-1 block w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
