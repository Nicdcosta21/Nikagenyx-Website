import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const AdvancedFilterBuilder = ({
  fields,
  value,
  onChange,
  onSaveTemplate,
  templates = []
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const addCondition = (groupId) => {
    const newFilter = { ...value };
    const group = findGroup(newFilter, groupId);
    
    if (group) {
      group.conditions.push({
        id: uuidv4(),
        field: fields[0].name,
        operator: 'equals',
        value: '',
        dataType: fields[0].type
      });
      onChange(newFilter);
    }
  };

  const addGroup = (parentGroupId) => {
    const newFilter = { ...value };
    const parentGroup = findGroup(newFilter, parentGroupId);
    
    if (parentGroup) {
      parentGroup.conditions.push({
        id: uuidv4(),
        combinator: 'and',
        conditions: []
      });
      onChange(newFilter);
    }
  };

  const removeCondition = (groupId, conditionId) => {
    const newFilter = { ...value };
    const group = findGroup(newFilter, groupId);
    
    if (group) {
      group.conditions = group.conditions.filter(c => c.id !== conditionId);
      onChange(newFilter);
    }
  };

  const updateCondition = (groupId, conditionId, updates) => {
    const newFilter = { ...value };
    const group = findGroup(newFilter, groupId);
    
    if (group) {
      const condition = group.conditions.find(c => c.id === conditionId);
      if (condition) {
        Object.assign(condition, updates);
        onChange(newFilter);
      }
    }
  };

  const updateCombinator = (groupId, newCombinator) => {
    const newFilter = { ...value };
    const group = findGroup(newFilter, groupId);
    
    if (group) {
      group.combinator = newCombinator;
      onChange(newFilter);
    }
  };

  const findGroup = (filter, groupId) => {
    if (filter.id === groupId) return filter;
    
    for (const condition of filter.conditions) {
      if (condition.conditions) {
        const found = findGroup(condition, groupId);
        if (found) return found;
      }
    }
    
    return null;
  };

  const renderCondition = (condition, groupId) => {
    if (condition.conditions) {
      return renderGroup(condition);
    }

    const field = fields.find(f => f.name === condition.field);

    return (
      <div key={condition.id} className="flex items-center space-x-2 mb-2">
        <select
          value={condition.field}
          onChange={(e) => updateCondition(groupId, condition.id, {
            field: e.target.value,
            dataType: fields.find(f => f.name === e.target.value).type
          })}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {fields.map(field => (
            <option key={field.name} value={field.name}>
              {field.label}
            </option>
          ))}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => updateCondition(groupId, condition.id, {
            operator: e.target.value
          })}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {getOperatorsForType(condition.dataType).map(op => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>

        {renderValueInput(condition, field, (newValue) => 
          updateCondition(groupId, condition.id, { value: newValue })
        )}

        <button
          type="button"
          onClick={() => removeCondition(groupId, condition.id)}
          className="inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  };

  const renderGroup = (group) => {
    return (
      <div key={group.id} className="border border-gray-200 rounded-md p-4 mb-2">
        <div className="flex items-center mb-4">
          <select
            value={group.combinator}
            onChange={(e) => updateCombinator(group.id, e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>

          <div className="ml-auto space-x-2">
            <button
              type="button"
              onClick={() => addCondition(group.id)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Condition
            </button>
            <button
              type="button"
              onClick={() => addGroup(group.id)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Group
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {group.conditions.map(condition => renderCondition(condition, group.id))}
        </div>
      </div>
    );
  };

  const renderValueInput = (condition, field, onChange) => {
    switch (condition.dataType) {
      case 'string':
        return (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={condition.value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={condition.value}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        );

      case 'boolean':
        return (
          <select
            value={condition.value}
            onChange={(e) => onChange(e.target.value === 'true')}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      default:
        return null;
    }
  };

  const getOperatorsForType = (dataType) => {
    const operators = {
      string: [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'notContains', label: 'Not Contains' },
        { value: 'startsWith', label: 'Starts With' },
        { value: 'endsWith', label: 'Ends With' }
      ],
      number: [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'greaterThan', label: 'Greater Than' },
        { value: 'lessThan', label: 'Less Than' },
        { value: 'between', label: 'Between' }
      ],
      date: [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' },
        { value: 'greaterThan', label: 'After' },
        { value: 'lessThan', label: 'Before' },
        { value: 'between', label: 'Between' }
      ],
      boolean: [
        { value: 'equals', label: 'Equals' },
        { value: 'notEquals', label: 'Not Equals' }
      ]
    };

    return operators[dataType] || [];
  };

  return (
    <div className="space-y-4">
      {/* Template Selection */}
      <div className="flex items-center space-x-4">
        <select
          value={selectedTemplate?.id || ''}
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value);
            setSelectedTemplate(template);
            if (template) {
              onChange(template.filter);
            }
          }}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">Select Template</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            const name = window.prompt('Enter template name:');
            if (name) {
              onSaveTemplate({
                name,
                filter: value
              });
            }
          }}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save as Template
        </button>
      </div>

      {/* Filter Builder */}
      {renderGroup(value)}
    </div>
  );
};

export default AdvancedFilterBuilder;
