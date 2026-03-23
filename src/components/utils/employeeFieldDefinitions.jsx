/**
 * Centralized employee field definitions for consistent Position and Department options
 * across all forms in the application.
 * 
 * Usage: Import these constants in any form that needs Position/Department selects
 */

export const POSITION_OPTIONS = [
  { value: 'CEO', label: 'CEO' },
  { value: 'Owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'technician', label: 'Technician' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'IT Support', label: 'IT Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'HR' },
  { value: 'operations', label: 'Operations' },
];

export const DEPARTMENT_OPTIONS = [
  { value: 'executive', label: 'Executive' },
  { value: 'management', label: 'Management' },
  { value: 'operations', label: 'Operations' },
  { value: 'administration', label: 'Administration' },
  { value: 'field', label: 'Field Technician' },
  { value: 'foreman', label: 'Foreman' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'IT', label: 'IT Support' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'customer_service', label: 'Customer Service' },
];

/**
 * Helper function to get label from value
 */
export const getPositionLabel = (value) => {
  const option = POSITION_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
};

export const getDepartmentLabel = (value) => {
  const option = DEPARTMENT_OPTIONS.find(opt => opt.value === value);
  return option ? option.label : value;
};

/**
 * Reusable Position Select Component
 */
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PositionSelect({ value, onChange, placeholder = "Select position" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-800">
        {POSITION_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Reusable Department Select Component
 */
export function DepartmentSelect({ value, onChange, placeholder = "Select department" }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white border-slate-200 text-slate-900 dark:bg-slate-800 dark:border-slate-600 dark:text-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-800">
        {DEPARTMENT_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}