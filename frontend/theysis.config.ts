export const theysisConfig = {
  theme: {
    primaryColor: '#fe3500',
    fontFamily: 'Inter, sans-serif',
  },
  components: {
    whitelist: [
      'Input',
      'Select',
      'Button',
      'Card',
      'Form',
      'DatePicker',
      'RadioGroup',
      'Checkbox'
    ],
  },
  forms: {
    vehicleSearch: {
      fields: [
        { name: 'make', type: 'select', required: true },
        { name: 'model', type: 'select', required: true },
        { name: 'trim', type: 'array', required: false },
        { name: 'year_min', type: 'number', required: false },
        { name: 'year_max', type: 'number', required: false },
        { name: 'price_min', type: 'number', required: false },
        { name: 'price_max', type: 'number', required: false },
        { name: 'exterior_color', type: 'array', required: false },
        { name: 'interior_color', type: 'array', required: false },
        { name: 'miles_min', type: 'number', required: false },
        { name: 'miles_max', type: 'number', required: false },
        { name: 'condition', type: 'array', required: false },
        { name: 'body_style', type: 'string', required: false },
      ]
    }
  }
};