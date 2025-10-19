# SmartFarm Quick Start Guide

Get SmartFarm running in 5 minutes! This guide covers the essential steps to deploy locally.

## Prerequisites

- Docker & Docker Compose installed
- Git installed
- Groq API key (get free at [console.groq.com/keys](https://console.groq.com/keys))
- OpenAI API key (for Excel tool - get at [platform.openai.com](https://platform.openai.com))

## 1. Clone Repository

```bash
git clone https://github.com/AutonomosCdM/smartFarm.git
cd smartFarm
```

## 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

Add your API keys:
```env
GROQ_API_KEY=gsk_xxxxx              # Required for AI chat
OPENAI_API_KEY=sk-xxxxx             # Required for Excel tool
OPENWEBUI_PORT=3001                 # Change if port conflict
DEFAULT_LOCALE=es-ES                # Spanish interface
```

## 3. Start SmartFarm

```bash
# Start the application
docker-compose up -d

# Verify it's running
docker ps
docker logs open-webui
```

## 4. Initial Setup

1. **Open browser**: http://localhost:3001
2. **Create admin account** (first user becomes admin)
3. **Configure Groq connection**:
   - Click Settings → Admin Panel → Connections
   - Add new connection:
     - Type: `OpenAI Compatible`
     - Name: `Groq`
     - API Base URL: `https://api.groq.com/openai/v1`
     - API Key: `[your GROQ_API_KEY]`
4. **Enable models**:
   - Settings → Admin Panel → Models
   - Set visibility to "Public" for desired models
   - Recommended: `llama-3.3-70b-versatile`

## 5. Test the System

1. Start a new chat
2. Select a Groq model
3. Ask: "¿Cómo puedo mejorar mi cultivo de tomates?"
4. Upload an Excel file to test data analysis

## Quick Commands Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Restart (after config changes)
docker-compose restart

# View logs
docker logs -f open-webui

# Check health
docker inspect open-webui --format='{{.State.Health.Status}}'

# Backup data
./scripts/backup.sh

# Update to latest version
./scripts/update.sh
```

## Common Issues

### Port 3001 Already in Use
```bash
# Find what's using the port
lsof -i :3001

# Kill the process or change port in .env
OPENWEBUI_PORT=3002
```

### No Models Available
- Admin Panel → Models → Set to "Public"
- Ensure Groq connection is configured correctly

### Excel Tool Not Working
- Verify both `GROQ_API_KEY` and `OPENAI_API_KEY` are set
- Check docker logs for errors

## What's Next?

- **Production deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Advanced configuration**: See [ADVANCED_CONFIGURATION.md](ADVANCED_CONFIGURATION.md)
- **System architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Need Help?

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review docker logs: `docker logs open-webui`
- Verify environment: `cat .env | grep API_KEY`

---

**Congratulations!** You now have SmartFarm running locally. 🚀

For production deployment on AWS Lightsail, see [DEPLOYMENT.md](DEPLOYMENT.md).