import { Form as PrismaForm } from '@prisma/client';

// Re-export Prisma type
export type Form = PrismaForm;

// Keep the enums and types for field definitions (used in JSON fields)
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
  isPremium?: boolean;
  metadata?: Record<string, any>;
}

export interface Page {
  id: string;
  title: string;
}
