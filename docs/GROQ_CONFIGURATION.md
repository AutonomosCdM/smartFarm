# Groq API Configuration for Open WebUI

## 🚀 Quick Setup

### Prerequisites

1. Create a Groq account at [console.groq.com](https://console.groq.com)
2. Generate an API key at [console.groq.com/keys](https://console.groq.com/keys)
3. (Optional but recommended) Get OpenAI API key for Excel tool at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
4. Add both API keys to your `.env` file

---

## ⚙️ Configuration Steps

### Step 1: Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your API keys
# GROQ_API_KEY=your_actual_groq_api_key_here
# OPENAI_API_KEY=your_actual_openai_api_key_here  # Optional, for Excel tool
```

**Note:** OpenAI API key is optional but required for Excel file analysis. See [EXCEL_PROCESSING.md](EXCEL_PROCESSING.md) for details.

### Step 2: Access Open WebUI

**Local Installation:**
1. Open http://localhost:3001 in your browser

**Production Instance:**
1. Open https://smartfarm.autonomos.dev in your browser

2. Create your account (first user becomes administrator automatically)

### Step 3: Configure Groq API in UI

**IMPORTANT**: Groq must be configured through the web interface, not just the `.env` file.

1. Click on your **Settings** icon (⚙️) in the top right corner
2. Go to **Connections** section
3. Under **OpenAI API**, click to add a new connection
4. Fill in the details:
   - **API Base URL**: `https://api.groq.com/openai/v1`
   - **API Key**: `gsk_YOUR_GROQ_API_KEY_HERE`
5. Click **Save**

### Step 4: Verify Connection

1. Go back to the main chat interface
2. Click on **"Select a model"** dropdown
3. You should see Groq models listed (llama-3.3-70b-versatile, etc.)
4. Select a model and start chatting!

---

## 🤖 Available Models

### Recommended for SmartFarm

| Model | Context | Best For |
|-------|---------|----------|
| **llama-3.3-70b-versatile** | 131K | Best balance of speed/quality |
| **groq/compound** | 131K | Groq-optimized performance |
| **deepseek-r1-distill-llama-70b** | 131K | Advanced reasoning |
| **llama-3.1-8b-instant** | 131K | Fast, simple tasks |

### Specialized Models

- **whisper-large-v3** / **whisper-large-v3-turbo** - Audio transcription
- **playai-tts** / **playai-tts-arabic** - Text-to-Speech
- **meta-llama/llama-guard-4-12b** - Content moderation
- **qwen/qwen3-32b** - Multilingual model (Alibaba)
- **moonshotai/kimi-k2-instruct** - Ultra-long context (262K tokens)
- **gemma2-9b-it** - Lightweight alternative (Google)
- **groq/compound-mini** - Faster compound version

[View complete model list →](MODELS.md)

---

## ✅ Verification

### Verify API Key Works

```bash
# Load environment variables
source .env

# List available models
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Test chat completion
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello!"}],
    "temperature": 0.7,
    "max_tokens": 100
  }'
```

---

## 🚀 Why Use Groq?

### Speed

- **500-800 tokens/second** - One of the fastest inference APIs
- Near-instant responses even with large models

### Model Selection

- **20+ models** including Llama 3.3, DeepSeek R1, Gemma, Qwen
- Audio support (Whisper) and TTS (PlayAI)
- Long contexts (up to 262K tokens with Kimi)

### Cost

- Generous free tier for development
- Competitive pricing for production

### Compatibility

- 100% OpenAI API compatible
- Easy migration to/from OpenAI
- Works alongside OpenAI (hybrid approach for Excel tool)

---

## 🧮 Excel Processing

SmartFarm uses a **hybrid approach** for Excel file analysis:

- **Groq API:** Fast SQL query generation (500-800 tokens/sec)
- **OpenAI API:** Embeddings only (required by LlamaIndex)

**Why both?**
- Groq is 10-20x faster for SQL generation
- OpenAI embeddings required by LlamaIndex (Groq doesn't support embeddings yet)
- Best of both worlds: speed + functionality

**Setup:**
```bash
# Both keys required for Excel tool
GROQ_API_KEY=gsk_xxxxx
OPENAI_API_KEY=sk-xxxxx
```

**See:** [EXCEL_PROCESSING.md](EXCEL_PROCESSING.md) for technical details.

---

## ⚠️ Limits and Considerations

### Rate Limits (Free Tier)

- Check [console.groq.com/settings/limits](https://console.groq.com/settings/limits)
- Typically: ~30 requests/minute, ~6000 tokens/minute

### Context Windows

- Varies by model (4K to 262K tokens)
- Check limits in `/models` response

### Model Catalog

Groq updates its catalog regularly. For the latest list:

```bash
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | jq '.data[].id'
```

---

## 🔒 Security

### API Key Protection

⚠️ **IMPORTANT**:

- API key is stored in `.env` - ensure this file is in `.gitignore`
- **Never commit** API keys to version control
- **Never share** API keys publicly
- **Regenerate** the key at [console.groq.com/keys](https://console.groq.com/keys) if compromised

### Best Practices

```bash
# Verify .env is gitignored
cat .gitignore | grep ".env"

# Check for accidentally committed secrets
git secrets --scan-history
```

---

## 🐛 Troubleshooting

### "Connection Failed" in Open WebUI

1. Verify API key is correct in `.env`
2. Confirm URL is `https://api.groq.com/openai/v1` (no trailing slash)
3. Check container logs: `docker logs open-webui`
4. Verify API key is active at [console.groq.com/keys](https://console.groq.com/keys)

### "Rate Limit Exceeded"

- Wait 60 seconds and retry
- Consider upgrading to paid tier at Groq
- Use smaller/faster models

### Models Don't Appear

1. Save the connection first
2. Reload the page
3. Verify connection is active in Admin Panel → Connections
4. Check browser console for errors

### "Unauthorized" Errors

```bash
# Test API key directly
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# If this fails, regenerate API key at console.groq.com/keys
```

---

## 📚 Resources

- **Groq Console**: [console.groq.com](https://console.groq.com)
- **Groq Documentation**: [console.groq.com/docs](https://console.groq.com/docs)
- **API Reference**: [console.groq.com/docs/api-reference](https://console.groq.com/docs/api-reference)
- **Open WebUI Docs**: [docs.openwebui.com](https://docs.openwebui.com)
- **Groq Discord**: [groq.com/discord](https://groq.com/discord)

---

## 🔄 Updating Configuration

### Change API Key

1. Update `.env` file with new API key
2. Restart Open WebUI: `docker restart open-webui`
3. Update connection in Admin Panel → Connections

### Add Multiple Providers

You can configure multiple API providers simultaneously:

- Groq (primary, fastest)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic Claude (via OpenRouter)
- Local Ollama models

Each connection appears in the model selector dropdown.

---

## 🎯 Next Steps

1. ✅ Configure Groq API (you are here)
2. [Explore available models](MODELS.md)
3. [Learn troubleshooting tips](TROUBLESHOOTING.md)
4. Start using SmartFarm AI!
