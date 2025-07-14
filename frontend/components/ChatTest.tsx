'use client'

import { useChatStore, useChatActions } from '../lib/store'

/**
 * Simple test component to verify Zustand store functionality
 * This can be imported and used in the main app to test the store
 */
export function ChatTest() {
  const { messages, conversationId, workflowId, isTyping, error } = useChatStore()
  const { 
    setConversationId, 
    addMessage, 
    setIsTyping, 
    updateCollectedData,
    clearMessages,
    reset 
  } = useChatActions()

  const handleAddTestMessage = () => {
    addMessage({
      id: `test-${Date.now()}`,
      role: 'user',
      content: 'Test message from ChatTest component',
      created_at: new Date().toISOString()
    })
  }

  const handleSetTestConversation = () => {
    setConversationId(12345)
  }

  const handleUpdateTestData = () => {
    updateCollectedData({
      test_field: 'test value',
      timestamp: new Date().toISOString()
    })
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Chat Store Test</h3>
      
      <div className="mb-4">
        <h4 className="font-medium">Store State:</h4>
        <pre className="text-sm bg-white p-2 rounded border overflow-auto">
{JSON.stringify({
  conversationId,
  workflowId,
  messageCount: messages.length,
  isTyping,
  error
}, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h4 className="font-medium">Messages:</h4>
        <div className="bg-white p-2 rounded border max-h-32 overflow-auto">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages</p>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="mb-1">
                <span className="font-medium">{msg.role}:</span> {msg.content}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-x-2">
        <button 
          onClick={handleAddTestMessage}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Test Message
        </button>
        
        <button 
          onClick={handleSetTestConversation}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Set Conversation ID
        </button>
        
        <button 
          onClick={handleUpdateTestData}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Update Data
        </button>
        
        <button 
          onClick={() => setIsTyping(!isTyping)}
          className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Toggle Typing
        </button>
        
        <button 
          onClick={clearMessages}
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Clear Messages
        </button>
        
        <button 
          onClick={reset}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset Store
        </button>
      </div>
    </div>
  )
}