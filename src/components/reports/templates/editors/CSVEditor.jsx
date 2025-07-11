import React from 'react';

export const CSVEditor = ({ value, onChange }) => {
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
          type: 'text'
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

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-900">CSV Settings</h4>
        <div className="mt-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Delimiter
            </label>
            <select
              value={value.delimiter || ','}
              onChange={(e) => onChange({
                ...value,
                delimiter: e.target.value
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value=",">Comma (,)</option>
              <option value=";">Semicolon (;)</option>
              <option value="\t">Tab</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Include Headers
            </label>
            <select
              value={value.includeHeaders ? 'true' : 'false'}
              onChange={(e) => onChange({
                ...value,
                includeHeaders: e.target.value === 'true'
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Encoding
            </label>
            <select
              value={value.encoding || 'UTF-8'}
              onChange={(e) => onChange({
                ...value,
                encoding: e.target.value
              })}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="UTF-8">UTF-8</option>
              <option value="UTF-16">UTF-16</option>
              <option value="ASCII">ASCII</option>
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
                      <option value="boolean">Boolean</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => removeColumn(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
