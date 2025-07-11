# Drift LangGraph Service

LangGraph-based workflow service for Drift chat functionality. This service replaces the n8n workflow that was previously called from Xano's `/chat/message_complete` endpoint.

## Architecture

```
Xano /chat/message_complete (Step 15) 
    ↓ 
LangGraph Service /webhook/chat
    ↓
LangGraph Workflow Processing
    ↓
Xano /webhook/data_collection_n8n
```

## Features

- **Intent Classification**: Uses GPT-3.5-turbo to classify user messages
- **Data Extraction**: Uses Gemini for structured data extraction
- **Response Generation**: Creates contextual responses using GPT-3.5-turbo
- **Xano Integration**: Calls back to Xano's data collection webhook
- **Memory Management**: Maintains conversation state across interactions

## Quick Start

### 1. Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
OPENAI_API_KEY=your_openai_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here
```

### 3. Run the Service

```bash
# Development mode
uvicorn src.main:app --reload --port 8000

# Production mode
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 4. Test the Service

```bash
# Basic health check
curl http://localhost:8000/health

# Or run the test script
python test_service.py
```

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "drift-langgraph", 
  "version": "1.0.0"
}
```

### `POST /webhook/chat`
Main chat processing endpoint called from Xano.

**Request:**
```json
{
  "user_query": "I have a 2020 Honda Civic for sale",
  "conversation_id": 123,
  "user_id": 456,
  "chat_user_session_id": 789,
  "visitor_ip_address": "192.168.1.1",
  "additional_context": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thanks for sharing! I've noted you have a 2020 Honda Civic. Could you tell me more about the mileage and condition?",
  "collected_data": {
    "vehicle": {
      "make": "Honda",
      "model": "Civic", 
      "year": 2020
    }
  },
  "next_question": "Could you also share the mileage and asking price?",
  "conversation_complete": false
}
```

## LangGraph Workflow

The workflow consists of these nodes:

1. **classify_intent**: Determines user intent (data_collection, general_chat, end_conversation)
2. **extract_data**: Extracts structured data using Gemini
3. **generate_response**: Creates contextual response using GPT-3.5-turbo  
4. **determine_next_step**: Decides if conversation should continue

### Workflow Flow

```
START → classify_intent → route_after_intent
                             ↓
         extract_data ← data_collection
                             ↓
         generate_response ← general_chat
                             ↓
         determine_next_step ← end_conversation
                             ↓
                           END
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT models |
| `GOOGLE_AI_API_KEY` | Yes | Google AI API key for Gemini |
| `XANO_WEBHOOK_URL` | No | Xano data collection webhook URL |
| `PORT` | No | Service port (default: 8000) |
| `LOG_LEVEL` | No | Logging level (default: INFO) |

## Docker Deployment

### Build Image

```bash
docker build -t drift-langgraph .
```

### Run Container

```bash
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e GOOGLE_AI_API_KEY=your_key \
  -e XANO_WEBHOOK_URL=https://api.autosnap.cloud/api:owKhF9pX/webhook/data_collection_n8n \
  drift-langgraph
```

## Integration with Xano

To integrate with Xano's `/chat/message_complete` endpoint:

1. **Update Step 15** in the Xano endpoint to call:
   ```
   POST http://your-langgraph-service:8000/webhook/chat
   ```

2. **Pass the required data**:
   - `user_query`: The user's message
   - `conversation_id`: Xano conversation ID
   - `user_id`: Xano user ID (if authenticated)
   - `chat_user_session_id`: Xano session ID
   - `visitor_ip_address`: User's IP

3. **Handle the response** in Xano to continue the chat flow

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure virtual environment is activated
2. **API Key Errors**: Verify keys are set in `.env` file
3. **Port Conflicts**: Change PORT in `.env` if 8000 is in use
4. **Memory Issues**: Workflow uses in-memory storage by default

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
uvicorn src.main:app --reload
```

### Health Checks

The service includes health checks for:
- Basic endpoint availability (`/health`)
- Environment variable validation
- Model connectivity (when processing requests)

## Development

### Project Structure

```
backend/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic models
│   ├── workflows/
│   │   ├── __init__.py
│   │   └── chat_workflow.py # LangGraph workflow
│   └── utils/
│       ├── __init__.py
│       └── config.py        # Configuration utilities
├── .env                     # Environment variables
├── .env.example            # Environment template
├── Dockerfile              # Container definition
├── requirements.txt        # Python dependencies
├── test_service.py         # Test script
└── README.md              # This file
```

### Adding New Features

1. **New Workflow Nodes**: Add to `src/workflows/chat_workflow.py`
2. **New Data Models**: Add to `src/models/schemas.py`
3. **New Endpoints**: Add to `src/main.py`
4. **Configuration**: Update `src/utils/config.py`

### Testing

Run the test script to verify basic functionality:
```bash
python test_service.py
```

For comprehensive testing, consider adding:
- Unit tests for workflow nodes
- Integration tests for API endpoints
- Load testing for performance validation