# smartFARM v3 Deployment Guide

## Pre-Deployment Checklist

### 1. Code Readiness
- [ ] All TypeScript files compile without errors
- [ ] ESLint passes with no errors
- [ ] All imports resolve correctly
- [ ] Environment variables documented
- [ ] Build succeeds locally (`npm run build`)
- [ ] Git repository is clean or changes are committed

### 2. Database Preparation
- [ ] PostgreSQL database provisioned
- [ ] pgvector extension available
- [ ] Database URL obtained
- [ ] Database initialized with schema

### 3. API Keys & Secrets
- [ ] Groq API key obtained (https://console.groq.com)
- [ ] All environment variables documented in `.env.example`
- [ ] Secrets ready for deployment platform

---

## Environment Variables Setup

### Required Variables

```bash
# AI Provider (Groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database (PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:password@host:5432/smartfarm

# Optional: Separate connection for pgvector operations
PGVECTOR_CONNECTION=postgresql://user:password@host:5432/smartfarm

# Node Environment
NODE_ENV=production
```

### Get Your API Keys

#### Groq API Key
1. Visit https://console.groq.com
2. Sign up or log in
3. Navigate to API Keys section
4. Create new API key
5. Copy key (starts with `gsk_`)
6. **Important:** Key is shown only once - save it securely

#### Database Credentials
- See Database Deployment section below

---

## Database Deployment

### Option A: Railway (Recommended for MVP)

#### Why Railway?
- Free tier includes PostgreSQL with pgvector
- One-click PostgreSQL provisioning
- Automatic backups
- Easy environment variable injection
- Built-in monitoring

#### Setup Steps

1. **Create Railway Account**
   ```bash
   # Visit https://railway.app and sign up
   ```

2. **Provision PostgreSQL**
   - Click "New Project"
   - Select "Deploy PostgreSQL"
   - Wait for provisioning (1-2 minutes)

3. **Enable pgvector Extension**
   - Open database in Railway dashboard
   - Go to "Connect" tab
   - Click "Connect via psql" or use any PostgreSQL client
   - Run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

4. **Get Connection String**
   - In Railway dashboard, go to PostgreSQL service
   - Go to "Connect" tab
   - Copy "DATABASE_URL" (starts with `postgresql://`)
   - Format: `postgresql://postgres:password@host.railway.app:5432/railway`

5. **Initialize Database Schema**
   ```bash
   # Set DATABASE_URL in your local .env.local
   export DATABASE_URL="your-railway-database-url"

   # Run initialization script
   npm run db:init
   ```

6. **Verify Setup**
   ```sql
   -- Connect to database and verify
   \dx  -- Should show 'vector' extension
   \dt  -- Should show 'documents' table
   ```

### Option B: Supabase (Alternative)

#### Setup Steps

1. **Create Supabase Project**
   - Visit https://supabase.com
   - Create new project
   - Choose region close to your Vercel deployment
   - Wait for provisioning (~2 minutes)

2. **Enable pgvector**
   - Go to SQL Editor in Supabase dashboard
   - Run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Get Connection String**
   - Go to Project Settings → Database
   - Copy "Connection string" (Transaction or Session mode)
   - Add password to connection string

4. **Initialize Schema**
   ```bash
   export DATABASE_URL="your-supabase-connection-string"
   npm run db:init
   ```

### Option C: Self-Hosted PostgreSQL

Requirements:
- PostgreSQL 14+ with pgvector extension installed
- Public internet access or VPN to deployment platform
- SSL/TLS enabled (recommended)

```bash
# Install pgvector (example for Ubuntu/Debian)
sudo apt-get install postgresql-14-pgvector

# Create database
createdb smartfarm

# Enable extension
psql smartfarm -c "CREATE EXTENSION vector;"

# Initialize schema
export DATABASE_URL="postgresql://user:password@your-host:5432/smartfarm"
npm run db:init
```

---

## Vercel Deployment

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository with smartFARM code
- Database provisioned and initialized
- API keys ready

### Deployment Steps

#### 1. Install Vercel CLI (Optional but Recommended)
```bash
npm install -g vercel
vercel login
```

#### 2. Link Repository to Vercel

**Option A: Via Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select the repository: `smartfarm-v4`
4. Click "Import"

**Option B: Via CLI**
```bash
cd /Users/autonomos_dev/Projects/smartfarm-v4
vercel
# Follow prompts to link repository
```

#### 3. Configure Environment Variables

**Via Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable:
   - `GROQ_API_KEY`
   - `DATABASE_URL`
   - `NODE_ENV=production`
3. Select environments: Production, Preview, Development
4. Click "Save"

**Via CLI:**
```bash
# Add environment variables
vercel env add GROQ_API_KEY
vercel env add DATABASE_URL

# Verify
vercel env ls
```

#### 4. Deploy to Production

**Via CLI (Recommended for first deploy):**
```bash
# From project root
vercel --prod

# Follow prompts:
# - Confirm project settings
# - Wait for build (~2-3 minutes)
# - Get deployment URL
```

**Via Dashboard:**
1. Push code to GitHub main branch
2. Vercel auto-deploys
3. Monitor deployment in Vercel dashboard

#### 5. Custom Domain (Optional)

**Setup smartfarm.autonomos.dev:**

1. **In Vercel Dashboard:**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter: `smartfarm.autonomos.dev`

2. **In DNS Provider (autonomos.dev):**
   - Add CNAME record:
     ```
     Name: smartfarm
     Type: CNAME
     Value: cname.vercel-dns.com
     TTL: 3600
     ```
   - Or A record if apex domain:
     ```
     Name: smartfarm
     Type: A
     Value: 76.76.21.21
     ```

3. **Wait for DNS Propagation** (5-60 minutes)

4. **Verify SSL Certificate**
   - Vercel auto-provisions SSL via Let's Encrypt
   - Check in Domains tab for "Valid" status

---

## Build Configuration

### Vercel Build Settings

**Framework Preset:** Next.js

**Build Command:**
```bash
npm run build
```

**Output Directory:** `.next`

**Install Command:**
```bash
npm install
```

**Node Version:** 20.x (specified in package.json engines or .nvmrc)

### Environment-Specific Settings

#### Production
- Auto-deploy from `main` branch
- Environment: Production
- Domain: smartfarm.autonomos.dev

#### Preview
- Auto-deploy from feature branches
- Environment: Preview
- Domain: Auto-generated preview URLs

#### Development
- Local development only
- Not deployed to Vercel

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check deployment URL
curl https://smartfarm.autonomos.dev

# Should return Next.js page HTML
```

### 2. API Endpoints Test

```bash
# Test chat endpoint
curl -X POST https://smartfarm.autonomos.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Should return streaming response or JSON
```

### 3. Database Connectivity

```bash
# From Vercel deployment logs:
# Look for successful database connection messages
# No "ECONNREFUSED" or "authentication failed" errors
```

### 4. Browser Testing

Visit: https://smartfarm.autonomos.dev

**Test Checklist:**
- [ ] Page loads without errors
- [ ] Chat interface renders
- [ ] Can send message and get AI response
- [ ] Agent selector dropdown works
- [ ] Document upload button present
- [ ] No console errors in browser DevTools
- [ ] Streaming responses work (messages appear word-by-word)

### 5. Functional Testing

1. **Chat Functionality**
   - Send message: "What is crop rotation?"
   - Verify streaming response
   - Check response is relevant to agriculture

2. **Agent Switching**
   - Select "Irrigation Expert" from dropdown
   - Send message: "How much water for tomatoes?"
   - Verify response has irrigation context

3. **Document Upload (if RAG initialized)**
   - Upload test PDF document
   - Wait for processing confirmation
   - Ask question about uploaded document
   - Verify response uses document context

4. **Artifacts (if enabled)**
   - Ask: "Create a React component showing crop growth stages"
   - Verify artifact renders inline
   - Check copy/download buttons work

### 6. Performance Verification

```bash
# Check response times
time curl -X POST https://smartfarm.autonomos.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Test"}]}'

# Target: < 2 seconds for first token
```

### 7. Error Monitoring

**In Vercel Dashboard:**
- Navigate to Deployments → [Latest] → Logs
- Check for errors or warnings
- Monitor Real-time logs during testing

---

## Rollback Procedures

### Immediate Rollback (Production Down)

**Via Vercel Dashboard:**
1. Go to Deployments tab
2. Find last working deployment
3. Click "..." menu → "Promote to Production"
4. Confirm rollback
5. **Estimated time:** 30 seconds

**Via CLI:**
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Partial Rollback (Environment Variables)

```bash
# Revert environment variable
vercel env rm GROQ_API_KEY production
vercel env add GROQ_API_KEY production
# Enter old value

# Redeploy
vercel --prod
```

### Database Rollback

**If schema migration fails:**

```sql
-- Connect to database
psql $DATABASE_URL

-- Drop tables (CAUTION: destroys data)
DROP TABLE IF EXISTS documents;

-- Re-run initialization
\i scripts/init-schema.sql
```

**If data corrupted:**
1. Restore from Railway/Supabase automatic backup
2. Use backup from previous day
3. Re-initialize schema if needed

### Code Rollback

```bash
# Git revert to last working commit
git revert HEAD
git push origin main

# Vercel auto-deploys reverted code
```

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Vercel deployment status (green)
- [ ] Database connection healthy
- [ ] API response times < 2s
- [ ] No error rate spikes in logs

### Weekly Checks
- [ ] Review Vercel analytics
- [ ] Check database size (Railway free tier: 1GB limit)
- [ ] Update dependencies if security patches available
- [ ] Review and clear old preview deployments

### Monthly Checks
- [ ] Rotate API keys if policy requires
- [ ] Review Groq API usage and costs
- [ ] Database backup verification
- [ ] Load testing for performance regression

---

## Troubleshooting

### Build Failures

**Error: Module not found**
```bash
# Solution: Verify all dependencies installed
npm install
npm run build
```

**Error: TypeScript compilation errors**
```bash
# Solution: Check TypeScript errors
npx tsc --noEmit
# Fix errors in reported files
```

### Runtime Errors

**Error: GROQ_API_KEY not defined**
```bash
# Solution: Add environment variable in Vercel
vercel env add GROQ_API_KEY production
# Redeploy
```

**Error: Database connection refused**
```bash
# Solution: Check DATABASE_URL format
# Ensure database is publicly accessible
# Verify firewall rules allow Vercel IPs
# Test connection from local machine
psql $DATABASE_URL -c "SELECT 1;"
```

**Error: pgvector extension not found**
```sql
-- Solution: Enable extension in database
CREATE EXTENSION IF NOT EXISTS vector;
```

### Performance Issues

**Slow API responses**
1. Check Groq API status: https://status.groq.com
2. Verify database query performance
3. Check Vercel function logs for timeouts
4. Consider upgrading database tier if queries slow

**High database usage**
1. Review vector store size
2. Clean up old documents if needed
3. Add indexes to frequently queried columns

---

## Security Best Practices

### Environment Variables
- Never commit `.env.local` or `.env` files
- Use Vercel environment variables for secrets
- Rotate API keys periodically
- Use different keys for production vs preview

### Database
- Use SSL for database connections (Railway/Supabase default)
- Restrict database access to Vercel IPs if possible
- Regular backups (automated by Railway/Supabase)
- Use strong passwords (generated by platform)

### API Keys
- Store in Vercel environment variables only
- Never expose in client-side code
- Monitor usage for suspicious activity
- Set usage limits in Groq dashboard

---

## Support & Resources

### Documentation Links
- [Vercel Deployment Docs](https://vercel.com/docs)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)
- [Groq API Documentation](https://console.groq.com/docs)
- [Next.js 15 Deployment](https://nextjs.org/docs/deployment)

### Get Help
- Vercel Support: https://vercel.com/support
- Railway Discord: https://discord.gg/railway
- Groq Community: https://console.groq.com/support

### Emergency Contacts
- **Critical Production Issues:** Use rollback procedures immediately
- **Database Issues:** Check Railway/Supabase status pages
- **API Issues:** Check Groq status page

---

## Deployment Timeline

### Initial Deployment (First Time)
1. Database setup: 10-15 minutes
2. Vercel project setup: 5 minutes
3. Environment variables: 5 minutes
4. First deployment: 3-5 minutes
5. DNS propagation (if custom domain): 5-60 minutes
6. Testing and verification: 10-15 minutes

**Total: 40-100 minutes**

### Subsequent Deployments
1. Code push to GitHub: 1 minute
2. Vercel auto-build: 2-3 minutes
3. Auto-deploy: 30 seconds
4. Verification: 2-5 minutes

**Total: 5-10 minutes per deployment**

---

## Success Criteria

Deployment is successful when:
- [ ] Production URL loads without errors
- [ ] Chat interface functional
- [ ] AI responses streaming correctly
- [ ] Database queries succeeding
- [ ] No critical errors in logs
- [ ] Response times meet SLA (< 2s for chat)
- [ ] All API endpoints returning expected responses
- [ ] SSL certificate valid
- [ ] Custom domain resolving (if configured)

---

**Last Updated:** 2025-10-01
**Version:** 1.0.0
**Deployment Platform:** Vercel + Railway/Supabase
