'use client'

import React from 'react';
import { useChatStore } from '@/lib/store';

export function DiagnosticPanel() {
  const store = useChatStore();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg shadow-lg max-w-sm text-xs font-mono">
      <h3 className="font-bold mb-2">🔧 Diagnostic Panel</h3>
      <div className="space-y-1">
        <div>Workflow ID: {store.workflowId}</div>
        <div>Status: {store.workflowStatus}</div>
        <div>Current Field: {store.currentField || 'none'}</div>
        <div>Messages: {store.messages.length}</div>
        <div>Typing: {store.isTyping ? 'yes' : 'no'}</div>
        <div>Session: {store.sessionData?.id || 'none'}</div>
        <div className="pt-2 border-t border-gray-700">
          <div className="font-bold">Collected Data:</div>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(store.collectedData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}