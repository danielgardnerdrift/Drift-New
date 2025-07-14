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

// Workflow types based on PRD
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

// Xano API types - Xano returns data directly, not wrapped
export type XanoApiResponse<T = any> = T & {
  error?: string;
  message?: string;
}

// Vehicle search preferences
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

// Collected data structure - matches PRD exactly
export interface CollectedData {
  // Common fields (both workflows 2 & 3)
  dealershipwebsite_url?: string;
  vehicledetailspage_urls?: string[];
  user_name?: string;
  user_phone?: string;
  user_email?: string;
  
  // Workflow 2 specific (Shopper Showroom)
  shopper_name?: string;
  gender_descriptor?: string; // Inferred from pronouns, not structured
  age_descriptor?: string; // Inferred age like '30s', '40s'
  shopper_notes?: string; // Free text about customer lifestyle/location
  
  // Vehicle preferences (both workflows can have this)
  vehiclesearchpreference?: VehicleSearchPreference[];
}

// Streaming response interface
export interface StreamResponse {
  content: string;
  done: boolean;
  workflow_id?: number;
  collected_data?: Record<string, any>;
  next_field?: string | null;
}

// Chat store interface as specified in PRD
export interface ChatStore {
  // State
  conversationId: number | null;
  messages: Message[];
  workflowId: number;
  workflowStatus: string;
  collectedData: Record<string, any>;
  isTyping: boolean;
  sessionData: SessionData | null;
  error: string | null;
  currentField: string | null;
  
  // Actions
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