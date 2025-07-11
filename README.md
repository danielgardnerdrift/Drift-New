# Drift Migration Project

> Migration from n8n to LangGraph + Theysis for the Drift SaaS application

## 🚀 Quick Start

```bash
# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies  
cd ../backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Add API keys (REQUIRED)
echo "OPENAI_API_KEY=your_key" >> .env
echo "GOOGLE_AI_API_KEY=your_key" >> .env

# Start services
cd ../frontend && npm run dev        # Terminal 1 - Frontend (:3000)
cd ../backend && uvicorn src.main:app --reload  # Terminal 2 - Backend (:8000)
```

## 📐 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│    Xano     │────▶│  LangGraph   │────▶│    Xano     │
│  Custom UI  │     │ /chat/msg   │     │   Service    │     │ /webhook    │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

- **Frontend**: Next.js 14 with custom Drift-branded UI
- **Backend**: FastAPI + LangGraph for workflow processing  
- **External**: Xano backend (unchanged from current system)

## 🎨 Features

### Frontend
- Custom Mission Control dashboard
- driftBot chat interface with streaming responses
- Token tracking and management (66 tokens display)
- Share link functionality with rewards
- Showroom engagement statistics
- Brand colors: #fe3500 (Drift orange)

### Backend
- 4-node LangGraph workflow (intent → extract → respond → next)
- GPT-3.5 for routing, Gemini for data extraction
- FastAPI with async support
- Docker-ready deployment

## 📁 Project Structure

```
drift-migration/
├── frontend/               # Next.js application
│   ├── app/
│   │   ├── components/    # React components
│   │   └── api/          # API routes
│   └── lib/              # Utilities & types
├── backend/               # LangGraph service
│   ├── src/
│   │   ├── workflows/    # LangGraph workflows
│   │   └── models/       # Pydantic schemas
│   └── main.py          # FastAPI app
├── reference-docs/       # Xano API documentation
├── claude-reference-files/ # Design references
└── n8n/                  # Legacy workflow (reference)
```

## 🔧 Configuration

### Environment Variables

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_XANO_API_URL=https://api.autosnap.cloud/api:MKPwDskM
NEXT_PUBLIC_XANO_AUTH_URL=https://api.autosnap.cloud/api:NUevH7Yk
```

**Backend** (`.env`):
```env
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key  
XANO_WEBHOOK_URL=https://api.autosnap.cloud/api:owKhF9pX/webhook/data_collection_n8n
PORT=8000
```

## 🧪 Testing

```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend build
cd frontend && npm run build

# Test chat flow (with both services running)
# Visit http://localhost:3000 and send a message
```

## 📊 Progress

- ✅ Task 1: Setup Next.js Frontend with Theysis
- ✅ Task 2: Setup LangGraph Python Service
- 🔄 Task 3: Implement Xano API Client
- ⏳ Tasks 4-15: Remaining implementation

## 🤝 Contributing

1. Check `.taskmaster/tasks/` for current tasks
2. Update task status using Taskmaster
3. Follow existing code patterns
4. Test changes before committing

## 📝 Documentation

- **Architecture**: See `CLAUDE.md` for detailed guidelines
- **API Reference**: Check `reference-docs/` directory
- **Design Specs**: See `claude-reference-files/`
- **Session Notes**: Check `.claude/` directory

## 🐛 Known Issues

- ESLint warnings in frontend (temporarily disabled)
- TypeScript `any` types need cleanup
- Integration testing pending

## 📞 Support

For questions or issues:
1. Check `.claude/QUICK_START.md` for common solutions
2. Review `.claude/knowledge-base.md` for patterns
3. See `.claude/action-items.md` for current priorities

---

**License**: Proprietary  
**Status**: In Development (13% complete - 2/15 tasks)