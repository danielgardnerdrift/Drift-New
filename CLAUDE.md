# CLAUDE.md - Drift Migration Project Guidelines

## Project Overview

You are implementing a migration from n8n to LangGraph + Theysis for the Drift SaaS application. This project maintains the existing Xano backend while replacing the frontend (WeWeb → Next.js + Theysis) and workflow engine (n8n → LangGraph).

## CRITICAL ARCHITECTURE UNDERSTANDING

**CORRECTED INTEGRATION FLOW:**

1. **Main Chat Endpoint**: Xano's `/chat/message_complete` endpoint handles all chat requests
2. **Step 15 Integration**: In step 15 of the chat endpoint, Xano makes an external API request to n8n webhook
3. **LangGraph Replacement**: LangGraph will replace the n8n webhook URL called in step 15
4. **Data Collection**: LangGraph must call Xano's `/webhook/data_collection_n8n` endpoint to save data

```
User → Next.js → Xano (/chat/message_complete) → LangGraph (step 15) → Xano (/webhook/data_collection_n8n)
```

**What LangGraph DOES:**
- Replaces the n8n webhook URL: `https://driftbot.app.n8n.cloud/webhook/driftbot-webhook`
- Receives requests from Xano's chat endpoint (step 15)
- Processes intent detection, data collection, and workflow routing
- Calls Xano's data collection endpoint when saving data

**What LangGraph DOES NOT DO:**
- Does NOT replace any Xano endpoints
- Does NOT handle the `/webhook/data_collection_n8n` endpoint directly
- Does NOT change any existing Xano API contracts

## Critical Tools Usage

### 1. Snappy MCP Tools (Xano Operations)

**ALWAYS use Snappy MCP tools for any Xano-related operations:**

- **Discovery & Information Gathering:**
  - `snappy:xano_list_instances` - Find Xano instances
  - `snappy:xano_list_databases` - List workspaces/databases
  - `snappy:xano_list_tables` - Explore table structure
  - `snappy:xano_get_table_schema` - Get detailed schema info
  - `snappy:xano_browse_api_groups` - Find API endpoints
  - `snappy:xano_get_api_with_logic` - Examine endpoint logic

- **Development & Modifications:**
  - `snappy:xano_create_api_with_logic` - Create new endpoints
  - `snappy:xano_add_field_to_schema` - Add table fields
  - `snappy:xano_update_api_with_logic` - Modify existing endpoints
  - `snappy:xano_create_table` - Create new tables if needed
  - `snappy:xano_manage_table_indexes` - Optimize performance

- **Testing & Debugging:**
  - `snappy:xano_browse_table_content` - View table data
  - `snappy:xano_browse_request_history` - Debug API calls
  - `snappy:xano_browse_logs` - Check error logs

**Example Usage Pattern:**
```
When implementing a new feature:
1. First use xano_list_tables to understand current structure
2. Use xano_get_table_schema to examine relevant tables
3. Create/modify endpoints with xano_create_api_with_logic
4. Test with xano_browse_table_content
```

### 2. Context7 (Documentation Research)

**ALWAYS use Context7 for researching latest documentation:**

- Before implementing any feature, research:
  - LangGraph latest patterns and best practices
  - Theysis UI component documentation
  - Next.js 14+ App Router patterns
  - Streaming response implementations
  - Python FastAPI best practices

**Common Research Queries:**
- "LangGraph state management patterns 2024"
- "Theysis dynamic form generation"
- "Next.js streaming SSE implementation"
- "FastAPI WebSocket vs SSE for chat applications"
- "LangGraph conditional edges best practices"

## Project Structure & Key Files

```
drift-migration/
├── CLAUDE.md                    # This file - project guidelines
├── PRD.md                       # Product requirements document
├── frontend/                    # Next.js + Theysis app
│   ├── app/
│   │   ├── api/chat/route.ts  # Chat API endpoint
│   │   └── components/
│   └── lib/
│       └── xano-client.ts      # Xano API integration
├── backend/                     # LangGraph service
│   ├── src/
│   │   ├── workflows/          # LangGraph workflows
│   │   └── models/             # Pydantic schemas
│   └── main.py                 # FastAPI app
└── reference-docs/             # Xano API documentation
```

## Development Workflow

### 1. Before Making Changes

1. **Check Existing Xano Structure:**
   ```
   - Use xano_list_tables to see current tables
   - Use xano_browse_api_groups to find existing endpoints
   - Use xano_get_api_with_logic to understand current logic
   ```

2. **Research Latest Practices:**
   ```
   - Use Context7 to find current documentation
   - Check for deprecations or new features
   - Find community best practices
   ```

### 2. When Implementing Features

1. **Xano Backend Changes:**
   - Create new fields with proper types (use `xano_add_field_to_schema`)
   - Add indexes for performance (`xano_manage_table_indexes`)
   - Create/update endpoints as needed
   - Always check table auth settings for security endpoints

2. **Frontend Implementation:**
   - Use Theysis components from whitelist
   - Implement streaming with SSE
   - Maintain mobile responsiveness
   - Use the brand color #fe3500

3. **LangGraph Workflows:**
   - Keep nodes focused and single-purpose
   - Use conditional edges for routing
   - Implement proper error handling
   - Optimize model usage (GPT-3.5 for routing, Gemini for extraction)

### 3. Testing & Validation

1. **Xano Testing:**
   ```
   - Use xano_browse_table_content to verify data
   - Check xano_browse_request_history for API calls
   - Monitor xano_browse_logs for errors
   ```

2. **Integration Testing:**
   - Test full flow from frontend → Xano → LangGraph
   - Verify streaming responses work correctly
   - Check session management across refreshes

## Key Integration Points

### Xano Endpoints (DO NOT MODIFY CONTRACTS):
- `/chat/message_complete` - Main chat endpoint (calls LangGraph in step 15)
- `/webhook/data_collection_n8n` - Data collection (LangGraph calls this)
- `/session/create` - Session management
- `/auth/*` - Authentication endpoints

### LangGraph Integration:
- **Replaces**: `https://driftbot.app.n8n.cloud/webhook/driftbot-webhook`
- **Called from**: Xano's `/chat/message_complete` endpoint (step 15)
- **Calls to**: Xano's `/webhook/data_collection_n8n` endpoint when saving data

### Environment Variables:
- Xano: `openai_key`, `GOOGLE_AI_API_KEY`
- Frontend: `NEXT_PUBLIC_XANO_API_URL`
- Backend: `XANO_WEBHOOK_URL`

## Common Tasks & Solutions

### Adding a New Field to Data Collection:

1. Research field type best practices with Context7
2. Use `xano_get_table_schema` to check current structure
3. Add field with `xano_add_field_to_schema`
4. Update LangGraph extraction logic
5. Test with `xano_browse_table_content`

### Creating a New API Endpoint:

1. Use `xano_browse_api_groups` to find appropriate group
2. Create with `xano_create_api_with_logic` using XanoScript
3. Test endpoint functionality
4. Update frontend API client

### Debugging Chat Flow:

1. Check `xano_browse_request_history` for request/response
2. Use `xano_browse_logs` for error details
3. Verify session with `xano_browse_table_content` on sessions table

## Important Reminders

1. **NEVER assume Xano structure** - always check with Snappy tools
2. **ALWAYS research before implementing** - use Context7 for latest docs
3. **Maintain backward compatibility** - don't break existing Xano contracts
4. **Test incrementally** - verify each component before integration
5. **Use existing patterns** - follow the established architecture

## Error Handling

When encountering issues:
1. First check Xano logs with `xano_browse_logs`
2. Verify table structure hasn't changed
3. Research error patterns with Context7
4. Check for rate limits or quota issues
5. Validate all environment variables are set

## Performance Optimization

1. Use `xano_manage_table_indexes` for frequently queried fields
2. Implement caching where appropriate
3. Batch operations when possible
4. Monitor response times in `xano_browse_request_history`

## Current Implementation Status

### ✅ Completed Components

**Frontend (Next.js + Custom UI)**:
- Custom `DriftInterface.tsx` component matching reference design exactly
- Two-panel layout: Mission Control sidebar + driftBot chat interface
- Proper #fe3500 branding throughout
- Xano API integration maintained through existing `/api/chat` endpoint
- Streaming message support preserved
- Session management and token tracking implemented
- Location: `/frontend/app/components/DriftInterface.tsx`

**Backend (LangGraph Service)**:
- Complete FastAPI application with health checks
- LangGraph workflow with 4-node architecture:
  - `classify_intent` → `extract_data` → `generate_response` → `determine_next_step`
- Pydantic models for type safety
- Docker containerization ready
- Environment configuration and comprehensive documentation
- Location: `/backend/src/main.py`, `/backend/src/workflows/chat_workflow.py`

**Documentation**:
- Corrected architecture understanding in all project files
- Updated Taskmaster tasks with accurate implementation details
- Comprehensive README files for both frontend and backend

### 🔄 Current Development Status

**Active Session Context**:
- **Task Progress**: Completed Tasks 1-2 in Taskmaster, ready for Task 3+
- **Build Status**: Frontend builds successfully, backend service running on port 8000
- **Integration Ready**: Both services operational, ready for end-to-end testing

**Known Issues**:
- ESLint warnings in frontend (disabled for builds temporarily)
- Backend needs API keys configured for full functionality
- End-to-end integration testing pending

### 🎯 Immediate Next Actions

1. **Environment Setup** (Priority: High):
   ```bash
   # Backend API keys needed:
   echo "OPENAI_API_KEY=your_key_here" >> backend/.env
   echo "GOOGLE_AI_API_KEY=your_key_here" >> backend/.env
   ```

2. **Integration Testing** (Priority: High):
   - Test Frontend → `/api/chat` → Xano integration
   - Test LangGraph service endpoints independently
   - Verify streaming responses work correctly

3. **Code Quality** (Priority: Medium):
   - Fix ESLint TypeScript warnings in frontend
   - Add proper error boundaries in React components
   - Improve type definitions in `lib/types.ts`

### 📁 Critical File Locations

**Frontend Architecture**:
- Main Interface: `/frontend/app/components/DriftInterface.tsx`
- API Route: `/frontend/app/api/chat/route.ts`  
- Xano Client: `/frontend/lib/xano-client.ts`
- Types: `/frontend/lib/types.ts`

**Backend Architecture**:
- FastAPI App: `/backend/src/main.py`
- LangGraph Workflow: `/backend/src/workflows/chat_workflow.py`
- Pydantic Models: `/backend/src/models/schemas.py`
- Configuration: `/backend/src/utils/config.py`

**Key Design Elements Implemented**:
- Mission Control sidebar with token counter, navigation tabs, stats
- driftBot chat interface with proper branding and "d" logo
- Share link functionality with copy-to-clipboard
- Recent showrooms list with type indicators
- Proper gradient buttons and #fe3500 accent colors throughout

### 🔧 Architecture Decisions Made

1. **Custom UI over Generic Components**: Chose to implement exact reference design instead of using generic Theysis C1Chat
2. **Preserved Theysis Integration**: Maintained backend API compatibility while customizing frontend
3. **LangGraph Service Design**: 4-node workflow architecture optimized for intent classification and data extraction
4. **Model Selection**: GPT-3.5 for routing/chat, Gemini for data extraction
5. **Container Ready**: Both services configured for Docker deployment

---

Remember: Snappy MCP tools are your primary interface to Xano. Context7 is your documentation source. Use both liberally throughout development.