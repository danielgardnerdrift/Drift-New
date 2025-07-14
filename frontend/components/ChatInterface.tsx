'use client'

import React, { useEffect, useRef } from 'react';
import { useChatStore } from '@/lib/store';
import { Message } from '@/lib/types';
import { Send } from 'lucide-react';

export function ChatInterface() {
  const {
    messages,
    isTyping,
    sendMessage,
    workflowId,
    workflowStatus,
    collectedData,
    currentField,
    error
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFormSubmit = async (data: Record<string, any>) => {
    // Format the data as a natural language response
    const fieldName = Object.keys(data)[0];
    const value = data[fieldName];
    
    let message = '';
    if (Array.isArray(value)) {
      if (fieldName === 'vehicledetailspage_urls') {
        message = value.join('\n');
      } else if (fieldName === 'vehiclesearchpreference') {
        // Format vehicle preferences
        const pref = value[0];
        const parts = [];
        if (pref.make) parts.push(`Make: ${pref.make}`);
        if (pref.model) parts.push(`Model: ${pref.model}`);
        if (pref.year_min || pref.year_max) {
          parts.push(`Year: ${pref.year_min || 'Any'}-${pref.year_max || 'Any'}`);
        }
        if (pref.price_min || pref.price_max) {
          parts.push(`Price: $${pref.price_min || '0'}-$${pref.price_max || 'Any'}`);
        }
        message = parts.join(', ');
      }
    } else {
      message = String(value);
    }

    await sendMessage(message);
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isTyping) return;

    const message = input.value.trim();
    input.value = '';
    await sendMessage(message);
  };

  const showForm = workflowStatus === 'collecting_data' && currentField;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
            <span className="text-sm">Drift is typing...</span>
          </div>
        )}

        {/* Dynamic Form */}
        {showForm && !isTyping && (
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Collecting Data</h3>
            <p className="text-sm text-gray-700">
              Drift is currently collecting data for the field: <strong>{currentField}</strong>.
              Please provide the information requested.
            </p>
            {/* TheysisChat component was here, but it's been removed. */}
            {/* Add a placeholder or a message indicating the form is not available */}
            <p className="text-sm text-gray-500 mt-4">
              Please provide the requested information in the input field below.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!showForm && (
        <form onSubmit={handleTextSubmit} className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fe3500] focus:border-transparent"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping}
              className="p-2 bg-[#fe3500] text-white rounded-lg hover:bg-[#e62e00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-[#fe3500] text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.created_at && (
          <p className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
            {new Date(message.created_at).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}