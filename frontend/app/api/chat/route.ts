import { NextRequest, NextResponse } from "next/server";
import { xanoClient } from "@/lib/xano-client";
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { tool as createTool } from 'ai';
import { z } from 'zod';
// import { FIELD_MAPPINGS, FORM_SCHEMAS } from '@/theysis.config'; // Remove if not needed

// Canonical generative UI tool definitions for v0 (v5) SDK
const sliderTool = createTool({
  description: 'Render a slider input for numeric values',
  parameters: z.object({
    label: z.string(),
    min: z.number(),
    max: z.number(),
    step: z.number().optional().default(1),
    value: z.number().optional(),
    field: z.string().describe('The field name for this slider'),
  }),
  execute: async ({ label, min, max, step, value, field }) => ({ label, min, max, step, value, field })
});

const selectTool = createTool({
  description: 'Render a select dropdown for single choice',
  parameters: z.object({
    label: z.string(),
    options: z.array(z.string()),
    value: z.string().optional(),
    field: z.string().describe('The field name for this select'),
  }),
  execute: async ({ label, options, value, field }) => ({ label, options, value, field })
});

const multiSelectTool = createTool({
  description: 'Render a multi-select dropdown for multiple choices',
  parameters: z.object({
    label: z.string(),
    options: z.array(z.string()),
    values: z.array(z.string()).optional(),
    field: z.string().describe('The field name for this multi-select'),
  }),
  execute: async ({ label, options, values, field }) => ({ label, options, values, field })
});

const inputTool = createTool({
  description: 'Render a single-line text input',
  parameters: z.object({
    label: z.string(),
    placeholder: z.string().optional(),
    value: z.string().optional(),
    field: z.string().describe('The field name for this input'),
  }),
  execute: async ({ label, placeholder, value, field }) => ({ label, placeholder, value, field })
});

const textareaTool = createTool({
  description: 'Render a multi-line textarea input',
  parameters: z.object({
    label: z.string(),
    placeholder: z.string().optional(),
    value: z.string().optional(),
    field: z.string().describe('The field name for this textarea'),
  }),
  execute: async ({ label, placeholder, value, field }) => ({ label, placeholder, value, field })
});

const cardTool = createTool({
  description: 'Render a card UI element for displaying information',
  parameters: z.object({
    title: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    link: z.string().optional(),
  }),
  execute: async ({ title, description, image, link }) => ({ title, description, image, link })
});

const galleryTool = createTool({
  description: 'Render a gallery of images',
  parameters: z.object({
    images: z.array(z.string()),
    title: z.string().optional(),
  }),
  execute: async ({ images, title }) => ({ images, title })
});

const tableTool = createTool({
  description: 'Render a table with rows and columns',
  parameters: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    title: z.string().optional(),
  }),
  execute: async ({ columns, rows, title }) => ({ columns, rows, title })
});

const vehicleCardsSliderTool = createTool({
  description: 'Render a slider of vehicle cards',
  parameters: z.object({
    vehicles: z.array(z.object({
      make: z.string(),
      model: z.string(),
      year: z.number(),
      price: z.string().optional(),
      image: z.string().optional(),
      link: z.string().optional(),
    })),
    title: z.string().optional(),
  }),
  execute: async ({ vehicles, title }) => ({ vehicles, title })
});

const tools = {
  slider: sliderTool,
  select: selectTool,
  multiSelect: multiSelectTool,
  input: inputTool,
  textarea: textareaTool,
  card: cardTool,
  gallery: galleryTool,
  table: tableTool,
  vehicleCardsSlider: vehicleCardsSliderTool,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, conversationId, sessionId, session_id, chat_user_session_id, userId, collectedData, workflowId, workflowStatus } = body;
    const effectiveSessionId = chat_user_session_id || sessionId || session_id || null;
    console.log('Received sessionId:', effectiveSessionId);
    
    // Extract user query from the last user message in the messages array
    let userQuery = '';
    if (Array.isArray(messages) && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      userQuery = lastUserMsg?.content || '';
    }
    
    // Get client IP
    let visitorIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    if (visitorIp === '::1') visitorIp = '127.0.0.1';

    // Build message for LangGraph/Xano
    const messageData: any = {
      user_query: userQuery,
      visitor_ip_address: visitorIp,
      conversation_id: conversationId || null,
      user_id: userId || null,
      chat_user_session_id: effectiveSessionId
    };
    
    // If this is a form submit, include collected data for LangGraph
    if (collectedData) {
      messageData.user_query = JSON.stringify(collectedData); // Always send as JSON
    }

    // Call LangGraph via Xano
    const response = await xanoClient.sendMessage(messageData);
    if (response.error) {
      return NextResponse.json({ error: response.error }, { status: 400 });
    }
    const chatResponse: any = response;

    // Determine if visualization is needed
    const currentField = chatResponse.current_field || chatResponse.next_field;
    const status = chatResponse.workflow_status || workflowStatus;
    const needsUI = (
      (status === 'active' || status === 'optional_collection') && currentField
    ) || (
      typeof chatResponse.message === 'string' &&
      /need|provide|vehicle preferences|specific vehicle URLs|preferences/i.test(chatResponse.message)
    );

    if (needsUI) {
      // Use Vercel AI SDK v0 to generate and stream JSX UI
      const systemPrompt = `You are Driftbot. If the user needs to fill out a form or provide structured data, generate a JSX UI using the available UI tools. Otherwise, respond with plain text.`;
      const messages = [
        { role: 'system', content: systemPrompt } as const,
        { role: 'user', content: JSON.stringify(chatResponse) } as const
      ];
      const streamResult = await streamText({
        model: openai.chat('gpt-3.5-turbo'),
        messages,
        tools,
      });
      return streamResult.response;
    } else {
      // Always stream plain text using streamText for correct SSE format
      const plainText = typeof response === 'string' ? response : (response.message || JSON.stringify(response));
      const messages = [
        { role: 'system', content: 'You are Driftbot. Respond only with plain text.' } as const,
        { role: 'user', content: plainText } as const
      ];
      const streamResult = await streamText({
        model: openai.chat('gpt-3.5-turbo'),
        messages,
        tools,
      });
      return streamResult.response;
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat message', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
  // Final fallback (should never be reached, but ensures type safety)
  return new Response('Unexpected error in chat API', { status: 500 });
}