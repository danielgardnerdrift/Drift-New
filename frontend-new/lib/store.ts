'use client'

import { create, StateCreator } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ChatStore, Message, SessionData, StreamResponse } from './types'
import { xanoClient } from './xano-client'

interface ChatStoreState extends Omit<ChatStore, 'sendMessage' | 'streamResponse' | 'updateCollectedData' | 'setConversationId' | 'setWorkflowId' | 'setWorkflowStatus' | 'setSessionData' | 'setIsTyping' | 'setError' | 'setCurrentField' | 'addMessage' | 'clearMessages' | 'reset'> {}

interface ChatStoreActions {
  sendMessage: (message: string) => Promise<void>
  streamResponse: (response: StreamResponse) => void
  updateCollectedData: (data: Record<string, any>) => void
  setConversationId: (id: number) => void
  setWorkflowId: (id: number) => void
  setWorkflowStatus: (status: string) => void
  setSessionData: (data: SessionData) => void
  setIsTyping: (isTyping: boolean) => void
  setError: (error: string | null) => void
  setCurrentField: (field: string | null) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  reset: () => void
}

const initialState: ChatStoreState = {
  conversationId: typeof window !== 'undefined' ? 
    (parseInt(localStorage.getItem('conversation_id') || '0') || null) : null,
  messages: [],
  workflowId: 1, // Default to general workflow
  workflowStatus: 'pending',
  collectedData: {},
  isTyping: false,
  sessionData: null, // Don't set demo data
  error: null,
  currentField: null,
}

const chatStore: StateCreator<
  ChatStore,
  [],
  [['zustand/persist', unknown]],
  ChatStore
> = (set, get) => ({
      ...initialState,

      // Actions
      sendMessage: async (message: string) => {
        // Prevent duplicate requests
        const state = get();
        console.log('\u{1F7E3} [store.sendMessage] Called with:', {
          message,
          isTyping: state.isTyping,
          timestamp: new Date().toISOString(),
          stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n')
        });
        
        if (state.isTyping) {
          console.log('\u{1F7E3} [store.sendMessage] BLOCKED - Already sending a message');
          return;
        }
        
        try {
          // Add user message and set typing state
          const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            created_at: new Date().toISOString()
          }
          
          set((state) => ({
            ...state,
            error: null,
            isTyping: true,
            messages: [...state.messages, userMessage]
          }))

          const currentState = get()
          
          // Get session_id from localStorage
          const sessionId = typeof window !== 'undefined' ? 
            localStorage.getItem('session_id') : null;
          
          console.log('Sending message with:', {
            sessionId,
            conversationId: currentState.conversationId,
            sessionData: currentState.sessionData,
            localStorage: {
              session_id: localStorage.getItem('session_id'),
              conversation_id: localStorage.getItem('conversation_id')
            }
          });
          
          // Send message to backend through local API route
          const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
          const apiEndpoint = useMockApi ? '/api/chat/mock' : '/api/chat'
          
          // Always get the latest conversationId from localStorage if available
          let conversationId = currentState.conversationId;
          if (typeof window !== 'undefined') {
            const storedConvId = localStorage.getItem('conversation_id');
            if (storedConvId && storedConvId !== '0') {
              conversationId = parseInt(storedConvId);
            }
          }

          let streamTimeout: NodeJS.Timeout | null = null;
          let streamErrorHandled = false;
          
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [...currentState.messages, userMessage], // Send the full messages array
              conversationId: conversationId,
              sessionId: sessionId,
              userId: currentState.sessionData?.user_id || null
            })
          })

          if (!response.ok) {
            throw new Error('Failed to send message')
          }

          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('text/event-stream')) {
            // SSE streaming: let Theysis SDK handle the UI. Do NOT add a pending assistant message.
            set((state) => ({
              ...state,
              isTyping: true
            }));
            // Fallback: set isTyping: false after 30s if not already set, and show error if still typing
            streamTimeout = setTimeout(() => {
              if (get().isTyping) {
                set((state) => ({ ...state, isTyping: false, error: 'Theysis UI failed to load. Please try again or check your connection.' }));
                streamErrorHandled = true;
              }
            }, 30000);
            // Listen for stream errors (network abort, etc.)
            try {
              // Try to read from the stream to catch errors early
              const reader = response.body?.getReader();
              if (reader) {
                // Read a small chunk to trigger any immediate errors
                await reader.read();
                // If successful, clear the error timeout (Theysis SDK will handle the rest)
                if (streamTimeout) clearTimeout(streamTimeout);
              }
            } catch (streamErr) {
              if (!streamErrorHandled) {
                set((state) => ({ ...state, isTyping: false, error: 'Theysis UI stream failed. Please try again.' }));
                streamErrorHandled = true;
                if (streamTimeout) clearTimeout(streamTimeout);
              }
            }
            return;
          } else if (contentType.includes('application/json')) {
            const responseData = await response.json();
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: responseData.content || 'Response received',
              created_at: new Date().toISOString()
            };
            set((state) => ({
              ...state,
              isTyping: false,
              messages: [...state.messages, assistantMessage],
              workflowId: responseData.workflow_id || state.workflowId,
              workflowStatus: responseData.workflow_status || state.workflowStatus,
              collectedData: responseData.collected_data ? 
                { ...state.collectedData, ...responseData.collected_data } : 
                state.collectedData,
              conversationId: responseData.conversation_id || state.conversationId,
              currentField: responseData.next_field || null
            }));
            // Always update localStorage with latest conversation_id
            if (responseData.conversation_id && typeof window !== 'undefined') {
              localStorage.setItem('conversation_id', responseData.conversation_id.toString());
            }
            return;
          } else {
            // Fallback: treat as plain text
            const text = await response.text();
            // Try to extract conversation_id from text if possible (e.g., if backend returns JSON as text)
            let conversationIdFromText: number | null = null;
            try {
              const maybeJson = JSON.parse(text);
              if (maybeJson && maybeJson.conversation_id) {
                conversationIdFromText = maybeJson.conversation_id;
                if (conversationIdFromText !== null) {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('conversation_id', conversationIdFromText.toString());
                  }
                  set((state) => ({
                    ...state,
                    conversationId: conversationIdFromText
                  }));
                }
              }
            } catch (e) { /* not JSON, ignore */ }
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: text,
              created_at: new Date().toISOString()
            };
            set((state) => ({
              ...state,
              isTyping: false,
              messages: [...state.messages, assistantMessage]
            }));
            return;
          }
        } catch (error) {
          set((state) => ({
            ...state,
            isTyping: false,
            error: error instanceof Error ? error.message : 'Failed to send message'
          }))
          console.error('Error sending message:', error)
        }
      },

      streamResponse: (response: StreamResponse) => {
        set((state) => {
          let updatedMessages = [...state.messages]
          
          if (response.content) {
            // Update the last assistant message or create a new one
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + response.content
              }
            } else {
              const streamMessage: Message = {
                id: `stream-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                created_at: new Date().toISOString()
              }
              updatedMessages.push(streamMessage)
            }
          }

          return {
            ...state,
            messages: updatedMessages
          }
        })
      },

      updateCollectedData: (data: Record<string, any>) => {
        set((state) => ({
          ...state,
          collectedData: { ...state.collectedData, ...data }
        }))
      },

      setConversationId: (id: number) => {
        set((state) => ({
          ...state,
          conversationId: id
        }))
      },

      setWorkflowId: (id: number) => {
        set((state) => ({
          ...state,
          workflowId: id
        }))
      },

      setWorkflowStatus: (status: string) => {
        set((state) => ({
          ...state,
          workflowStatus: status
        }))
      },

      setSessionData: (data: SessionData) => {
        set((state) => ({
          ...state,
          sessionData: data
        }))
      },

      setIsTyping: (isTyping: boolean) => {
        set((state) => ({
          ...state,
          isTyping: isTyping
        }))
      },

      setError: (error: string | null) => {
        set((state) => ({
          ...state,
          error: error
        }))
      },

      setCurrentField: (field: string | null) => {
        set((state) => ({
          ...state,
          currentField: field
        }))
      },

      addMessage: (message: Message) => {
        set((state) => ({
          ...state,
          messages: [...state.messages, message]
        }))
      },

      clearMessages: () => {
        set((state) => ({
          ...state,
          messages: []
        }))
      },

      reset: () => {
        set(initialState)
      }
    })

export const useChatStore = create(
  persist(chatStore, {
    name: 'chat-storage', // required: unique name
    storage: {
      getItem: (name: string) => {
        if (name === 'chat-storage') {
          return JSON.stringify(initialState);
        }
        return null;
      },
      setItem: (name: string, value: string) => {
        if (name === 'chat-storage') {
          try {
            const parsed = JSON.parse(value);
            if (parsed.conversationId !== null) {
              localStorage.setItem('conversation_id', parsed.conversationId.toString());
            }
            if (parsed.sessionData?.user_id) {
              localStorage.setItem('session_id', parsed.sessionData.user_id.toString());
            }
          } catch (e) {
            console.error('Failed to parse chat-storage value:', e);
          }
        }
      },
      removeItem: (name: string) => {
        if (name === 'chat-storage') {
          localStorage.removeItem('conversation_id');
          localStorage.removeItem('session_id');
        }
      },
    },
  })
) 