/**
 * Test file for Zustand chat store
 * Basic functionality tests for the chat state management
 */
import { renderHook, act } from '@testing-library/react'
import { useChatStore, useChatActions } from '../store'

// Mock the xano client
jest.mock('../xano-client', () => ({
  xanoClient: {
    sendMessage: jest.fn().mockResolvedValue({
      data: {
        content: 'Mock response',
        workflow_id: 1,
        workflow_status: 'completed',
        conversation_id: 123
      }
    })
  }
}))

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useChatStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChatStore())
    
    expect(result.current.conversationId).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.workflowId).toBe(1)
    expect(result.current.workflowStatus).toBe('pending')
    expect(result.current.collectedData).toEqual({})
    expect(result.current.isTyping).toBe(false)
    expect(result.current.sessionData).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should add a message to the store', () => {
    const { result } = renderHook(() => useChatStore())
    
    const testMessage = {
      id: 'test-1',
      role: 'user' as const,
      content: 'Hello',
      created_at: new Date().toISOString()
    }

    act(() => {
      result.current.addMessage(testMessage)
    })

    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0]).toEqual(testMessage)
  })

  it('should set conversation ID', () => {
    const { result } = renderHook(() => useChatStore())
    
    act(() => {
      result.current.setConversationId(123)
    })

    expect(result.current.conversationId).toBe(123)
  })

  it('should update collected data', () => {
    const { result } = renderHook(() => useChatStore())
    
    const testData = { customer_name: 'John Doe' }

    act(() => {
      result.current.updateCollectedData(testData)
    })

    expect(result.current.collectedData).toEqual(testData)
  })

  it('should merge collected data when updating', () => {
    const { result } = renderHook(() => useChatStore())
    
    act(() => {
      result.current.updateCollectedData({ customer_name: 'John Doe' })
      result.current.updateCollectedData({ customer_phone: '123-456-7890' })
    })

    expect(result.current.collectedData).toEqual({
      customer_name: 'John Doe',
      customer_phone: '123-456-7890'
    })
  })

  it('should set typing state', () => {
    const { result } = renderHook(() => useChatStore())
    
    act(() => {
      result.current.setIsTyping(true)
    })

    expect(result.current.isTyping).toBe(true)

    act(() => {
      result.current.setIsTyping(false)
    })

    expect(result.current.isTyping).toBe(false)
  })

  it('should clear messages', () => {
    const { result } = renderHook(() => useChatStore())
    
    // Add a message first
    act(() => {
      result.current.addMessage({
        id: 'test-1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString()
      })
    })

    expect(result.current.messages).toHaveLength(1)

    // Clear messages
    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toHaveLength(0)
  })

  it('should reset to initial state', () => {
    const { result } = renderHook(() => useChatStore())
    
    // Modify the state
    act(() => {
      result.current.setConversationId(123)
      result.current.addMessage({
        id: 'test-1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString()
      })
      result.current.updateCollectedData({ test: 'data' })
    })

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.conversationId).toBeNull()
    expect(result.current.messages).toEqual([])
    expect(result.current.collectedData).toEqual({})
  })
})

describe('Chat Actions Hook', () => {
  it('should provide all action methods', () => {
    const { result } = renderHook(() => useChatActions())
    
    expect(typeof result.current.sendMessage).toBe('function')
    expect(typeof result.current.streamResponse).toBe('function')
    expect(typeof result.current.updateCollectedData).toBe('function')
    expect(typeof result.current.setConversationId).toBe('function')
    expect(typeof result.current.setWorkflowId).toBe('function')
    expect(typeof result.current.setWorkflowStatus).toBe('function')
    expect(typeof result.current.setSessionData).toBe('function')
    expect(typeof result.current.setIsTyping).toBe('function')
    expect(typeof result.current.setError).toBe('function')
    expect(typeof result.current.addMessage).toBe('function')
    expect(typeof result.current.clearMessages).toBe('function')
    expect(typeof result.current.reset).toBe('function')
  })
})