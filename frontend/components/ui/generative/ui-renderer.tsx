'use client';

import React from 'react';
import JsxParser from 'react-jsx-parser';
import { Slider } from './slider';
import { Select } from './select';
import { MultiSelect } from './multi-select';
import { Input } from './input';
import { Textarea } from './textarea';
import { VehiclePreferencesForm } from './vehicle-preferences-form';
import { ArrayInput } from './array-input';
import { VehicleCardsSlider } from './vehicle-cards-slider';
import { Form } from './form';

interface UIRendererProps {
  jsx: string;
  onSubmit?: (data: any) => void;
}

export function UIRenderer({ jsx, onSubmit }: UIRendererProps) {
  const handleFormSubmit = (data: any) => {
    console.log('Form submitted:', data);
    onSubmit?.(data);
  };

  // Components available to the JSX parser
  const components = {
    Slider,
    Select,
    MultiSelect,
    Input,
    Textarea,
    VehiclePreferencesForm,
    ArrayInput,
    VehicleCardsSlider,
    Form,
    div: 'div',
    span: 'span',
    p: 'p',
    button: 'button',
    img: 'img',
    option: 'option',
  };

  // Bindings for functions
  const bindings = {
    handleFormSubmit,
    JSON,
  };

  return (
    <div className="ui-renderer">
      <JsxParser
        components={components}
        bindings={bindings}
        jsx={jsx}
        renderInWrapper={false}
        allowUnknownElements={false}
        showWarnings={true}
        onError={(error: any) => console.error('JSX Parser Error:', error)}
      />
    </div>
  );
}