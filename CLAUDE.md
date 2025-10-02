# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
smartFARM v3 is a production-ready AI chat interface for agricultural applications with RAG (Retrieval-Augmented Generation), Artifacts rendering, and agent orchestration.

**Target:** Functional MVP in 14 hours of dev time.
**Non-negotiable:** Must work. No half-built features.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** Shadcn/ui + Tailwind CSS
- **AI:** Vercel AI SDK + Groq API
- **RAG:** LlamaIndex + PostgreSQL (pgvector)
- **Deployment:** Vercel (smartfarm.autonomos.dev)

## Development Commands

### Initial Setup
```bash
# Create Next.js 15 project
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install Shadcn/ui
npx shadcn@latest init

# Install AI dependencies
npm install ai @ai-sdk/groq llamaindex

# Install database dependencies
npm install pg pgvector
```

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Architecture

### Core Systems

#### 1. Chat Interface (`/components/chat/`)
- Streaming responses using Vercel AI SDK's `useChat` hook
- Message persistence in state (local storage or database)
- Multi-model support (Groq: llama3-70b, mixtral-8x7b, etc.)
- Clean, Claude-like UI with message bubbles

#### 2. Artifacts System (`/components/artifacts/`)
- Render React components inline from AI responses
- Support: React/JSX, code blocks with syntax highlighting, Markdown
- Artifact types determined by AI response metadata
- Copy/download functionality for generated artifacts

#### 3. RAG Engine (`/lib/rag/`)
- Document upload: PDF, TXT, MD formats
- LlamaIndex for document processing and embedding
- PostgreSQL with pgvector extension for vector storage
- Context retrieval pipeline: query → embedding → vector search → context injection

#### 4. Agent System (`/lib/ai/`)
- Switchable agents: irrigation, pest control, weather, crop management
- Agent-specific system prompts injected per conversation
- Context switching without losing conversation history

### API Routes (`/app/api/`)

#### `/api/chat/route.ts`
- POST: Handle streaming chat with Groq
- Inject RAG context if documents available
- Apply agent-specific system prompts
- Return streaming text responses

#### `/api/upload/route.ts`
- POST: Accept document uploads
- Process with LlamaIndex
- Store embeddings in pgvector
- Return document metadata

#### `/api/rag/route.ts`
- POST: Query vector store for relevant context
- Return top-k relevant document chunks
- Used internally by chat endpoint

### Database Schema
```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Documents table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  filename TEXT,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

## Development Workflow

### Phase Order (from PRD)
1. **Setup** (2h): Next.js + Shadcn + Vercel AI SDK + basic chat
2. **AI** (3h): Groq integration + streaming + state management
3. **RAG** (4h): PostgreSQL + pgvector + LlamaIndex + document upload
4. **Artifacts** (3h): Renderer component + type detection + state
5. **Agents** (2h): Selector UI + prompt injection + context

### Key Implementation Notes

#### Streaming Chat Pattern
```typescript
// Use Vercel AI SDK's streamText with Groq provider
import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

// In route.ts
const result = await streamText({
  model: groq('llama-3.1-70b-versatile'),
  messages,
  system: agentSystemPrompt + ragContext,
});

return result.toDataStreamResponse();
```

#### RAG Context Injection
- Query embedding generated from user message
- Top-3 relevant chunks retrieved from pgvector
- Injected into system prompt: `"Context: {chunks}\n\nUser question: {message}"`
- Keep retrieval < 500ms (performance requirement)

#### Artifact Detection
- AI response includes artifact metadata (type, language, code)
- Parse and render based on type:
  - `react`: Render as live React component
  - `code`: Syntax-highlighted code block
  - `markdown`: Rendered Markdown

## Environment Variables
```
GROQ_API_KEY=           # Groq API key for AI models
DATABASE_URL=           # PostgreSQL connection string
PGVECTOR_CONNECTION=    # PostgreSQL with pgvector (may be same as DATABASE_URL)
```

## Performance Requirements
- Chat response: < 2s
- RAG retrieval: < 500ms
- Artifacts: instant render
- Zero frontend crashes

## Out of Scope for MVP
- Authentication/multi-user
- Voice input
- Mobile optimization
- Analytics dashboard

## Deployment
- Platform: Vercel
- Database: Railway or Supabase PostgreSQL with pgvector
- Domain: smartfarm.autonomos.dev
- Deploy command: `vercel --prod`
