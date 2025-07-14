'use client';

import React from 'react';

interface FormProps {
  title: string;
  description?: string;
  submitLabel?: string;
  fields?: string[];
  themeColor?: string;
  onSubmit?: (data: any) => void;
  children?: React.ReactNode;
}

export function Form({
  title,
  description = '',
  submitLabel = 'Submit',
  fields = [],
  themeColor = '#fe3500',
  onSubmit,
  children,
}: FormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};
    
    // Convert FormData to object
    formData.forEach((value, key) => {
      // Handle JSON values (like from array inputs)
      try {
        data[key] = JSON.parse(value as string);
      } catch {
        data[key] = value;
      }
    });
    
    console.log('Form submitted:', data);
    onSubmit?.(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold" style={{ color: themeColor }}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
      
      <button
        type="submit"
        className="w-full py-2 px-4 rounded-md text-white font-medium hover:opacity-90 transition-opacity"
        style={{ backgroundColor: themeColor }}
      >
        {submitLabel}
      </button>
    </form>
  );
}