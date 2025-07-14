import { NextRequest, NextResponse } from "next/server";
import { xanoClient } from "@/lib/xano-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get('conversationId') || '0');
    
    // Call Xano's endpoint to get all messages
    const response = await xanoClient.getAllMessages(conversationId);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // The response is likely the array of messages directly
    const messages = Array.isArray(response) ? response : (response.messages || []);
    
    return NextResponse.json({
      success: true,
      messages: messages
    });
    
  } catch (error) {
    console.error('Messages API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}