# Excel Processing Technical Documentation

## Overview

SmartFarm includes a built-in Excel/CSV analysis tool (`sql_tool`) that enables natural language queries over uploaded data files using SQL and AI.

**Status:** ✅ Fully Operational (as of 2025-10-17)

---

## Architecture

### Component Stack

```
User uploads Excel → Open WebUI → sql_tool → DuckDB → LlamaIndex → Groq (SQL generation) → Results
                                                              ↘ OpenAI (embeddings)
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **SQL Generation** | Groq API (llama-3.3-70b-versatile) | Converts natural language to SQL queries (500-800 tokens/sec) |
| **Embeddings** | OpenAI API (text-embedding-3-small) | Required by LlamaIndex for semantic understanding |
| **Database** | DuckDB | In-memory SQL database for Excel data |
| **Query Engine** | LlamaIndex NLSQLTableQueryEngine | Orchestrates LLM + SQL execution |
| **Data Import** | pandas | Reads Excel/CSV files |

---

## Why Two API Keys?

### The Performance Fix (October 2025)

**Original Problem:**
- Tool was using OpenAI GPT-4 for SQL query generation
- Slow response times (30+ seconds for simple queries)
- Poor user experience

**Solution:**
- **Groq for SQL Generation:** Fast inference (500-800 tokens/sec)
- **OpenAI for Embeddings Only:** Required by LlamaIndex (Groq doesn't support embeddings)

**Result:**
- 10-20x faster SQL query generation
- Near-instant responses for typical queries
- Cost-effective (Groq free tier + minimal OpenAI embeddings usage)

### API Key Roles

```bash
# Required in .env file:
GROQ_API_KEY=gsk_xxxxx        # SQL query generation (primary workload)
OPENAI_API_KEY=sk-xxxxx       # Embeddings only (minimal usage)
```

**Cost Breakdown:**
- **Groq:** Free tier (generous limits) - handles 95% of workload
- **OpenAI:** Pay-per-use - only embeddings (~$0.0001 per query)

---

## Configuration

### 1. Environment Variables

Edit `/Users/autonomos_dev/Projects/smartFarm_v5/.env`:

```bash
# Both required for Excel tool
GROQ_API_KEY=gsk_your_groq_key_here
OPENAI_API_KEY=sk-your_openai_key_here
```

### 2. Docker Compose Configuration

The `docker-compose.yml` passes both API keys to the container:

```yaml
environment:
  - GROQ_API_KEY=${GROQ_API_KEY}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
```

**Why?** Open WebUI tools run inside the container and need access to these environment variables.

### 3. Tool Configuration (Database)

The tool is configured in the SQLite database (`/var/lib/docker/volumes/open-webui/_data/webui.db`):

**Key tables:**
- `tool` table: Contains tool code and configuration
  - `id`: `sql_tool`
  - `content`: Python code that runs the tool
  - `valves`: JSON with `OPENAI_API_KEY` and `DATABASE_PATH`

**Tool valves (user-configurable):**
```json
{
  "OPENAI_API_KEY": "sk-xxxxx",
  "OPENAI_MODEL": "gpt-4o-mini",
  "DATABASE_PATH": "/tmp/smartfarm_persistent.duckdb"
}
```

### 4. Required Dependencies

These Python packages must be installed in the Open WebUI container:

```bash
pip install llama-index-llms-groq
pip install llama-index-embeddings-openai
pip install duckdb pandas openpyxl
```

**Installation:** Packages are installed automatically when the tool is first used, or can be pre-installed in a custom Docker image.

---

## How It Works

### Step 1: File Upload

User uploads an Excel or CSV file through the chat interface.

**Detection Methods:**
1. **Primary:** `__files__` parameter in chat context (when file is attached)
2. **Fallback:** Query database for most recent uploaded file

```python
# Primary detection
file_path = __files__.get('file', {}).get('path')

# Fallback detection
if not file_path:
    cursor.execute("""
        SELECT name, data
        FROM file
        WHERE filename LIKE '%.xlsx' OR filename LIKE '%.csv'
        ORDER BY created_at DESC
        LIMIT 1
    """)
```

### Step 2: Data Import

pandas reads the file and imports to DuckDB:

```python
import pandas as pd
import duckdb

# Read Excel/CSV
df = pd.read_excel(file_path)

# Sanitize column names
df.columns = [col.replace(' ', '_').replace('-', '_') for col in df.columns]

# Import to DuckDB
conn = duckdb.connect(DATABASE_PATH)
conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM df")
```

**Database Location:** `/tmp/smartfarm_persistent.duckdb` (persists across queries within same session)

### Step 3: SQL Query Generation

LlamaIndex + Groq generate SQL from natural language:

```python
from llama_index.llms.groq import Groq
from llama_index.core.indices.struct_store import NLSQLTableQueryEngine

# Initialize Groq LLM
llm = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0.1,
)

# Create query engine
query_engine = NLSQLTableQueryEngine(
    sql_database=sql_database,
    llm=llm,
    tables=[table_name],
)

# Generate and execute SQL
response = query_engine.query(user_question)
```

**Why Groq?**
- Fast inference (500-800 tokens/sec vs 20-40 for OpenAI)
- Reduces query time from 30+ seconds to 2-5 seconds

### Step 4: Embeddings (Background)

OpenAI handles embeddings for semantic understanding:

```python
# Set globally for LlamaIndex
os.environ["OPENAI_API_KEY"] = openai_key

# LlamaIndex uses OpenAI embeddings by default
# This happens automatically in the background
```

**Usage:** Minimal - only for schema understanding, not for every query.

### Step 5: Results

DuckDB executes the SQL and returns results:

```python
sql_query = response.metadata["sql_query"]
results = conn.execute(sql_query).fetchdf()

# Format for display
return f"""
✅ Análisis completado

**Consulta SQL:**
```sql
{sql_query}
```

**Resultados:**
{results.to_markdown()}
"""
```

---

## Example Usage

### Upload and Analyze

**User:** [uploads `jb_pesos.xlsx`] "¿Cuál es el peso promedio de los machos?"

**Tool Processing:**
1. Detects file: `jb_pesos.xlsx` (157 KB, 2280 rows)
2. Imports to DuckDB table: `jb_pesos`
3. Groq generates SQL:
   ```sql
   SELECT AVG("Peso_Actual") as peso_promedio
   FROM jb_pesos
   WHERE "Sexo" = 'Macho'
   ```
4. DuckDB executes query
5. Returns: "237.32 kg"

**Response Time:** ~3 seconds (was 30+ seconds before Groq optimization)

### Complex Queries

**User:** "Muéstrame un resumen estadístico por sexo"

**Generated SQL:**
```sql
SELECT
    "Sexo",
    COUNT(*) as total_animales,
    AVG("Peso_Actual") as peso_promedio,
    MIN("Peso_Actual") as peso_minimo,
    MAX("Peso_Actual") as peso_maximo,
    STDDEV("Peso_Actual") as desviacion_estandar
FROM jb_pesos
GROUP BY "Sexo"
```

**Results:**
| Sexo | total_animales | peso_promedio | peso_minimo | peso_maximo | desviacion_estandar |
|------|----------------|---------------|-------------|-------------|---------------------|
| Macho | 1140 | 237.32 | 152 | 440 | 45.67 |
| Hembra | 1140 | 224.98 | 148 | 401 | 42.13 |

---

## Troubleshooting

### Tool Not Working

**Symptoms:** Tool fails with API key error

**Check:**
```bash
# Verify environment variables
docker exec -it open-webui env | grep -E "GROQ_API_KEY|OPENAI_API_KEY"

# Both should show actual keys, not empty
```

**Fix:**
```bash
# Update .env file
nano .env

# Restart container
docker-compose restart
```

### Slow Performance

**Symptoms:** Queries take 30+ seconds

**Likely Causes:**
1. Using OpenAI for SQL generation instead of Groq
2. Network latency
3. Large dataset

**Check Configuration:**
```bash
# Verify Groq is being used
docker logs open-webui | grep -i groq

# Should see Groq API calls, not OpenAI
```

**Fix:** Ensure tool code uses Groq for SQL generation:
```python
# Correct (uses Groq)
from llama_index.llms.groq import Groq
llm = Groq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.3-70b-versatile")

# Wrong (uses OpenAI, slow)
from llama_index.llms.openai import OpenAI
llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
```

### Missing Dependencies

**Symptoms:** ImportError when running tool

**Error Messages:**
```
ModuleNotFoundError: No module named 'llama_index.llms.groq'
ModuleNotFoundError: No module named 'llama_index.embeddings.openai'
```

**Fix:**
```bash
# Enter container
docker exec -it open-webui bash

# Install dependencies
pip install llama-index-llms-groq
pip install llama-index-embeddings-openai

# Exit and restart
exit
docker restart open-webui
```

### File Not Detected

**Symptoms:** "No file uploaded" error

**Causes:**
1. File not attached to message
2. Fallback detection failed

**Fix:**
- Ensure file is attached via paperclip icon in chat interface
- Check file is actually uploaded: Admin Panel → Files
- Verify file format is .xlsx or .csv

### DuckDB Errors

**Symptoms:** SQL execution fails

**Common Errors:**
```
duckdb.Error: Catalog Error: Table "table_name" does not exist
duckdb.Error: Binder Error: column "Column Name" does not exist
```

**Causes:**
- Column names with spaces (not sanitized)
- Table name mismatch
- File not imported correctly

**Fix:**
- Tool automatically sanitizes column names (spaces → underscores)
- Check import logs: `docker logs open-webui | grep "Import successful"`

---

## Performance Optimization

### Current Configuration

**Optimized for:**
- Fast SQL generation (Groq)
- Minimal API costs (free Groq tier + minimal OpenAI embeddings)
- Good accuracy (llama-3.3-70b-versatile)

**Typical Performance:**
- Simple query (SELECT with WHERE): 2-3 seconds
- Complex query (GROUP BY, aggregations): 3-5 seconds
- Very complex (multiple JOINs): 5-10 seconds

### Alternative Configurations

#### 1. Maximum Speed (Groq Fast Model)

```python
llm = Groq(
    api_key=groq_key,
    model="llama-3.1-8b-instant",  # Faster but less accurate
    temperature=0.1,
)
```

**Tradeoff:** Faster (1-2 sec) but may generate incorrect SQL for complex queries

#### 2. Maximum Accuracy (OpenAI GPT-4)

```python
from llama_index.llms.openai import OpenAI
llm = OpenAI(
    api_key=openai_key,
    model="gpt-4o",  # Most accurate
    temperature=0.1,
)
```

**Tradeoff:** Better SQL generation but 10x slower and more expensive

#### 3. Recommended (Current)

```python
llm = Groq(
    api_key=groq_key,
    model="llama-3.3-70b-versatile",  # Best balance
    temperature=0.1,
)
```

**Why:** Fast enough (2-5 sec) with excellent accuracy for typical queries

---

## Security Considerations

### API Keys

**Best Practices:**
- Store keys in `.env` file (gitignored)
- Never commit keys to version control
- Use read-only keys when possible
- Rotate keys periodically

**GitHub Secret Scanning:**
- Enabled on repository
- Automatically detects accidental commits
- Sends alerts if keys are found

### Data Privacy

**File Storage:**
- Files uploaded via chat are stored in Open WebUI database
- Temporary DuckDB database in `/tmp` (ephemeral)
- Data not sent to external services except API providers

**API Data Processing:**
- **Groq:** Receives SQL queries and schema information
- **OpenAI:** Receives schema for embeddings only
- **Both:** Do not receive raw data rows (privacy-friendly)

### Access Control

**Tool Access:**
- Tool is linked to specific models (e.g., "Gerente de Operaciones")
- Only users with access to those models can use the tool
- First user = admin (control tool availability)

---

## Development Notes

### Code Location

The tool code is stored in the SQLite database:

```bash
# Extract tool code
docker exec -it open-webui sqlite3 /app/backend/data/webui.db \
  "SELECT content FROM tool WHERE id='sql_tool'" > sql_tool.py
```

### Updating Tool Code

**Method 1: Via UI (Recommended)**
1. Admin Panel → Tools → sql_tool → Edit
2. Modify code in text editor
3. Save

**Method 2: Via SQL Script**
```python
import sqlite3
from datetime import datetime

conn = sqlite3.connect('/app/backend/data/webui.db')
cursor = conn.cursor()

# Read new code
with open('sql_tool.py', 'r') as f:
    new_code = f.read()

# Update tool
cursor.execute(
    "UPDATE tool SET content = ?, updated_at = ? WHERE id = 'sql_tool'",
    (new_code, int(datetime.now().timestamp()))
)
conn.commit()
conn.close()
```

**IMPORTANT:** Always backup database before modifying tool code:
```bash
./scripts/backup.sh
```

### Model Configuration

The tool is linked to models via `model.meta.toolIds`:

```sql
-- View models using sql_tool
SELECT id, name, json_extract(meta, '$.toolIds')
FROM model
WHERE json_extract(meta, '$.toolIds') LIKE '%sql_tool%';

-- Link tool to model
UPDATE model
SET meta = json_set(meta, '$.toolIds', json('["sql_tool"]'))
WHERE id = 'llama-3.3-70b-versatile';
```

**Common Mistake:** Setting `toolIds` in `params` instead of `meta`
- ❌ `model.params.toolIds` (wrong, causes errors)
- ✅ `model.meta.toolIds` (correct location)

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Both API keys configured in production `.env`
- [ ] Environment variables passed in `docker-compose.yml`
- [ ] Tool tested locally with real data
- [ ] Dependencies verified in container
- [ ] Backup created before deployment

### CI/CD Considerations

**GitHub Actions:**
- API keys stored as GitHub Secrets
- Deployed via environment variables
- Health checks verify tool functionality

**Deployment Command:**
```bash
# Automatically triggered on push to main
git push origin main

# Manual trigger
gh workflow run deploy-production.yml --repo AutonomosCdM/smartFarm
```

### Monitoring

**Check Tool Status:**
```bash
# View tool execution logs
docker logs open-webui | grep sql_tool

# Check for errors
docker logs open-webui | grep -i "error\|exception" | grep sql_tool

# Monitor API usage
# Groq: https://console.groq.com/usage
# OpenAI: https://platform.openai.com/usage
```

---

## Cost Analysis

### Groq API (Free Tier)

**Limits:**
- ~30 requests/minute
- ~6,000 tokens/minute

**Typical Usage:**
- SQL generation: 500-1,000 tokens per query
- ~6-12 queries per minute before hitting limits

**Cost:** $0 (generous free tier)

### OpenAI API (Pay-per-use)

**Embeddings Pricing:**
- text-embedding-3-small: $0.00002 per 1K tokens

**Typical Usage:**
- Schema embedding: ~500 tokens (one-time per file)
- Cost per file: ~$0.00001

**Monthly Cost Estimate:**
- 1,000 files analyzed: ~$0.01
- Essentially free for typical usage

### Total Cost

**Free Tier:** $0/month for typical usage (< 30 queries/min)

**Paid Tier (if needed):**
- Groq: ~$0.10-0.27 per 1M tokens
- OpenAI embeddings: ~$0.02 per 1M tokens
- Total: ~$1-5/month for heavy usage (1000s of queries)

**Comparison to OpenAI-only:**
- Using GPT-4o for SQL generation: ~$2.50 per 1M tokens (input)
- 10x more expensive + 10x slower
- Current hybrid approach is optimal

---

## Future Improvements

### Short-term (Next Release)

- [ ] Add support for multi-table queries (JOINs)
- [ ] Implement query caching for repeated questions
- [ ] Add visualization generation (charts/graphs)
- [ ] Support for more file formats (Parquet, JSON)

### Medium-term

- [ ] Persistent DuckDB database (across sessions)
- [ ] Query history and favoriting
- [ ] Export results to Excel/CSV
- [ ] Scheduled data imports

### Long-term

- [ ] Natural language data insights (automated analysis)
- [ ] Integration with external data sources (APIs)
- [ ] Real-time data updates
- [ ] Multi-user collaboration on datasets

---

## Related Documentation

- **Main Configuration:** [CLAUDE.md](/Users/autonomos_dev/Projects/smartFarm_v5/CLAUDE.md)
- **Groq Setup:** [GROQ_CONFIGURATION.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/GROQ_CONFIGURATION.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/TROUBLESHOOTING.md)
- **Production Deployment:** [PRODUCTION_DEPLOYMENT.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/PRODUCTION_DEPLOYMENT.md)

---

## Changelog

### 2025-10-17: Performance Optimization
- **Changed:** SQL generation from OpenAI to Groq
- **Result:** 10-20x faster query execution
- **Added:** Hybrid API approach (Groq + OpenAI)
- **Fixed:** Slow response times (30+ sec → 2-5 sec)

### 2025-10-16: Initial Implementation
- **Added:** Basic Excel/CSV upload and analysis
- **Added:** DuckDB integration
- **Added:** LlamaIndex query engine
- **Status:** Functional but slow (OpenAI-only)
