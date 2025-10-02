
```markdown
# smartFARM v3 - Frontend PRD

## Mission
Build production-ready AI chat interface with RAG, Artifacts, and agricultural agent orchestration.

## Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** Shadcn/ui + Tailwind
- **AI:** Vercel AI SDK + Groq API
- **RAG:** LlamaIndex + PostgreSQL (pgvector)
- **Deploy:** Vercel

## Core Features

### 1. Chat Interface
- Clean chat UI (like Claude)
- Streaming responses
- Message history persistence
- Multi-model support (Groq models)

### 2. Artifacts System
- Render React components inline
- Code blocks with syntax highlighting
- Markdown rendering
- Copy/download functionality

### 3. RAG Engine
- Document upload (PDF, TXT, MD)
- Vector storage (PostgreSQL + pgvector)
- Context retrieval for responses
- Document management UI

### 4. Agent System
- Switchable agents (irrigation, pest, weather, etc.)
- Agent context injection
- System prompts per agent

## MVP Requirements

### Phase 1 (Setup) - 2 hours
- [ ] Next.js 15 project init
- [ ] Shadcn/ui installation
- [ ] Vercel AI SDK integration
- [ ] Basic chat component

### Phase 2 (AI) - 3 hours
- [ ] Groq API connection
- [ ] Streaming chat implementation
- [ ] Message state management
- [ ] Error handling

### Phase 3 (RAG) - 4 hours
- [ ] PostgreSQL + pgvector setup
- [ ] LlamaIndex integration
- [ ] Document upload endpoint
- [ ] Context retrieval in chat

### Phase 4 (Artifacts) - 3 hours
- [ ] Artifact renderer component
- [ ] Code/React/Markdown support
- [ ] Artifact state management

### Phase 5 (Agents) - 2 hours
- [ ] Agent selector UI
- [ ] System prompt injection
- [ ] Agent-specific context

## File Structure
```
smartfarm-v3/
├── app/
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── upload/route.ts
│   │   └── rag/route.ts
│   ├── page.tsx
│   └── layout.tsx
├── components/
│   ├── chat/
│   ├── artifacts/
│   ├── rag/
│   └── ui/ (shadcn)
├── lib/
│   ├── ai/
│   ├── rag/
│   └── db/
└── config/
```

## Environment Variables
```
GROQ_API_KEY=
DATABASE_URL=
PGVECTOR_CONNECTION=
```

## Success Metrics
- Chat responds in <2s
- RAG retrieval <500ms
- Artifacts render instantly
- Zero frontend crashes

## Out of Scope (v1)
- Authentication
- Multi-user support
- Voice input
- Mobile optimization
- Analytics dashboard

## Deploy Target
- Domain: smartfarm.autonomos.dev
- Platform: Vercel
- Database: Railway/Supabase PostgreSQL

---

**Deadline:** Functional MVP in 14 hours of dev time.
**Non-negotiable:** Must work. No half-built features.
```

Esto es todo lo que Claude Code necesita. **Start simple, execute fast.**
