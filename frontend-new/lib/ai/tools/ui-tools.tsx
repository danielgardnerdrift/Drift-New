import { z } from 'zod';
import { tool } from 'ai';
import { SliderComponent } from '@/components/ui/generative/slider';
import { SelectComponent } from '@/components/ui/generative/select';
import { MultiSelectComponent } from '@/components/ui/generative/multi-select';
import { VehiclePreferencesForm } from '@/components/ui/generative/vehicle-preferences-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Slider tool for numeric ranges
export const render_slider = tool({
  description: 'Render a slider for numeric ranges (year, price, mileage)',
  parameters: z.object({
    label: z.string().describe('Label for the slider'),
    min: z.number().describe('Minimum value'),
    max: z.number().describe('Maximum value'),
    value: z.union([z.number(), z.tuple([z.number(), z.number()])]).optional(),
    field: z.string().describe('Field name in the data model'),
    step: z.number().optional().default(1),
    range: z.boolean().optional().default(false),
  }),
  execute: async ({ label, min, max, value, field, step, range }) => {
    return {
      component: (
        <SliderComponent
          label={label}
          min={min}
          max={max}
          value={value}
          field={field}
          step={step}
          range={range}
        />
      ),
    };
  },
});

// Select dropdown tool
export const render_select = tool({
  description: 'Render a select dropdown for single choice fields',
  parameters: z.object({
    label: z.string(),
    options: z.array(z.object({ value: z.string(), label: z.string() })),
    value: z.string().optional(),
    field: z.string(),
    placeholder: z.string().optional(),
  }),
  execute: async ({ label, options, value, field, placeholder }) => {
    return {
      component: (
        <SelectComponent
          label={label}
          options={options}
          value={value}
          field={field}
          placeholder={placeholder}
        />
      ),
    };
  },
});

// Multi-select tool
export const render_multi_select = tool({
  description: 'Render multi-select for array fields (colors, conditions)',
  parameters: z.object({
    label: z.string(),
    options: z.array(z.string()),
    values: z.array(z.string()).optional(),
    field: z.string(),
  }),
  execute: async ({ label, options, values, field }) => {
    return {
      component: (
        <MultiSelectComponent
          label={label}
          options={options}
          values={values}
          field={field}
        />
      ),
    };
  },
});

// Text input tool
export const render_input = tool({
  description: 'Render text input for string fields',
  parameters: z.object({
    label: z.string(),
    value: z.string().optional(),
    field: z.string(),
    type: z.enum(['text', 'email', 'tel', 'url']).optional().default('text'),
    placeholder: z.string().optional(),
  }),
  execute: async ({ label, value, field, type, placeholder }) => {
    return {
      component: (
        <div className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input
            id={field}
            type={type}
            value={value || ''}
            placeholder={placeholder}
            className="border-gray-300 focus:border-[#fe3500] focus:ring-[#fe3500]"
          />
        </div>
      ),
    };
  },
});

// Textarea tool
export const render_textarea = tool({
  description: 'Render textarea for long text fields (notes)',
  parameters: z.object({
    label: z.string(),
    value: z.string().optional(),
    field: z.string(),
    placeholder: z.string().optional(),
    rows: z.number().optional().default(4),
  }),
  execute: async ({ label, value, field, placeholder, rows }) => {
    return {
      component: (
        <div className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Textarea
            id={field}
            value={value || ''}
            placeholder={placeholder}
            rows={rows}
            className="border-gray-300 focus:border-[#fe3500] focus:ring-[#fe3500] resize-none"
          />
        </div>
      ),
    };
  },
});

// Vehicle preferences form tool
export const render_vehicle_preferences = tool({
  description: 'Render complete vehicle preferences form',
  parameters: z.object({
    preferences: z.array(z.object({
      make: z.string().optional(),
      model: z.string().optional(),
      year_min: z.number().optional(),
      year_max: z.number().optional(),
      price_min: z.number().optional(),
      price_max: z.number().optional(),
      exterior_color: z.array(z.string()).optional(),
      interior_color: z.array(z.string()).optional(),
      miles_min: z.number().optional(),
      miles_max: z.number().optional(),
      condition: z.array(z.string()).optional(),
      body_style: z.string().optional(),
    })).optional().default([]),
  }),
  execute: async ({ preferences }) => {
    return {
      component: <VehiclePreferencesForm preferences={preferences} />,
    };
  },
});

// Form wrapper tool
export const render_form = tool({
  description: 'Wrap fields in a form card',
  parameters: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    children: z.array(z.any()).optional(),
  }),
  execute: async ({ title, subtitle }) => {
    return {
      component: (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </CardHeader>
          <CardContent>
            {/* Children will be rendered here */}
          </CardContent>
        </Card>
      ),
    };
  },
});

// Array input tool (for vehicle URLs)
export const render_array_input = tool({
  description: 'Render array input for lists (vehicle URLs)',
  parameters: z.object({
    label: z.string(),
    values: z.array(z.string()).optional().default([]),
    field: z.string(),
    placeholder: z.string().optional(),
    itemLabel: z.string().optional().default('Item'),
  }),
  execute: async ({ label, values, field, placeholder, itemLabel }) => {
    return {
      component: (
        <div className="space-y-3">
          <Label>{label}</Label>
          <div className="space-y-2">
            {values.map((value, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={value}
                  placeholder={placeholder || `${itemLabel} ${index + 1}`}
                  className="flex-1 border-gray-300 focus:border-[#fe3500] focus:ring-[#fe3500]"
                />
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-[#fe3500] hover:text-[#e62e00] font-medium"
            >
              + Add {itemLabel}
            </button>
          </div>
        </div>
      ),
    };
  },
});

// Export all tools
export const uiTools = {
  render_slider,
  render_select,
  render_multi_select,
  render_input,
  render_textarea,
  render_vehicle_preferences,
  render_form,
  render_array_input,
};