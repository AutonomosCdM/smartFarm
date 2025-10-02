# smartFARM v3 Quick Start Guide

Get smartFARM running on your local machine in 5 minutes.

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 20+** ([Download](https://nodejs.org))
- **PostgreSQL 14+** with pgvector extension ([Download](https://www.postgresql.org/download/))
- **Groq API Key** ([Get Free Key](https://console.groq.com))

Check your versions:
```bash
node --version   # Should be v20.x or higher
npm --version    # Should be v10.x or higher
psql --version   # Should be v14.x or higher
```

---

## 5-Minute Setup

### 1. Clone and Install (1 minute)

```bash
# Clone repository
cd /Users/autonomos_dev/Projects/smartfarm-v4

# Install dependencies
npm install
```

### 2. Setup Database (2 minutes)

**Option A: Local PostgreSQL**

```bash
# Create database
createdb smartfarm

# Enable pgvector extension
psql smartfarm -c "CREATE EXTENSION vector;"

# Initialize schema
npm run db:init
```

**Option B: Use Railway (Cloud)**

```bash
# 1. Go to https://railway.app
# 2. Create new project → Deploy PostgreSQL
# 3. Copy DATABASE_URL from Railway dashboard
# 4. Skip to step 3 below
```

### 3. Configure Environment Variables (1 minute)

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

Add your credentials:
```bash
# Get this from https://console.groq.com/keys
GROQ_API_KEY=gsk_your_actual_key_here

# Local: postgresql://postgres:password@localhost:5432/smartfarm
# Railway: Copy from Railway dashboard
DATABASE_URL=postgresql://user:password@host:5432/smartfarm
```

### 4. Start Development Server (1 minute)

```bash
npm run dev
```

Open browser to: **http://localhost:3000**

**You should see the chat interface.**

---

## Quick Test

Once the app is running:

1. **Test Basic Chat:**
   - Type: "What is crop rotation?"
   - Press Enter or click Send
   - You should see a streaming response about crop rotation

2. **Test Agent Switching:**
   - Click agent dropdown in top right
   - Select "Irrigation Expert"
   - Ask: "How much water for tomatoes?"
   - Response should be irrigation-focused

3. **Test Document Upload (Optional):**
   - Click "Upload Document" button
   - Upload a PDF or TXT file about agriculture
   - Ask a question about the document content
   - Response should include context from your document

---

## Project Structure

```
smartfarm-v4/
├── app/                    # Next.js 15 App Router
│   ├── page.tsx           # Main chat page
│   ├── layout.tsx         # Root layout
│   └── api/               # API routes
│       ├── chat/          # Chat endpoint
│       ├── upload/        # Document upload
│       └── rag/           # RAG query
├── components/            # React components
│   ├── chat/             # Chat UI components
│   ├── artifacts/        # Artifact renderers
│   ├── rag/              # RAG components
│   └── ui/               # Shadcn/ui components
├── lib/                   # Core logic
│   ├── ai/               # AI and agent logic
│   ├── rag/              # RAG system
│   └── db/               # Database client
├── scripts/              # Utility scripts
│   └── init-db.ts        # Database initialization
├── .env.local            # Local environment variables (YOU CREATE THIS)
└── package.json          # Dependencies and scripts
```

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:init          # Initialize database schema

# Deployment
vercel                   # Deploy to Vercel (requires Vercel CLI)
```

---

## Troubleshooting

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "GROQ_API_KEY is not defined"

**Solution:**
1. Make sure you created `.env.local` (not `.env`)
2. Restart dev server after adding environment variables
3. Check that your API key starts with `gsk_`

```bash
# Verify environment variables are loaded
cat .env.local
# Restart dev server
npm run dev
```

### Issue: Database connection error

**Solution:**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# If connection fails, check:
# 1. Database is running
# 2. DATABASE_URL format is correct
# 3. Database exists
# 4. pgvector extension is enabled

# Enable pgvector if missing
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Issue: "Port 3000 is already in use"

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### Issue: Build fails with TypeScript errors

**Solution:**
```bash
# Check TypeScript errors
npx tsc --noEmit

# Common fix: Update imports
# Make sure all imports have .ts/.tsx extensions in your code
```

### Issue: Chat responses are slow (> 5 seconds)

**Solution:**
1. Check Groq API status: https://status.groq.com
2. Try different model in `/lib/ai/agents.ts`
3. Check your internet connection
4. Verify DATABASE_URL if using RAG (slow queries)

### Issue: Document upload fails

**Solution:**
1. Check file size (< 10MB)
2. Verify file format (PDF, TXT, MD only)
3. Check database connection
4. Verify pgvector extension is enabled

```bash
# Test database
psql $DATABASE_URL -c "\dx"  # Should list 'vector' extension
psql $DATABASE_URL -c "\dt"  # Should show 'documents' table
```

---

## Next Steps

### For Development
1. Read `CLAUDE.md` for architecture details
2. Review `MVP_STATUS.md` for feature inventory
3. Check `INTEGRATION_SUMMARY.md` for implementation notes

### For Deployment
1. Read `DEPLOYMENT.md` for production deployment
2. Set up Railway or Supabase database
3. Deploy to Vercel
4. Configure custom domain

### For Customization
1. **Add New Agent:**
   - Edit `/lib/ai/agents.ts`
   - Add new agent definition with system prompt
   - Agent appears in dropdown automatically

2. **Change AI Model:**
   - Edit `/lib/ai/agents.ts`
   - Update `modelId` in agent config
   - Available models: https://console.groq.com/docs/models

3. **Customize UI:**
   - All styles in Tailwind CSS
   - Edit components in `/components/`
   - Main colors in `tailwind.config.ts`

4. **Add New Document Type:**
   - Edit `/lib/rag/document-processor.ts`
   - Add parser for new file format
   - Update upload validation in `/app/api/upload/route.ts`

---

## Getting Help

### Documentation
- **Architecture:** `CLAUDE.md`
- **Features:** `MVP_STATUS.md`
- **Deployment:** `DEPLOYMENT.md`
- **RAG System:** `RAG_QUICKSTART.md`
- **Agents:** `AGENT_SYSTEM_SUMMARY.md`
- **Artifacts:** `ARTIFACTS_SUMMARY.md`

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [LlamaIndex Docs](https://docs.llamaindex.ai)
- [Shadcn/ui Components](https://ui.shadcn.com)

### Common Questions

**Q: Can I use a different AI provider (OpenAI, Anthropic)?**

A: Yes. Replace `@ai-sdk/groq` with appropriate provider:
```bash
npm install @ai-sdk/openai
# Update imports in /app/api/chat/route.ts
```

**Q: How do I add authentication?**

A: Not included in MVP. Consider:
- NextAuth.js
- Clerk
- Auth0

**Q: Can I deploy to platforms other than Vercel?**

A: Yes, but requires additional configuration:
- **Railway:** Use Dockerfile
- **AWS/GCP:** Use Docker container
- **Netlify:** May require adapter

**Q: How do I persist chat history?**

A: Currently in-memory only. To persist:
1. Add `conversations` table to database
2. Save messages on each chat interaction
3. Load history on page load

**Q: How much does this cost to run?**

A: MVP costs (monthly):
- **Groq API:** Free tier (30 requests/min)
- **Railway Database:** Free tier (500MB)
- **Vercel Hosting:** Free tier (100GB bandwidth)

**Total: $0/month for low usage**

For production, expect ~$20-50/month with moderate usage.

---

## Development Workflow

### Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Edit files in `/app`, `/components`, or `/lib`
   - Dev server auto-reloads on save

3. **Test Locally**
   ```bash
   npm run dev
   # Test in browser
   ```

4. **Build Test**
   ```bash
   npm run build
   # Ensure no errors
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript:** Strict mode enabled
- **Formatting:** No prettier config (use default)
- **Linting:** ESLint with Next.js rules
- **Components:** Functional components with TypeScript
- **File naming:** kebab-case for files, PascalCase for components

---

## Performance Tips

1. **Faster Development Server:**
   ```bash
   # Already using Turbopack (default in Next.js 15)
   npm run dev --turbopack
   ```

2. **Reduce Bundle Size:**
   - Avoid importing entire libraries
   - Use dynamic imports for heavy components
   ```typescript
   const HeavyComponent = dynamic(() => import('./heavy-component'))
   ```

3. **Database Query Optimization:**
   - Add indexes for frequently queried columns
   - Use connection pooling (already configured)
   - Limit vector search to top-k results

4. **Faster AI Responses:**
   - Use smaller models for simple queries
   - Reduce max_tokens in API calls
   - Cache common responses (future enhancement)

---

## Tips and Tricks

### View Database Contents
```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# View documents
SELECT id, filename, created_at FROM documents;

# Count documents
SELECT COUNT(*) FROM documents;

# Exit psql
\q
```

### Clear Database
```bash
# Remove all documents
psql $DATABASE_URL -c "TRUNCATE TABLE documents;"

# Re-initialize schema
npm run db:init
```

### Monitor API Usage
```bash
# Groq API usage
# Visit https://console.groq.com/usage

# Database size (Railway)
# Visit Railway dashboard → PostgreSQL → Metrics
```

### Debug Mode
```typescript
// Add to any API route for verbose logging
console.log('Request:', await request.json())
console.log('Response:', responseData)

// Add to components for state debugging
console.log('Current state:', messages)
```

---

## What's Working

Based on the codebase analysis:

✅ **Confirmed Working:**
- Next.js 15 with App Router
- TypeScript configuration
- Tailwind CSS v4
- All UI components (Shadcn/ui)
- Chat interface structure
- AI integration code (Vercel AI SDK + Groq)
- RAG system implementation
- Artifact renderers
- Agent system
- Database schema and initialization
- API routes (chat, upload, rag)

⚠️ **Needs Testing:**
- End-to-end chat flow (requires API keys)
- Document upload with real files
- RAG context retrieval with actual database
- Artifact rendering in browser

🔧 **To Verify:**
1. Run build: `npm run build`
2. Start dev server: `npm run dev`
3. Test basic chat functionality

---

## Summary

**Minimum steps to get running:**

1. `npm install` (1 min)
2. Create `.env.local` with API keys (1 min)
3. `npm run db:init` (1 min)
4. `npm run dev` (1 min)
5. Open http://localhost:3000 (instant)

**Total: 5 minutes**

For deployment to production, see `DEPLOYMENT.md`.

For detailed feature documentation, see `MVP_STATUS.md`.

**Happy coding!**

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0 MVP
