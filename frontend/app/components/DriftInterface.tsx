"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, Zap, Brain, Eye, MousePointer, MessageCircle, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { xanoClient } from '@/lib/xano-client';

// Type definitions matching reference design
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  session_id: string;
  tokens_remaining_integer: number;
  name?: string;
  user_email?: string;
  user_id?: number;
}

interface ShowroomStats {
  views: number;
  clicks: number;
  chats: number;
}

interface ShowroomLink {
  type: 'shopper' | 'personal';
  name: string;
  url?: string;
}

type TabType = 'dashboard' | 'showrooms' | 'inventory' | 'chats';

export default function DriftInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [conversationId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showroomStats] = useState<ShowroomStats>({
    views: 981,
    clicks: 246,
    chats: 67
  });
  const [recentShowrooms] = useState<ShowroomLink[]>([
    { type: 'shopper', name: 'Andy Cole' },
    { type: 'shopper', name: 'Allie Davis' },
    { type: 'personal', name: 'Jake Carter' }
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const initializeSession = useCallback(async () => {
    try {
      // Get user IP (in production, this would come from the server)
      const ipAddress = '127.0.0.1'; // Fallback IP
      const sessionResponse = await xanoClient.getOrCreateSession({
        session_id: null, // No session yet, so pass null
        ip_address: ipAddress
      });
      
      if (sessionResponse.data) {
        setSession({
          session_id: sessionResponse.data.id || 'demo-session',
          tokens_remaining_integer: 66, // Default value matching design
          user_id: sessionResponse.data.user_id,
          user_email: sessionResponse.data.user_email
        });
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      // Set fallback session
      setSession({
        session_id: 'demo-session',
        tokens_remaining_integer: 66
      });
    }
  }, []);
  
  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const generateBrowserFingerprint = (): string => {
    // Simple browser fingerprint for demo
    return `${navigator.userAgent}-${screen.width}x${screen.height}-${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !session) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Use the chat API endpoint that integrates with Theysis backend
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentInput,
          threadId: conversationId ? `${conversationId}:${session.session_id}` : session.session_id,
          responseId: `response-${Date.now()}`
        })
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          assistantMessage.content += chunk;
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: assistantMessage.content }
                : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleCopyShareLink = async () => {
    const shareLink = `https://drift.ai/share/${session?.session_id || 'demo'}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const isAuthenticated = session?.user_id && session?.user_email;
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-sm flex flex-col">
        {/* Logo and Navigation */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <img 
              src="https://framerusercontent.com/images/9Rn7ffrmMVfnT3aVCmGKZySRL0.png" 
              alt="Drift" 
              className="h-8"
            />
            <span className="text-2xl font-bold text-[#fe3500]">{session?.tokens_remaining_integer || 66}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-6">
            <h2 className="font-semibold text-gray-900">Mission Control</h2>
            {!isAuthenticated && (
              <div className="flex gap-2">
                <button className="text-gray-600 hover:text-gray-900 transition">
                  Log in
                </button>
                <button className="px-3 py-1 bg-[#fe3500] text-white rounded-md hover:bg-[#e62e00] transition">
                  Sign Up
                </button>
              </div>
            )}
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex gap-6 text-sm">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-2 transition ${
                activeTab === 'dashboard' 
                  ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('showrooms')}
              className={`pb-2 transition ${
                activeTab === 'showrooms' 
                  ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Showrooms
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`pb-2 transition ${
                activeTab === 'inventory' 
                  ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('chats')}
              className={`pb-2 transition ${
                activeTab === 'chats' 
                  ? 'text-gray-900 font-medium border-b-2 border-[#fe3500]' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Chats
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        {activeTab === 'dashboard' ? (
          <>
            {/* Token and Model Info */}
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#fe3500] bg-opacity-10 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#fe3500]" />
                  </div>
                  <span className="text-sm text-gray-600">Tokens Remaining</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{session?.tokens_remaining_integer || 66}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                    <Brain className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-gray-600">driftAI Model</span>
                </div>
                <span className="text-sm font-medium text-gray-700">driftAI-4</span>
              </div>
            </div>
            
            {/* Share Link */}
            <div className="px-6 py-3">
              <button 
                onClick={handleCopyShareLink}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#fe3500] text-white rounded-lg hover:bg-[#e62e00] transition group"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Share with a friend and get 100 additional tokens!
                  </span>
                </div>
                {linkCopied ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {linkCopied ? 'Link copied!' : 'Click to copy your share link.'}
              </p>
            </div>
            
            {/* Showroom Engagement Stats */}
            <div className="px-6 py-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Drift Showroom Engagement
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-xs text-blue-600 mb-1">Views</div>
                  <div className="text-lg font-bold text-blue-900">{showroomStats.views}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MousePointer className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-xs text-purple-600 mb-1">Clicks</div>
                  <div className="text-lg font-bold text-purple-900">{showroomStats.clicks}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MessageCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-xs text-orange-600 mb-1">Chats</div>
                  <div className="text-lg font-bold text-orange-900">{showroomStats.chats}</div>
                </div>
              </div>
            </div>
            
            {/* Recent Showrooms */}
            <div className="px-6 py-4 border-t border-gray-100 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Recent Showrooms
              </h3>
              <div className="space-y-2">
                {recentShowrooms.map((showroom, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        showroom.type === 'shopper' ? 'bg-blue-500' : 'bg-[#fe3500]'
                      }`} />
                      <div>
                        <div className="text-xs text-gray-500 capitalize">
                          {showroom.type}:
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {showroom.name}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          // Empty state for other tabs
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🚧</div>
              <p className="text-sm">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} coming soon</p>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button className="w-full text-xs text-gray-500 hover:text-gray-700 transition">
            Drift - From Autosnap
          </button>
        </div>
      </div>
      
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#fe3500] to-[#ff6b35] rounded-2xl shadow-lg mb-6">
                <span className="text-3xl font-bold text-white">d</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                driftBot
              </h2>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                I&apos;m driftBot! Here to help you create <span className="font-semibold text-[#fe3500]">drift</span> showrooms 
                for you or for shoppers. What would you like to create?
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setInputValue('Create Shopper Showroom')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Create Shopper Showroom
                </button>
                <span className="text-gray-400 flex items-center">+3</span>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start max-w-2xl ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 ml-3'
                      : 'bg-gradient-to-br from-[#fe3500] to-[#ff6b35] mr-3'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-white font-bold text-sm">d</span>
                  )}
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-center text-gray-500">
              <div className="w-8 h-8 bg-gradient-to-br from-[#fe3500] to-[#ff6b35] rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">d</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Create a showroom for Allie Davis..."
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe3500] focus:border-transparent placeholder-gray-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="p-3 bg-gradient-to-r from-[#fe3500] to-[#ff6b35] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}