import { XanoApiResponse, SessionData, ChatResponse } from './types';

const XANO_BASE_URL = process.env.NEXT_PUBLIC_XANO_API_URL;

if (!XANO_BASE_URL) {
  throw new Error('NEXT_PUBLIC_XANO_API_URL is not configured');
}

class XanoClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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

  // Session management
  async createSession(data: {
    visitor_ip_address?: string;
    browser_fingerprint?: string;
  }): Promise<XanoApiResponse<SessionData>> {
    return this.request('/api:MKPwDskM/session/create', {
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
    return this.request('/api:MKPwDskM/chat/message_complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Authentication endpoints
  async login(data: {
    email: string;
    password: string;
  }): Promise<XanoApiResponse<any>> {
    return this.request('/api:MKPwDskM/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async signup(data: {
    email: string;
    password: string;
    name?: string;
  }): Promise<XanoApiResponse<any>> {
    return this.request('/api:MKPwDskM/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<XanoApiResponse<any>> {
    return this.request('/api:MKPwDskM/auth/me', {
      method: 'GET',
    });
  }

  // Get session data
  async getSessionData(sessionId: number): Promise<XanoApiResponse<SessionData>> {
    return this.request('/api:MKPwDskM/userchatsession/get_data', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  }
}

export const xanoClient = new XanoClient(XANO_BASE_URL);