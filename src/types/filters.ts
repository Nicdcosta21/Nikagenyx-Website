export type FilterOperator = 
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

export type FilterDataType = 
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  dataType: FilterDataType;
}

export interface FilterGroup {
  combinator: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

export interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  filter: FilterGroup;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
