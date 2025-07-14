'use client'

import React, { useState } from 'react';
import { Card } from '@crayonai/react-ui';

export default function TestFormsPage() {
  const [testField, setTestField] = useState<string>('user_name');
  const [workflowId, setWorkflowId] = useState<number>(2);
  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);

  const testFields = [
    { value: 'user_name', workflow: 2, label: 'Name Field' },
    { value: 'user_phone', workflow: 2, label: 'Phone Field' },
    { value: 'user_email', workflow: 2, label: 'Email Field' },
    { value: 'dealershipwebsite_url', workflow: 2, label: 'Website URL Field' },
    { value: 'shopper_name', workflow: 2, label: 'Customer Name (Workflow 2)' },
    { value: 'vehicledetailspage_urls', workflow: 2, label: 'Vehicle URLs Array' },
    { value: 'vehiclesearchpreference', workflow: 2, label: 'Vehicle Preferences' },
    { value: 'vehicledetailspage_urls', workflow: 3, label: 'Showcase URLs (Workflow 3)' },
  ];

  const handleSubmit = (data: Record<string, any>) => {
    console.log('Form submitted:', data);
    setSubmittedData(data);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Form Testing</h1>
      
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Select Test Field:</label>
        <select
          value={testField}
          onChange={(e) => {
            const field = testFields.find(f => f.value === e.target.value);
            if (field) {
              setTestField(field.value);
              setWorkflowId(field.workflow);
            }
          }}
          className="w-full p-2 border rounded-lg"
        >
          {testFields.map(field => (
            <option key={field.value} value={field.value}>
              {field.label} (Workflow {field.workflow})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Form Preview:</h2>
        {/* TheysisChat component was removed, so this section is now empty */}
        {/* If TheysisChat was the main content, leave a comment or placeholder */}
      </div>

      {submittedData && (
        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">Submitted Data:</h3>
          <pre className="bg-white p-4 rounded border overflow-auto">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}