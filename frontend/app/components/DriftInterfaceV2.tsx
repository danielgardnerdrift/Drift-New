"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Send, User, Zap, Brain, Eye, MousePointer, MessageCircle, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useChat } from 'ai/react';
import { UIRenderer } from '@/components/ui/generative/ui-renderer';
import { xanoClient } from '@/lib/xano-client';
import { DiagnosticPanel } from '@/components/DiagnosticPanel';
import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('@/components/auth-modal'), { ssr: false });

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


export default function DriftInterfaceV2() {
  const {
    messages,
    isTyping,
    sendMessage,
    workflowId,
    workflowStatus,
    currentField,
    sessionData,
    setSessionData,
    error,
    clearMessages,
    addMessage
  } = useChatStore();

  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [linkCopied, setLinkCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const isMountedRef = React.useRef(false);
  
  // Always create a session for every user (signed in or not)
  const initializeSession = useCallback(async () => {
    try {
      // Check for existing session_id in localStorage
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        // Call our session API endpoint to create a new session
        const response = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          throw new Error('Failed to initialize session');
        }
        const data = await response.json();
        if (data.success && data.session) {
          const sessionObj = data.session.session || data.session;
          sessionId = sessionObj.session_id || sessionObj.id;
          if (sessionId) {
            localStorage.setItem('session_id', sessionId.toString());
          }
          setSessionData({
            id: sessionId ? sessionId.toString() : 'demo-session',
            tokens_remaining: sessionObj.tokens_remaining_integer || sessionObj.tokens_remaining || 100,
            user_id: sessionObj.user_id || null,
            user_email: sessionObj.user_email || null
          });
        }
      } else {
        // If session_id exists, fetch session data from Xano if needed
        // (optional: can skip if not needed for anonymous)
      }
      // Load existing conversation messages if conversation_id exists
      const conversationId = localStorage.getItem('conversation_id');
      if (conversationId && conversationId !== '0') {
        await loadConversationMessages(parseInt(conversationId));
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }, [setSessionData]);
  
  // Load conversation messages
  const loadConversationMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.messages && data.messages.length > 0) {
          // Clear existing messages and load from server
          clearMessages();
          data.messages.forEach((msg: any) => {
            addMessage({
              id: `msg-${msg.id}`,
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              created_at: msg.created_at
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };
  
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      initializeSession();
    }
  }, [initializeSession]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);
  
  const handleSendMessage = async () => {
    console.log('🟠 [handleSendMessage] Called:', {
      inputValue,
      hasSession: !!sessionData,
      isSending,
      isTyping,
      timestamp: new Date().toISOString()
    });
    
    if (!inputValue.trim() || !sessionData || isSending || isTyping) {
      console.log('🟠 [handleSendMessage] BLOCKED:', { 
        noInput: !inputValue.trim(), 
        noSession: !sessionData, 
        isSending,
        isTyping
      });
      return;
    }
    
    setIsSending(true);
    try {
      console.log('🟠 [handleSendMessage] Calling sendMessage...');
      await sendMessage(inputValue);
      setInputValue('');
    } finally {
      setIsSending(false);
    }
  };


  const handleCopyShareLink = async () => {
    const shareLink = `https://drift.ai/share/${sessionData?.id || 'demo'}`;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const isAuthenticated = sessionData?.user_id && sessionData?.user_email;
  // Remove showForm logic; useChat will handle UI rendering based on toolInvocations

  // Get sessionId from localStorage (client-side only)
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLocalSessionId(localStorage.getItem('session_id'));
    }
  }, []);

  // --- useChat integration ---
  const {
    messages: chatMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: chatIsLoading,
    error: chatError,
    append,
    reload,
    stop,
    setInput,
  } = useChat({
    api: '/api/chat',
    body: { 
      chat_user_session_id: localSessionId,
      conversation_id: localStorage.getItem('conversation_id') || undefined
    },
    headers: {
      'X-Session-Id': localSessionId || '',
    },
    onResponse: (response) => {
      // Update conversation tracking from response headers
      const conversationId = response.headers.get('X-Conversation-Id');
      const workflowId = response.headers.get('X-Workflow-Id');
      const workflowStatus = response.headers.get('X-Workflow-Status');
      const nextField = response.headers.get('X-Next-Field');
      
      if (conversationId) {
        localStorage.setItem('conversation_id', conversationId);
      }
    },
    onFinish: (message) => {
      // Handle any metadata updates
      console.log('Message finished:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Handle form submission from UI components
  const handleUIFormSubmit = async (data: Record<string, any>) => {
    // Send the form data as a new message
    const formDataMessage = Object.entries(data)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
      .join('\n');
    
    await append({
      role: 'user',
      content: formDataMessage,
    });
  };

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
            <span className="text-2xl font-bold text-[#fe3500]">{sessionData?.tokens_remaining || 66}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-6">
            <h2 className="font-semibold text-gray-900">Mission Control</h2>
            {!isAuthenticated && (
              <div className="flex gap-2">
                <button className="text-gray-600 hover:text-gray-900 transition" onClick={() => setAuthModalOpen(true)}>
                  Log in
                </button>
                <button className="px-3 py-1 bg-[#fe3500] text-white rounded-md hover:bg-[#e62e00] transition" onClick={() => setAuthModalOpen(true)}>
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
                <span className="text-xl font-bold text-gray-900">{sessionData?.tokens_remaining || 66}</span>
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
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatMessages.length === 0 && (
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
                  onClick={() => {
                    setInput('Create Shopper Showroom');
                    // Trigger submit after setting input
                    setTimeout(() => {
                      const form = document.querySelector('form') as HTMLFormElement;
                      if (form) form.requestSubmit();
                    }, 0);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Create Shopper Showroom
                </button>
                <span className="text-gray-400 flex items-center">+3</span>
              </div>
            </div>
          )}
          
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-[#fe3500] text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {/* Render content and any UI components */}
                {message.toolInvocations && message.toolInvocations.length > 0 ? (
                  <div>
                    {message.content && (
                      <p className="text-sm whitespace-pre-wrap mb-2">{message.content}</p>
                    )}
                    {message.toolInvocations.map((invocation, idx) => {
                      if (invocation.toolName === 'render_ui' && invocation.result) {
                        return (
                          <UIRenderer 
                            key={idx} 
                            jsx={invocation.result} 
                            onSubmit={handleUIFormSubmit}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
                {message.createdAt && (
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          ))}

          {(chatIsLoading || isTyping) && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm">Drift is typing...</span>
            </div>
          )}

          {(error || chatError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{
                (error && typeof error === 'object' && 'message' in error ? (error as any).message : error) ||
                (chatError && typeof chatError === 'object' && 'message' in chatError ? (chatError as any).message : chatError)
              }</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fe3500] focus:border-transparent"
              disabled={chatIsLoading || isTyping}
            />
            <button
              type="submit"
              disabled={chatIsLoading || isTyping}
              className="p-2 bg-[#fe3500] text-white rounded-lg hover:bg-[#e62e00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
      
      {/* Diagnostic Panel for Development */}
      <DiagnosticPanel />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={() => window.location.reload()} />
    </div>
  );
}