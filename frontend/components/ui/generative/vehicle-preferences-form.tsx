'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Slider } from './slider';
import { Select } from './select';
import { MultiSelect } from './multi-select';

interface VehiclePreference {
  make: string;
  model: string;
  yearRange: [number, number];
  priceRange: [number, number];
  mileageRange: [number, number];
  colors: string[];
  conditions: string[];
  bodyStyle: string;
}

interface VehiclePreferencesFormProps {
  name: string;
  label?: string;
  onSubmit?: (data: any) => void;
}

export function VehiclePreferencesForm({
  name,
  label = 'Vehicle Preferences',
  onSubmit,
}: VehiclePreferencesFormProps) {
  const [preferences, setPreferences] = useState<VehiclePreference[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const makeOptions = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Tesla', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'GMC', 'Ram'];
  const bodyStyleOptions = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Hatchback', 'Wagon', 'Van', 'Minivan'];
  const colorOptions = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Beige', 'Gold'];
  const conditionOptions = ['New', 'Certified Pre-Owned', 'Used - Excellent', 'Used - Good', 'Used - Fair'];

  const addPreference = () => {
    const newPreference: VehiclePreference = {
      make: '',
      model: '',
      yearRange: [2020, 2024],
      priceRange: [20000, 50000],
      mileageRange: [0, 50000],
      colors: [],
      conditions: [],
      bodyStyle: '',
    };
    setPreferences([...preferences, newPreference]);
    setIsAddingNew(true);
  };

  const removePreference = (index: number) => {
    setPreferences(preferences.filter((_, i) => i !== index));
  };

  const updatePreference = (index: number, field: keyof VehiclePreference, value: any) => {
    const updated = [...preferences];
    updated[index] = { ...updated[index], [field]: value };
    setPreferences(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { [name]: preferences };
    console.log('Vehicle preferences:', data);
    onSubmit?.(data);
  };

  return (
    <div className="vehicle-preferences-form">
      <h3 className="text-lg font-semibold mb-4 text-[#fe3500]">{label}</h3>
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {preferences.map((pref, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              type="button"
              onClick={() => removePreference(index)}
              className="absolute top-2 right-2 p-1 text-red-600 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="grid grid-cols-2 gap-4">
              <Select
                name={`pref-${index}-make`}
                label="Make"
                options={makeOptions}
                defaultValue={pref.make}
                required
              />
              
              <input
                type="text"
                placeholder="Model (optional)"
                value={pref.model}
                onChange={(e) => updatePreference(index, 'model', e.target.value)}
                className="mt-6 px-3 py-2 border border-gray-300 rounded-md"
              />
              
              <Select
                name={`pref-${index}-body`}
                label="Body Style"
                options={bodyStyleOptions}
                defaultValue={pref.bodyStyle}
              />
              
              <div className="col-span-2">
                <Slider
                  name={`pref-${index}-year`}
                  label="Year Range"
                  min={2010}
                  max={2024}
                  defaultValue={pref.yearRange}
                />
              </div>
              
              <div className="col-span-2">
                <Slider
                  name={`pref-${index}-price`}
                  label="Price Range"
                  min={5000}
                  max={150000}
                  step={1000}
                  unit="$"
                  defaultValue={pref.priceRange}
                />
              </div>
              
              <div className="col-span-2">
                <Slider
                  name={`pref-${index}-mileage`}
                  label="Mileage Range"
                  min={0}
                  max={200000}
                  step={5000}
                  unit=" mi"
                  defaultValue={pref.mileageRange}
                />
              </div>
              
              <MultiSelect
                name={`pref-${index}-colors`}
                label="Preferred Colors"
                options={colorOptions}
                defaultValue={pref.colors}
              />
              
              <MultiSelect
                name={`pref-${index}-conditions`}
                label="Acceptable Conditions"
                options={conditionOptions}
                defaultValue={pref.conditions}
              />
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={addPreference}
          className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#fe3500] hover:text-[#fe3500] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle Preference
        </button>
        
        {preferences.length > 0 && (
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#fe3500] text-white rounded-md hover:opacity-90 transition-opacity"
          >
            Submit Preferences
          </button>
        )}
      </form>
      
      <input type="hidden" name={name} value={JSON.stringify(preferences)} />
    </div>
  );
}