'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ArrayInputProps {
  name: string;
  label: string;
  itemType?: 'text' | 'url' | 'email';
  placeholder?: string;
  defaultValue?: string[];
  className?: string;
  style?: React.CSSProperties;
}

export function ArrayInput({
  name,
  label,
  itemType = 'text',
  placeholder = '',
  defaultValue = [],
  className = '',
  style = {},
}: ArrayInputProps) {
  const [values, setValues] = useState<string[]>(defaultValue);
  const [inputValue, setInputValue] = useState('');

  const addValue = () => {
    if (inputValue.trim()) {
      setValues([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  return (
    <div className={`array-input-group ${className}`} style={style}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type={itemType}
              value={value}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
            <button
              type="button"
              onClick={() => removeValue(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        <div className="flex items-center gap-2">
          <input
            type={itemType}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary,#fe3500)] focus:border-[var(--primary,#fe3500)]"
          />
          <button
            type="button"
            onClick={addValue}
            className="p-2 bg-[var(--primary,#fe3500)] text-white rounded-md hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <input type="hidden" name={name} value={JSON.stringify(values)} />
    </div>
  );
}