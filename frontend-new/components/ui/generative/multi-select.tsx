'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface MultiSelectComponentProps {
  label: string;
  options: string[];
  values?: string[];
  field: string;
  onChange?: (field: string, values: string[]) => void;
}

export function MultiSelectComponent({
  label,
  options,
  values = [],
  field,
  onChange
}: MultiSelectComponentProps) {
  const handleChange = (option: string, checked: boolean) => {
    if (onChange) {
      const newValues = checked
        ? [...values, option]
        : values.filter(v => v !== option);
      onChange(field, newValues);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="bg-[#fe3500]/10 text-[#fe3500] border-[#fe3500]/20"
            >
              {value}
            </Badge>
          ))}
        </div>
      )}
      
      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
          >
            <Checkbox
              checked={values.includes(option)}
              onCheckedChange={(checked) => handleChange(option, checked as boolean)}
              className="data-[state=checked]:bg-[#fe3500] data-[state=checked]:border-[#fe3500]"
            />
            <span className="text-sm">{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}