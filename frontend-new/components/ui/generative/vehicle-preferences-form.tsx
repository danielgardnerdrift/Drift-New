'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SliderComponent } from './slider';
import { SelectComponent } from './select';
import { MultiSelectComponent } from './multi-select';

interface VehiclePreference {
  id?: string;
  make?: string;
  model?: string;
  trim?: string[];
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  exterior_color?: string[];
  interior_color?: string[];
  miles_min?: number;
  miles_max?: number;
  condition?: string[];
  body_style?: string;
}

interface VehiclePreferencesFormProps {
  preferences?: VehiclePreference[];
  onChange?: (preferences: VehiclePreference[]) => void;
}

const MAKES = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen'];
const BODY_STYLES = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Van', 'Wagon'];
const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Beige'];
const CONDITIONS = ['New', 'Used', 'Certified'];

export function VehiclePreferencesForm({
  preferences = [],
  onChange
}: VehiclePreferencesFormProps) {
  const [localPreferences, setLocalPreferences] = useState<VehiclePreference[]>(
    preferences.length > 0 ? preferences : [{ id: '1' }]
  );

  const updatePreference = (index: number, field: string, value: any) => {
    const updated = [...localPreferences];
    updated[index] = { ...updated[index], [field]: value };
    setLocalPreferences(updated);
    onChange?.(updated);
  };

  const addPreference = () => {
    const newPref: VehiclePreference = { id: Date.now().toString() };
    const updated = [...localPreferences, newPref];
    setLocalPreferences(updated);
    onChange?.(updated);
  };

  const removePreference = (index: number) => {
    const updated = localPreferences.filter((_, i) => i !== index);
    setLocalPreferences(updated);
    onChange?.(updated);
  };

  return (
    <div className="space-y-4">
      {localPreferences.map((pref, index) => (
        <Card key={pref.id || index} className="border-gray-200">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium">
                Vehicle Preference {index + 1}
              </CardTitle>
              {localPreferences.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePreference(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectComponent
                label="Make"
                field={`make-${index}`}
                options={MAKES.map(m => ({ value: m, label: m }))}
                value={pref.make}
                onChange={(_, value) => updatePreference(index, 'make', value)}
              />
              <SelectComponent
                label="Body Style"
                field={`body_style-${index}`}
                options={BODY_STYLES.map(b => ({ value: b, label: b }))}
                value={pref.body_style}
                onChange={(_, value) => updatePreference(index, 'body_style', value)}
              />
            </div>

            <SliderComponent
              label="Year Range"
              field={`year-${index}`}
              min={2015}
              max={2025}
              range={true}
              value={[pref.year_min || 2015, pref.year_max || 2025]}
              onChange={(_, value) => {
                const [min, max] = value as [number, number];
                updatePreference(index, 'year_min', min);
                updatePreference(index, 'year_max', max);
              }}
            />

            <SliderComponent
              label="Price Range"
              field={`price-${index}`}
              min={0}
              max={100000}
              step={1000}
              range={true}
              value={[pref.price_min || 0, pref.price_max || 100000]}
              onChange={(_, value) => {
                const [min, max] = value as [number, number];
                updatePreference(index, 'price_min', min);
                updatePreference(index, 'price_max', max);
              }}
            />

            <SliderComponent
              label="Mileage Range"
              field={`miles-${index}`}
              min={0}
              max={150000}
              step={1000}
              range={true}
              value={[pref.miles_min || 0, pref.miles_max || 150000]}
              onChange={(_, value) => {
                const [min, max] = value as [number, number];
                updatePreference(index, 'miles_min', min);
                updatePreference(index, 'miles_max', max);
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <MultiSelectComponent
                label="Exterior Colors"
                field={`exterior_color-${index}`}
                options={COLORS}
                values={pref.exterior_color || []}
                onChange={(_, value) => updatePreference(index, 'exterior_color', value)}
              />
              <MultiSelectComponent
                label="Interior Colors"
                field={`interior_color-${index}`}
                options={COLORS}
                values={pref.interior_color || []}
                onChange={(_, value) => updatePreference(index, 'interior_color', value)}
              />
            </div>

            <MultiSelectComponent
              label="Condition"
              field={`condition-${index}`}
              options={CONDITIONS}
              values={pref.condition || []}
              onChange={(_, value) => updatePreference(index, 'condition', value)}
            />
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={addPreference}
        variant="outline"
        className="w-full border-dashed border-gray-300 text-gray-600 hover:border-[#fe3500] hover:text-[#fe3500]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Another Vehicle Preference
      </Button>
    </div>
  );
}