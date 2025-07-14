import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

// Chat interface types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface SessionData {
  id: string;
  user_id?: number;
  conversation_id?: number;
  tokens_remaining?: number;
  name?: string;
  phone?: string;
  user_email?: string;
}

export interface ShowroomStats {
  engagement_metrics?: {
    views: number;
    interactions: number;
    time_spent: number;
  };
}

export interface ConversationState {
  conversation_id: number;
  workflow_id: number;
  workflow_status: string;
  collected_data: Record<string, any>;
  workflow_state: {
    workflow_id: number;
    collected_fields: string[];
    next_field: string | null;
  };
  message: string;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  workflow_id: number;
  workflow_status: string;
  collected_data: Record<string, any>;
  newly_collected_data: string[];
  next_field: string | null;
  tokens_remaining?: number;
  session_id?: string;
  conversation_id?: number;
}

export type XanoApiResponse<T = any> = T & {
  error?: string;
  message?: string;
}

export interface VehicleSearchPreference {
  make?: string;
  model?: string;
  trim?: string[];
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  exterior_color?: string[];
  interior_color?: string[];
  miles_min?: number;
  miles_max?: number;
  condition?: ('New' | 'Used' | 'Certified')[];
  body_style?: string;
}

export interface CollectedData {
  dealershipwebsite_url?: string;
  vehicledetailspage_urls?: string[];
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  shopper_name?: string;
  gender_descriptor?: string;
  age_descriptor?: string;
  shopper_notes?: string;
  vehiclesearchpreference?: VehicleSearchPreference[];
}

export interface StreamResponse {
  content: string;
  done: boolean;
  workflow_id?: number;
  collected_data?: Record<string, any>;
  next_field?: string | null;
}

export interface ChatStore {
  conversationId: number | null;
  messages: Message[];
  workflowId: number;
  workflowStatus: string;
  collectedData: Record<string, any>;
  isTyping: boolean;
  sessionData: SessionData | null;
  error: string | null;
  currentField: string | null;
  sendMessage: (message: string) => Promise<void>;
  streamResponse: (response: StreamResponse) => void;
  updateCollectedData: (data: Record<string, any>) => void;
  setConversationId: (id: number) => void;
  setWorkflowId: (id: number) => void;
  setWorkflowStatus: (status: string) => void;
  setSessionData: (data: SessionData) => void;
  setIsTyping: (isTyping: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentField: (field: string | null) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  reset: () => void;
}
