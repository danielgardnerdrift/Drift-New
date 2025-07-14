'use client';

import React from 'react';

interface SelectProps {
  name: string;
  label: string;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Select({
  name,
  label,
  options,
  placeholder = 'Select an option',
  defaultValue = '',
  required = false,
  className = '',
  style = {},
}: SelectProps) {
  return (
    <div className={`select-group ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary,#fe3500)] focus:border-[var(--primary,#fe3500)]"
        style={style}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          if (typeof option === 'string') {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          } else {
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            );
          }
        })}
      </select>
    </div>
  );
}