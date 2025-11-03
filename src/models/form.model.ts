export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  DATE = 'date',
  FILE = 'file',
}

export type Operator = 'equals' | 'notEquals' | 'greater' | 'less' | 'contains';

export interface Condition {
  id: string;
  fieldId: string;
  operator: Operator;
  value: any;
}

export interface ConditionGroup {
  id: string;
  operator: 'AND' | 'OR';
  children: (Condition | ConditionGroup)[];
}

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  prerequisites?: ConditionGroup;
  pageId: string;
  required?: boolean;
  isPremium?: boolean; // For ABAC field-level access
  metadata?: Record<string, any>;
}

export interface Page {
  id: string;
  title: string;
}

export interface Form {
  id: string;
  userId: string; // Owner of the form
  title: string;
  description?: string;
  pages: Page[];
  fields: Field[];
  visibility: 'private' | 'public' | 'unlisted';
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}


