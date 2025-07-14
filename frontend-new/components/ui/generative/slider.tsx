'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SliderComponentProps {
  label: string;
  min: number;
  max: number;
  value?: number | [number, number];
  field: string;
  step?: number;
  range?: boolean;
  onChange?: (field: string, value: number | [number, number]) => void;
}

export function SliderComponent({
  label,
  min,
  max,
  value,
  field,
  step = 1,
  range = false,
  onChange
}: SliderComponentProps) {
  const currentValue = value || (range ? [min, max] : min);
  
  const handleChange = (newValue: number[]) => {
    if (onChange) {
      onChange(field, range ? newValue as [number, number] : newValue[0]);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor={field} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <div className="px-2">
        <Slider
          id={field}
          min={min}
          max={max}
          step={step}
          value={Array.isArray(currentValue) ? currentValue : [currentValue]}
          onValueChange={handleChange}
          className="w-full"
          style={{
            '--slider-thumb-color': '#fe3500',
            '--slider-track-color': '#fe3500',
          } as React.CSSProperties}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min.toLocaleString()}</span>
          <span className="font-medium text-[#fe3500]">
            {Array.isArray(currentValue) 
              ? `${currentValue[0].toLocaleString()} - ${currentValue[1].toLocaleString()}`
              : currentValue.toLocaleString()
            }
          </span>
          <span>{max.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}