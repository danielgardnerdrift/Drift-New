import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { xanoClient } from '@/lib/xano-client';

export const maxDuration = 60;

// Helper to parse SSE data
function parseSSELine(line: string): { event?: string; data?: string; id?: string } {
  const result: { event?: string; data?: string; id?: string } = {};
  
  if (line.startsWith('event: ')) {
    result.event = line.slice(7);
  } else if (line.startsWith('data: ')) {
    result.data = line.slice(6);
  } else if (line.startsWith('id: ')) {
    result.id = line.slice(4);
  }
  
  return result;
}

// Helper to extract UI components from message
function extractUIComponents(content: string): { text: string; ui?: string } {
  const uiMatch = content.match(/\[UI_COMPONENT_START\]([\s\S]*?)\[UI_COMPONENT_END\]/);
  
  if (uiMatch) {
    const text = content.replace(/\[UI_COMPONENT_START\][\s\S]*?\[UI_COMPONENT_END\]/, '').trim();
    return { text, ui: uiMatch[1].trim() };
  }
  
  return { text: content };
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  try {
    const { messages, chat_user_session_id, conversation_id } = await request.json();
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage.content;

    // First, call Xano to process the message and get conversation state
    const xanoResponse = await xanoClient.sendMessage({
      user_query: userQuery,
      chat_user_session_id: chat_user_session_id ? parseInt(chat_user_session_id) : undefined,
      conversation_id: conversation_id ? parseInt(conversation_id) : undefined,
      visitor_ip_address: request.headers.get('x-forwarded-for') || undefined,
    });

    // Extract the response from Xano's nested structure
    const chatResponse = xanoResponse.response?.body || xanoResponse.response || xanoResponse;
    
    // Store the conversation_id for tracking
    const currentConversationId = chatResponse.conversation_id;
    
    // Prepare request data for LangGraph streaming endpoint
    const langGraphRequest = {
      user_query: userQuery,
      conversation_id: currentConversationId,
      user_id: chatResponse.user_id,
      session_id: chat_user_session_id,
      visitor_ip_address: request.headers.get('x-forwarded-for') || undefined,
      workflow_id: chatResponse.workflow_id,
      workflow_status: chatResponse.workflow_status,
      next_field: chatResponse.next_field || chatResponse.current_field,
      collected_fields: chatResponse.collected_fields || [],
    };

    // Call LangGraph streaming endpoint
    const langGraphUrl = process.env.LANGGRAPH_URL || 'http://localhost:8000';
    const streamResponse = await fetch(`${langGraphUrl}/webhook/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(langGraphRequest),
    });

    if (!streamResponse.ok) {
      throw new Error(`LangGraph error: ${streamResponse.status}`);
    }

    // Create a readable stream that processes LangGraph SSE and converts to AI SDK format
    const stream = new ReadableStream({
      async start(controller) {
        const reader = streamResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        let currentEvent: { event?: string; data?: string; id?: string } = {};

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Keep the last potentially incomplete line in buffer
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              if (line.trim() === '') {
                // Empty line signals end of SSE message
                if (currentEvent.data) {
                  // Process the complete SSE message
                  if (currentEvent.event === 'message' && currentEvent.data !== '[DONE]') {
                    try {
                      const parsedData = JSON.parse(currentEvent.data);
                      
                      // Only process if conversation_id matches
                      if (parsedData.conversation_id === currentConversationId) {
                        const { text, ui } = extractUIComponents(parsedData.content || '');
                        
                        // Stream the text content
                        if (text) {
                          controller.enqueue(encoder.encode(`0:${text}\n`));
                        }
                        
                        // If there's UI, send it as a tool invocation
                        if (ui && parsedData.has_ui) {
                          const toolResponse = {
                            toolCallId: `ui-${Date.now()}`,
                            toolName: 'render_ui',
                            args: { jsx: ui },
                            result: ui
                          };
                          controller.enqueue(encoder.encode(`9:${JSON.stringify(toolResponse)}\n`));
                        }
                        
                        // Send metadata as custom event
                        const metadata = {
                          conversation_id: parsedData.conversation_id,
                          workflow_id: parsedData.workflow_id,
                          workflow_status: parsedData.workflow_status,
                          next_field: parsedData.next_field,
                          collected_data: parsedData.collected_data
                        };
                        controller.enqueue(encoder.encode(`8:${JSON.stringify(metadata)}\n`));
                      }
                    } catch (e) {
                      console.error('Error parsing SSE data:', e);
                    }
                  } else if (currentEvent.event === 'done') {
                    // Stream completed
                    controller.enqueue(encoder.encode(`0:\n`));
                  }
                }
                currentEvent = {};
              } else {
                // Parse SSE line
                const parsed = parseSSELine(line);
                Object.assign(currentEvent, parsed);
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': currentConversationId?.toString() || '',
        'X-Workflow-Id': chatResponse.workflow_id?.toString() || '',
        'X-Workflow-Status': chatResponse.workflow_status || '',
        'X-Next-Field': chatResponse.next_field || chatResponse.current_field || '',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return error as a stream
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    const errorStream = streamText({
      model: openai('gpt-3.5-turbo'),
      messages: [
        {
          role: 'assistant',
          content: `I encountered an error: ${errorMessage}. Please try again.`,
        },
      ],
    });

    return new Response(errorStream.toTextStreamResponse().body, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    });
  }
}