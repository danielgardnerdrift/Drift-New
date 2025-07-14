'use client';

import React from 'react';

interface TextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
  defaultValue?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Textarea({
  name,
  label,
  placeholder = '',
  rows = 4,
  defaultValue = '',
  className = '',
  style = {},
}: TextareaProps) {
  return (
    <div className={`textarea-group ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary,#fe3500)] focus:border-[var(--primary,#fe3500)]"
        style={style}
      />
    </div>
  );
}