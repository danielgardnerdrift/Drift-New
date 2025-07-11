import { NextRequest, NextResponse } from "next/server";
import { xanoClient } from "@/lib/xano-client";

export async function POST(req: NextRequest) {
  try {
    const { prompt, threadId } = await req.json();
    
    // Extract user query from the prompt object
    const userQuery = typeof prompt === 'string' ? prompt : prompt.content || '';
    
    // Get client IP for session tracking
    const visitorIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Parse threadId to get conversation_id and session_id if available
    let conversationId: number | undefined;
    let sessionId: number | undefined;
    
    if (threadId) {
      // ThreadId format might be "conversation_id:session_id" or just "conversation_id"
      const parts = threadId.split(':');
      conversationId = parseInt(parts[0]) || undefined;
      sessionId = parseInt(parts[1]) || undefined;
    }

    // Call Xano's main chat endpoint
    const response = await xanoClient.sendMessage({
      user_query: userQuery,
      visitor_ip_address: visitorIp,
      conversation_id: conversationId,
      chat_user_session_id: sessionId,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // Format response for Theysis C1Chat component
    const chatResponse = response.data;
    
    // Create streaming response as expected by C1Chat
    const stream = new ReadableStream({
      start(controller) {
        // Send the response content as a stream
        const content = chatResponse?.content || 'No response received';
        
        // Split into chunks for streaming effect
        const chunks = content.split(' ');
        let index = 0;
        
        const sendChunk = () => {
          if (index < chunks.length) {
            const chunk = chunks[index] + (index < chunks.length - 1 ? ' ' : '');
            controller.enqueue(new TextEncoder().encode(chunk));
            index++;
            setTimeout(sendChunk, 50); // Delay between chunks for streaming effect
          } else {
            controller.close();
          }
        };
        
        sendChunk();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}