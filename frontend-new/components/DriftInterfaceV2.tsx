"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Send, User, Zap, Brain, Eye, MousePointer, MessageCircle, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { useChat } from 'ai/react';
import JsxParser from 'react-jsx-parser';
import { xanoClient } from '@/lib/xano-client';
import { DiagnosticPanel } from '@/components/DiagnosticPanel';
import { C1Component } from '@thesysai/genui-sdk';
import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('./auth-modal'), { ssr: false });

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

// Helper type guard for ToolInvocation result
function isToolResult(invocation: any): invocation is { state: 'result'; component: string } {
  return invocation && invocation.state === 'result' && typeof invocation.component === 'string';
}

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

  const handleFormSubmit = async (data: Record<string, any>) => {
    await sendMessage(JSON.stringify(data));
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

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* ...sidebar content... */}
      </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* ...main chat content... */}
      </div>
      {/* Diagnostic Panel for Development */}
      <DiagnosticPanel />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={() => window.location.reload()} />
    </div>
  );
} 