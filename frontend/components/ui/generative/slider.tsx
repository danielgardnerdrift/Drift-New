'use client';

import React, { useState } from 'react';

interface SliderProps {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: [number, number];
  className?: string;
  style?: React.CSSProperties;
}

export function Slider({
  name,
  label,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue = [min, max],
  className = '',
  style = {},
}: SliderProps) {
  const [values, setValues] = useState(defaultValue);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Number(e.target.value);
    setValues([Math.min(newMin, values[1]), values[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Number(e.target.value);
    setValues([values[0], Math.max(newMax, values[0])]);
  };

  return (
    <div className={`slider-group ${className}`} style={style}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[0]}
            onChange={handleMinChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
        <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
          {values[0]}{unit} - {values[1]}{unit}
        </span>
        <div className="flex-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={values[1]}
            onChange={handleMaxChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
        </div>
      </div>
      <input type="hidden" name={name} value={JSON.stringify(values)} />
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #fe3500;
          border-radius: 50%;
          cursor: pointer;
        }
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #fe3500;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}