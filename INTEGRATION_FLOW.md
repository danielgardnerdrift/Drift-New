# Drift Integration Flow: Xano ↔ LangGraph ↔ Frontend

## Architecture Overview

The system implements a dual-response pattern where LangGraph serves both Xano and the Frontend:

```
User → Frontend → Xano → LangGraph → Xano (sync response)
                              ↓
                          Frontend (streaming)
```

## Detailed Flow

### 1. User Sends Message
- User types message in the frontend UI
- Frontend calls `/api/chat/route.ts`

### 2. Frontend → Xano
```typescript
// Frontend calls Xano first
const xanoResponse = await xanoClient.sendMessage({
  user_query: userQuery,
  chat_user_session_id: session_id,
  conversation_id: conversation_id,
  visitor_ip_address: ip
});
```

### 3. Xano → LangGraph
- Xano's `/chat/message_complete` endpoint (step 15) calls LangGraph webhook
- URL called: `http://localhost:8000/webhook/chat` (replaces n8n webhook)
- Request includes: conversation data, workflow state, collected fields

### 4. LangGraph Processing
```python
# LangGraph processes the request
@app.post("/webhook/chat")
async def process_chat_request(request: ChatRequest):
    # Run workflow
    result = await chat_workflow.ainvoke(initial_state.model_dump(), config)
    
    # Return to Xano immediately
    return {
        "response": {
            "body": response_body.model_dump(),
            "statusCode": 200
        }
    }
    
    # Asynchronously call Xano data collection
    asyncio.create_task(call_xano_data_webhook(webhook_data))
```

### 5. Parallel Actions

#### A. Response to Xano (Synchronous)
- LangGraph returns response in n8n-compatible format
- Xano receives and processes the response
- Updates conversation and saves message

#### B. Data Collection Webhook (Asynchronous)
- LangGraph calls `/webhook/data_collection_n8n`
- Saves collected data, updates workflow state
- This happens after response is sent to Xano

### 6. Frontend Streaming
- Frontend also calls LangGraph streaming endpoint
- URL: `http://localhost:8000/webhook/chat/stream`
- Receives Server-Sent Events (SSE) stream
- Generates UI components dynamically

## Key Endpoints

### Xano Endpoints (Existing)
- `/chat/message_complete` - Main chat endpoint
- `/webhook/data_collection_n8n` - Data collection webhook
- `/session/create` - Session management

### LangGraph Endpoints (New)
- `/webhook/chat` - Replaces n8n webhook (called by Xano)
- `/webhook/chat/stream` - Streaming endpoint (called by Frontend)
- `/health` - Health check

### Frontend Routes
- `/api/session` - Session initialization
- `/api/chat` - Chat integration with streaming

## Environment Variables

### Backend (.env)
```bash
OPENAI_API_KEY=your_key_here
GOOGLE_AI_API_KEY=your_key_here
XANO_API_URL=https://api.autosnap.cloud
ENABLE_XANO_SUBMISSION=true
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_XANO_API_URL=https://api.autosnap.cloud
LANGGRAPH_URL=http://localhost:8000
OPENAI_API_KEY=your_key_here
```

## Testing the Flow

1. **Start Backend**:
   ```bash
   cd backend
   uvicorn src.main:app --reload --port 8000
   ```

2. **Start Frontend**:
   ```bash
   cd frontend-new
   npm run dev
   ```

3. **Run E2E Test**:
   ```bash
   ./test-e2e-flow.sh
   ```

## Monitoring

### Backend Logs
Watch for:
- "Processing chat request for query..."
- "Calling Xano data collection webhook..."
- "Successfully called Xano webhook"

### Frontend Console
Watch for:
- Session initialization
- Xano API calls
- Streaming responses

### Xano Logs
Check:
- Request history for `/chat/message_complete`
- Webhook calls to `/webhook/data_collection_n8n`

## Critical Notes

1. **LangGraph does NOT replace Xano endpoints** - it only replaces the n8n webhook URL
2. **Dual Response Pattern** - LangGraph responds to both Xano (sync) and Frontend (streaming)
3. **Data Collection is Asynchronous** - Happens after Xano response
4. **Session Management** - Frontend creates sessions for all users (authenticated or not)
5. **UI Generation** - Uses GPT-3.5 with custom tools for dynamic forms