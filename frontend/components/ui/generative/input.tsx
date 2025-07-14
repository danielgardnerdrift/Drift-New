'use client';

import React from 'react';

interface InputProps {
  name: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  label: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Input({
  name,
  type = 'text',
  label,
  placeholder = '',
  defaultValue = '',
  required = false,
  className = '',
  style = {},
}: InputProps) {
  return (
    <div className={`input-group ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary,#fe3500)] focus:border-[var(--primary,#fe3500)]"
        style={style}
      />
    </div>
  );
}