# Drift SaaS Migration PRD
## n8n to LangGraph + Theysis Implementation

### Executive Summary

This PRD outlines the migration of Drift's workflow engine from n8n to LangGraph while maintaining the existing Xano backend. The new architecture introduces a modern Next.js frontend with Theysis for dynamic UI generation, replacing the current WeWeb interface.

**Key Changes:**
- Frontend: WeWeb → Next.js + Theysis
- Workflow Engine: n8n → LangGraph (Python)
- Backend: Xano (unchanged)
- Chat Models: Optimized for cost/speed

### System Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Next.js + Theysis │────▶│       Xano          │────▶│    LangGraph    │
│   (New Frontend)    │     │  (Existing Backend) │     │ (n8n Replacement)│
└─────────────────────┘     └─────────────────────┘     └─────────────────┘
         │                           │                            │
         │                           ▼                            ▼
         │                    ┌─────────────┐            ┌──────────────┐
         │                    │  PostgreSQL  │            │  AI Models   │
         └───────────────────▶│  Database    │            │ GPT/Gemini   │
                              └─────────────┘            └──────────────┘
```

### Core Workflows

1. **General Chat** (workflow_id = 1)
   - Open-ended conversation
   - No data collection
   - Uses GPT-3.5-turbo

2. **Shopper Showroom** (workflow_id = 2)
   - Required: dealershipwebsite_url, vehiclesearchpreference, vehicledetailspage_urls, shopper_name, user_name, user_phone
   - Optional: gender_descriptor, age_descriptor, shopper_notes, user_email

3. **Personal Showroom** (workflow_id = 3)
   - Required: dealershipwebsite_url, vehicledetailspage_urls, user_name, user_phone, user_email
   - Optional: vehiclesearchpreference

### Implementation Phases

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Next.js Frontend Setup

```typescript
// Project Structure
drift-frontend/
├── app/
│   ├── layout.tsx           # Root layout with Theysis
│   ├── page.tsx            # Chat interface
│   ├── api/
│   │   └── chat/
│   │       └── route.ts    # Chat API endpoint
│   └── components/
│       ├── ChatInterface.tsx
│       ├── Sidebar.tsx
│       └── TheysisChat.tsx
├── lib/
│   ├── xano-client.ts      # Xano API client
│   └── types.ts
└── public/
    └── drift-logo.png
```

### 1.2 LangGraph Service Setup

```python
# Project Structure
drift-langgraph/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app
│   ├── workflows/
│   │   ├── __init__.py
│   │   ├── intent_detection.py
│   │   ├── general_chat.py
│   │   ├── data_collection.py
│   │   └── routing.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   └── utils/
│       ├── __init__.py
│       └── llm_clients.py
├── requirements.txt
└── Dockerfile
```

### 1.3 Environment Configuration

```env
# Next.js Frontend (.env.local)
NEXT_PUBLIC_XANO_API_URL=https://api.autosnap.cloud
NEXT_PUBLIC_DRIFT_PRIMARY_COLOR=#fe3500
XANO_API_KEY=your_api_key

# LangGraph Service (.env)
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_gemini_key
XANO_WEBHOOK_URL=https://api.autosnap.cloud/api:owKhF9pX/webhook/data_collection_n8n
PORT=8000
```

## Phase 2: Core Implementation (Week 2-3)

### 2.1 Frontend Components

#### ChatInterface.tsx
```typescript
interface ChatInterfaceProps {
  sessionId: string;
  userId?: number;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, userId }) => {
  // Implement chat UI with:
  // - Message history display
  // - Input field with typing indicators
  // - Streaming response support
  // - Theysis dynamic form rendering
}
```

#### Sidebar.tsx
```typescript
interface SidebarProps {
  sessionData: SessionData;
  showroomStats: ShowroomStats;
}

const Sidebar: React.FC<SidebarProps> = ({ sessionData, showroomStats }) => {
  // Display:
  // - User info (if authenticated)
  // - Token count
  // - Showroom engagement metrics
  // - Login/Signup buttons
}
```

### 2.2 LangGraph Workflow Implementation

#### Intent Detection Node
```python
class IntentDetectionNode:
    """
    Determines workflow routing based on user message.
    Uses GPT-3.5-turbo for cost efficiency.
    """
    
    def __init__(self, llm_client):
        self.llm = llm_client
        self.model = "gpt-3.5-turbo"
    
    async def detect_intent(self, state: ConversationState) -> WorkflowRoute:
        # Implement intent detection logic
        # Return workflow_id (1, 2, or 3)
```

#### Data Collection Node
```python
class DataCollectionNode:
    """
    Extracts and validates data based on workflow requirements.
    Uses Gemini 2.5 Flash for better reasoning.
    """
    
    def __init__(self, llm_client):
        self.llm = llm_client
        self.model = "gemini-2.5-flash"
    
    async def collect_data(self, state: ConversationState) -> CollectedData:
        # Implement data extraction and validation
        # Track collected fields and determine next_field
```

### 2.3 API Endpoints

#### Xano Integration Points

1. **Session Management**
   - POST `/session/create`
   - POST `/userchatsession/get_data`

2. **Chat Flow**
   - POST `/chat/message_complete` (calls LangGraph in step 15)
   - POST `/webhook/data_collection_n8n` (called by LangGraph to save data)

3. **Authentication**
   - POST `/auth/login`
   - POST `/auth/signup`
   - GET `/auth/me`

### 2.4 State Management

```typescript
// Zustand store for chat state
interface ChatStore {
  conversationId: number | null;
  messages: Message[];
  workflowId: number;
  workflowStatus: string;
  collectedData: Record<string, any>;
  isTyping: boolean;
  
  // Actions
  sendMessage: (message: string) => Promise<void>;
  streamResponse: (response: StreamResponse) => void;
  updateCollectedData: (data: Record<string, any>) => void;
}
```

## Phase 3: Advanced Features (Week 4)

### 3.1 Real-time Features

1. **Typing Indicators**
   - Show "driftBot is thinking..." during processing
   - Animate dots while waiting for response

2. **Streaming Responses**
   - Implement SSE (Server-Sent Events) for streaming
   - Stream by sentence for better UX
   - Target < 5s response time for chat/data collection

3. **Showroom Creation Progress**
   - Show progress bar during 10-15s creation process
   - Poll for completion status
   - Display showroom link when ready

### 3.2 Theysis Configuration

```typescript
// theysis.config.ts
export const theysisConfig = {
  theme: {
    primaryColor: '#fe3500',
    fontFamily: 'Inter, sans-serif',
  },
  components: {
    whitelist: [
      'Input',
      'Select',
      'Button',
      'Card',
      'Form',
      'DatePicker',
      'RadioGroup',
      'Checkbox'
    ],
  },
  forms: {
    vehicleSearch: {
      fields: [
        { name: 'make', type: 'select', required: true },
        { name: 'model', type: 'select', required: true },
        { name: 'year_min', type: 'number', required: false },
        { name: 'year_max', type: 'number', required: false },
        { name: 'price_min', type: 'number', required: false },
        { name: 'price_max', type: 'number', required: false },
      ]
    }
  }
};
```

### 3.3 Error Handling

```typescript
// Error boundary for chat interface
class ChatErrorBoundary extends React.Component {
  // Handle:
  // - Network failures
  // - Model API errors
  // - Xano endpoint failures
  // - Invalid state transitions
}
```

## Phase 4: Testing & Deployment (Week 5)

### 4.1 Testing Strategy

1. **Unit Tests**
   - LangGraph nodes
   - API endpoints
   - React components

2. **Integration Tests**
   - Xano API calls
   - LangGraph workflow execution
   - End-to-end chat flows

3. **Performance Tests**
   - Response time < 5s for chat
   - Showroom creation < 15s
   - Concurrent user handling

### 4.2 Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./drift-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_XANO_API_URL
  
  langgraph:
    build: ./drift-langgraph
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY
      - GOOGLE_AI_API_KEY
```

**Hosting:**
- Frontend: Vercel
- LangGraph: Railway
- Database: Existing Xano PostgreSQL

### 4.3 Migration Checklist

- [ ] Set up Next.js project with Theysis
- [ ] Implement LangGraph webhook replacement
- [ ] Create intent detection with GPT-3.5-turbo
- [ ] Implement data collection with Gemini 2.5 Flash
- [ ] Build chat interface with streaming
- [ ] Add typing indicators
- [ ] Implement session management
- [ ] Create sidebar with analytics
- [ ] Add authentication flow
- [ ] Test all three workflows
- [ ] Performance optimization
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Production deployment

## Technical Specifications

### API Contracts

#### LangGraph Webhook (n8n Replacement)
```typescript
// Request
interface WebhookRequest {
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

// Response
interface WebhookResponse {
  role: "assistant";
  content: string;
  workflow_id: number;
  workflow_status: string;
  collected_data: Record<string, any>;
  newly_collected_data: string[];
  next_field: string | null;
}
```

### Database Schema (Key Tables)

```sql
-- user_driftbot_conversations
CREATE TABLE user_driftbot_conversations (
  id SERIAL PRIMARY KEY,
  driftai_chat_user_sessions_id INTEGER,
  driftaichat_workflows_id INTEGER,
  status VARCHAR(50),
  collected_data JSONB,
  workflow_state JSONB,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_driftbot_messages
CREATE TABLE user_driftbot_messages (
  id SERIAL PRIMARY KEY,
  user_driftbot_conversations_id INTEGER,
  role VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- driftai_chat_user_sessions
CREATE TABLE driftai_chat_user_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE,
  ip_address VARCHAR(45),
  browser_fingerprint VARCHAR(255),
  name VARCHAR(255),
  user_email VARCHAR(255),
  phone VARCHAR(20),
  tokens_remaining_internal DECIMAL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Success Metrics

1. **Performance**
   - Chat response time < 5s (95th percentile)
   - Showroom creation < 15s
   - System uptime > 99.9%

2. **User Experience**
   - Smooth streaming responses
   - Mobile responsive design
   - Intuitive data collection

3. **Cost Optimization**
   - 40% reduction in AI model costs
   - Efficient token usage
   - Scalable infrastructure

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|---------|------------|
| Xano API changes | High | Version lock API, thorough testing |
| Model response variations | Medium | Structured output parsing, fallbacks |
| Session state loss | Medium | Persistent storage, recovery logic |
| Showroom creation timeout | Low | Progress indicators, retry logic |

## Appendix

### File Structure for Claude Code

```
drift-migration/
├── frontend/              # Next.js + Theysis
├── backend/              # LangGraph service
├── docs/                 # Additional documentation
├── scripts/              # Migration scripts
└── tests/               # Test suites
```

### Required Environment Variables

```env
# Frontend
NEXT_PUBLIC_XANO_API_URL
NEXT_PUBLIC_DRIFT_PRIMARY_COLOR
XANO_API_KEY

# Backend
OPENAI_API_KEY
GOOGLE_AI_API_KEY
XANO_WEBHOOK_URL
REDIS_URL (for session storage)
```

### Key Dependencies

**Frontend:**
- Next.js 14+
- React 18+
- Theysis UI
- Zustand (state management)
- Tailwind CSS

**Backend:**
- Python 3.11+
- LangGraph
- FastAPI
- LangChain
- Redis (session storage)

---

This PRD provides Claude Code with all necessary specifications to implement the migration. The phased approach ensures minimal disruption while modernizing the architecture.