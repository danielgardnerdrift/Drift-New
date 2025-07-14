import { XanoApiResponse, SessionData, ChatResponse } from './types';

const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_API_URL;

if (!XANO_BASE_URL) {
  throw new Error('NEXT_PUBLIC_XANO_API_URL is not configured');
}

interface RequestConfig extends RequestInit {
  retries?: number;
  timeout?: number;
}

class XanoClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private defaultTimeout = 30000; // 30 seconds
  private defaultRetries = 3;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.loadStoredToken();
  }

  // Token management
  private loadStoredToken(): void {
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('xano_auth_token');
    }
  }

  private saveToken(token: string): void {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('xano_auth_token', token);
    }
  }

  private clearToken(): void {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('xano_auth_token');
    }
  }

  // Request interceptor for authentication
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Enhanced request method with retry logic and timeout
  private async requestWithRetry<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<XanoApiResponse<T>> {
    const { retries = this.defaultRetries, timeout = this.defaultTimeout, ...options } = config;
    
    console.log(`🟡 [requestWithRetry] Starting request to ${endpoint} with max ${retries} retries`);
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🟡 [requestWithRetry] Attempt ${attempt + 1} of ${retries + 1}`);
        return await this.requestWithTimeout<T>(endpoint, { ...options, timeout });
      } catch (error) {
        console.log(`🟡 [requestWithRetry] Attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          console.log(`🟡 [requestWithRetry] Not retrying - client error`);
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === retries) {
          console.log(`🟡 [requestWithRetry] All attempts exhausted`);
          throw error;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`🟡 [requestWithRetry] Waiting ${delay}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('All retry attempts failed');
  }

  // Request with timeout
  private async requestWithTimeout<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<XanoApiResponse<T>> {
    const { timeout = this.defaultTimeout, ...options } = config;
    const url = `${this.baseUrl}${endpoint}`;

    // Generate unique request ID for tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const stackTrace = new Error().stack;

    console.log(`🔵 [${requestId}] Xano API Request:`, {
      endpoint,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
      body: options.body ? JSON.parse(options.body as string) : undefined,
      stackTrace: stackTrace?.split('\n').slice(2, 5).join('\n')
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle authentication errors
      if (response.status === 401) {
        this.clearToken();
        console.log(`🔴 [${requestId}] Xano API Auth Error`);
        throw new Error('Authentication failed. Please log in again.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`🔴 [${requestId}] Xano API Error:`, {
          status: response.status,
          error: errorText,
          timestamp: new Date().toISOString()
        });
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`🟢 [${requestId}] Xano API Success:`, {
        timestamp: new Date().toISOString(),
        responsePreview: JSON.stringify(data).substring(0, 200) + '...'
      });
      
      // Response interceptor - extract token if present
      if (data.authToken) {
        this.saveToken(data.authToken);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred');
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<XanoApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Session management - Updated to use the correct endpoint
  async getOrCreateSession(data: {
    session_id: string | null;
    ip_address?: string | null;
  }): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry('/api:DMq6NJZ_/userchatsession/get_data', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chat endpoint - main integration point
  async sendMessage(data: {
    user_query: string;
    visitor_ip_address?: string;
    conversation_id?: number;
    user_id?: number;
    chat_user_session_id?: number;
  }): Promise<XanoApiResponse<ChatResponse>> {
    // CRITICAL: Disable retries for chat messages to prevent duplicates
    return this.requestWithRetry('/api:MKPwDskM/chat/message_complete', {
      method: 'POST',
      body: JSON.stringify(data),
      retries: 0  // No retries for chat messages
    });
  }

  // Authentication endpoints
  async login(data: {
    email: string;
    password: string;
  }): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry('/api:MKPwDskM/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signup(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry('/api:MKPwDskM/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry('/api:MKPwDskM/auth/me', {
      method: 'GET',
    });
  }

  // Get session data
  async getSessionData(sessionId: number): Promise<XanoApiResponse<SessionData>> {
    return this.requestWithRetry('/api:MKPwDskM/userchatsession/get_data', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  // Data collection submission
  async submitDataCollection(data: {
    conversation_id: number;
    collected_data: Record<string, any>;
    workflow_id: number;
    session_id?: number;
  }): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry('/api:MKPwDskM/webhook/data_collection_n8n', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get all messages for a conversation
  async getAllMessages(conversationId: number): Promise<XanoApiResponse<any>> {
    return this.requestWithRetry(`/api:MKPwDskM/chat/messages?conversation_id=${conversationId}`, {
      method: 'GET',
    });
  }
}

export const xanoClient = new XanoClient(XANO_BASE_URL!); 