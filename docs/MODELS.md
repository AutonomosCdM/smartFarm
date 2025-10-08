# Available AI Models

Complete list of AI models available through Groq API for SmartFarm.

> **Note**: Model availability may change. For the latest list, run:
> ```bash
> curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY" | jq '.data[].id'
> ```

---

## 🌟 Recommended Models

### General Purpose

| Model | Context | Speed | Best For |
|-------|---------|-------|----------|
| **llama-3.3-70b-versatile** | 131K | Fast | Best all-around choice |
| **llama-3.1-8b-instant** | 131K | Ultra-fast | Quick queries, simple tasks |
| **groq/compound** | 131K | Fast | Groq-optimized performance |
| **groq/compound-mini** | 131K | Ultra-fast | Lighter compound version |

### Advanced Reasoning

| Model | Context | Best For |
|-------|---------|----------|
| **deepseek-r1-distill-llama-70b** | 131K | Complex problem solving, planning |
| **meta-llama/llama-4-maverick-17b-128e-instruct** | 131K | Advanced instructions |
| **meta-llama/llama-4-scout-17b-16e-instruct** | 131K | Task exploration |

### Multilingual

| Model | Context | Languages |
|-------|---------|-----------|
| **qwen/qwen3-32b** | 131K | Multiple languages (Alibaba) |
| **moonshotai/kimi-k2-instruct** | 262K | Ultra-long context, multilingual |
| **moonshotai/kimi-k2-instruct-0905** | 262K | Latest Kimi version |
| **allam-2-7b** | 4K | Arabic-focused (SDAIA) |

### Lightweight

| Model | Context | Best For |
|-------|---------|----------|
| **gemma2-9b-it** | 8K | Fast, lightweight tasks (Google) |
| **openai/gpt-oss-20b** | 131K | Open source alternative |

---

## 🎙️ Audio & Speech Models

### Speech-to-Text (Transcription)

| Model | Best For |
|-------|----------|
| **whisper-large-v3** | High-quality transcription |
| **whisper-large-v3-turbo** | Faster transcription |

**Use Case**: Voice commands for farmers in the field

### Text-to-Speech

| Model | Language |
|-------|----------|
| **playai-tts** | English and others |
| **playai-tts-arabic** | Arabic |

**Use Case**: Audio notifications and responses

---

## 🛡️ Security & Moderation

| Model | Purpose |
|-------|---------|
| **meta-llama/llama-guard-4-12b** | Content moderation, safety |
| **meta-llama/llama-prompt-guard-2-86m** | Prompt injection detection |
| **meta-llama/llama-prompt-guard-2-22m** | Lightweight prompt guard |

---

## 📊 Model Specifications

### Context Window Sizes

- **262K tokens**: Kimi models (ultra-long context)
- **131K tokens**: Llama 3.x, DeepSeek, Compound, Qwen, GPT-OSS
- **8K tokens**: Gemma2, PlayAI TTS
- **4K tokens**: Allam
- **512 tokens**: Prompt Guard models
- **448 tokens**: Whisper models

### Performance Tiers

**Ultra-Fast (800+ tokens/sec)**:
- llama-3.1-8b-instant
- groq/compound-mini
- gemma2-9b-it

**Fast (500-700 tokens/sec)**:
- llama-3.3-70b-versatile
- groq/compound
- deepseek-r1-distill-llama-70b

**Standard (300-500 tokens/sec)**:
- qwen/qwen3-32b
- Kimi models
- Llama 4 variants

---

## 🌾 Agricultural Use Cases

### Crop Planning
**Recommended**: llama-3.3-70b-versatile, groq/compound
- Long-term planning
- Multi-crop rotation analysis
- Weather pattern consideration

### Quick Queries
**Recommended**: llama-3.1-8b-instant, groq/compound-mini
- Pest identification
- Quick calculations
- Simple recommendations

### Complex Problem Solving
**Recommended**: deepseek-r1-distill-llama-70b
- Disease diagnosis with multiple factors
- Resource optimization
- Market analysis

### Documentation & Reports
**Recommended**: llama-3.3-70b-versatile, qwen/qwen3-32b
- Generate farming reports
- Create documentation
- Multilingual content

### Voice Interaction
**Recommended**: whisper-large-v3-turbo + llama-3.1-8b-instant
- Field voice commands
- Hands-free operation
- Quick voice notes

### Long-Context Analysis
**Recommended**: moonshotai/kimi-k2-instruct
- Analyze full season data
- Process large documents
- Historical trend analysis

---

## 🔄 Model Selection Tips

### For Speed
1. llama-3.1-8b-instant (fastest)
2. groq/compound-mini
3. gemma2-9b-it

### For Quality
1. llama-3.3-70b-versatile (best balance)
2. deepseek-r1-distill-llama-70b (reasoning)
3. groq/compound (optimized)

### For Context
1. moonshotai/kimi-k2-instruct (262K)
2. llama-3.3-70b-versatile (131K)
3. qwen/qwen3-32b (131K)

### For Cost Efficiency
1. llama-3.1-8b-instant (fast + cheap)
2. groq/compound-mini (optimized)
3. gemma2-9b-it (lightweight)

---

## 🧪 Testing Models

### Quick Test Script

```bash
#!/bin/bash
# Test different models

MODELS=(
  "llama-3.3-70b-versatile"
  "llama-3.1-8b-instant"
  "groq/compound"
  "deepseek-r1-distill-llama-70b"
)

for model in "${MODELS[@]}"; do
  echo "Testing $model..."
  time curl -s https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer $GROQ_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"model\": \"$model\",
      \"messages\": [{\"role\": \"user\", \"content\": \"What is precision agriculture?\"}],
      \"max_tokens\": 100
    }" | jq -r '.choices[0].message.content'
  echo "---"
done
```

---

## 📈 Performance Benchmarks

Based on Groq's infrastructure (approximate):

| Model | Tokens/Sec | First Token | Use Case |
|-------|------------|-------------|----------|
| llama-3.1-8b-instant | 800+ | <50ms | Quick responses |
| groq/compound | 600-700 | <100ms | Balanced |
| llama-3.3-70b-versatile | 500-600 | <150ms | Quality responses |
| deepseek-r1-distill-llama-70b | 400-500 | <150ms | Reasoning tasks |

*Note: Actual performance may vary based on load and query complexity*

---

## 🆕 New Models

Groq regularly adds new models. To stay updated:

1. Check [Groq Blog](https://groq.com/blog)
2. Monitor [Groq Discord](https://groq.com/discord)
3. Query API: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`

---

## 📚 Resources

- [Groq Model Documentation](https://console.groq.com/docs/models)
- [Llama 3 Model Card](https://llama.meta.com/)
- [DeepSeek Documentation](https://www.deepseek.com/)
- [Gemma Documentation](https://ai.google.dev/gemma)
- [Qwen Documentation](https://qwenlm.github.io/)

---

## 🎯 Quick Start Recommendation

If you're new to SmartFarm, start with:

1. **Primary**: `llama-3.3-70b-versatile` - Best balance
2. **Fast fallback**: `llama-3.1-8b-instant` - Quick queries
3. **Specialized**: `whisper-large-v3-turbo` - Voice input

These three models cover 95% of agricultural use cases with excellent performance.
