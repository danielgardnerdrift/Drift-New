'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface MultiSelectProps {
  name: string;
  label: string;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string[];
  className?: string;
  style?: React.CSSProperties;
}

export function MultiSelect({
  name,
  label,
  options,
  placeholder = 'Select options',
  defaultValue = [],
  className = '',
  style = {},
}: MultiSelectProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const getOptionLabel = (option: string | { value: string; label: string }) => {
    return typeof option === 'string' ? option : option.label;
  };

  const getOptionValue = (option: string | { value: string; label: string }) => {
    return typeof option === 'string' ? option : option.value;
  };

  return (
    <div className={`multi-select-group ${className}`} style={style}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-[var(--primary,#fe3500)] focus:border-[var(--primary,#fe3500)]"
        >
          {selected.length > 0
            ? `${selected.length} selected`
            : placeholder}
        </button>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => {
              const value = getOptionValue(option);
              const label = getOptionLabel(option);
              const isSelected = selected.includes(value);
              
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleOption(value)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>{label}</span>
                  {isSelected && <Check className="w-4 h-4 text-[var(--primary,#fe3500)]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}