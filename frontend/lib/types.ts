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

// Xano API types
export interface XanoApiResponse<T = any> {
  data?: T;
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

// Collected data structure
export interface CollectedData {
  // Workflow 2 & 3 common fields
  dealershipwebsite_url?: string;
  vehicledetailspage_urls?: string[];
  user_name?: string;
  user_phone?: number;
  user_email?: string;
  
  // Workflow 2 specific
  shopper_name?: string;
  gender_descriptor?: 'Man' | 'Woman';
  age_descriptor?: '20s' | '30s' | '40s' | '50s' | '60s' | '70s' | '80s';
  shopper_notes?: string;
  location_descriptor?: string;
  
  // Vehicle preferences
  vehiclesearchpreference?: VehicleSearchPreference[];
}