'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectComponentProps {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  field: string;
  placeholder?: string;
  onChange?: (field: string, value: string) => void;
}

export function SelectComponent({
  label,
  options,
  value,
  field,
  placeholder = 'Select an option',
  onChange
}: SelectComponentProps) {
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(field, newValue);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger 
          id={field}
          className="w-full border-gray-300 focus:border-[#fe3500] focus:ring-[#fe3500]"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}