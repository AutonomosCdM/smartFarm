# Open WebUI - Installation Guide

## ✅ Installation Overview

This guide covers the installation of Open WebUI v0.6.33 for SmartFarm.

**Access URL:** http://localhost:3001

---

## 📋 Installed Configuration

### Docker Container

```bash
Image: ghcr.io/open-webui/open-webui:main
Name: open-webui
Restart Policy: always
```

### Ports

- **External Port:** 3001 (host)
- **Internal Port:** 8080 (container)
- **Note:** Port 3001 is used instead of the standard 3000 to avoid conflicts

### Persistent Data Volume

- **Name:** `open-webui`
- **Mount Point:** `/var/lib/docker/volumes/open-webui/_data`
- **Container Path:** `/app/backend/data`

---

## 🔧 Useful Commands

### Container Management

```bash
# Check status
docker ps --filter "name=open-webui"

# View logs in real-time
docker logs -f open-webui

# View last 50 lines of logs
docker logs open-webui --tail 50

# Stop the service
docker stop open-webui

# Start the service
docker start open-webui

# Restart the service
docker restart open-webui
```

### Data Management

```bash
# Inspect volume
docker volume inspect open-webui

# List files in volume (requires running container)
docker exec open-webui ls -la /app/backend/data

# Backup the volume
docker run --rm -v open-webui:/data -v $(pwd)/backups:/backup alpine tar czf /backup/open-webui-backup-$(date +%Y%m%d).tar.gz -C /data .

# Restore backup
docker run --rm -v open-webui:/data -v $(pwd)/backups:/backup alpine tar xzf /backup/open-webui-backup-YYYYMMDD.tar.gz -C /data
```

### Maintenance

```bash
# Remove container (keeps data)
docker rm -f open-webui

# Recreate container (keeps data)
docker run -d -p 3001:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main

# Update to latest version
docker pull ghcr.io/open-webui/open-webui:main
docker rm -f open-webui
docker run -d -p 3001:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

### Complete Cleanup

```bash
# ⚠️ DANGER: Removes container AND data
docker rm -f open-webui
docker volume rm open-webui
```

---

## 🔗 Integration with Ollama

The container is configured to connect to local Ollama via:

```
--add-host=host.docker.internal:host-gateway
```

If you have Ollama installed locally, Open WebUI can automatically access it at `http://host.docker.internal:11434`

---

## 📊 Features

- ✅ Guaranteed data persistence
- ✅ Auto-restart on system boot
- ✅ Responsive web interface
- ✅ Compatible with multiple LLM providers
- ✅ Local RAG (Retrieval-Augmented Generation)
- ✅ User and permission management

---

## 🆘 Troubleshooting

### Service Won't Start

```bash
docker logs open-webui
docker restart open-webui
```

### Port Already in Use

```bash
# Check which process is using the port
lsof -i :3001

# Change port (example: 3002)
docker rm -f open-webui
docker run -d -p 3002:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:main
```

### Check Container Health

```bash
docker inspect open-webui --format='{{.State.Health.Status}}'
```

---

## 📚 Resources

- **Official Documentation:** https://docs.openwebui.com
- **GitHub Repository:** https://github.com/open-webui/open-webui
- **Docker Hub:** ghcr.io/open-webui/open-webui

---

## 🎯 Next Steps

1. Access http://localhost:3001
2. Create your first account (first user becomes administrator)
3. Configure connections to LLM providers (see [Groq Configuration](GROQ_CONFIGURATION.md))
4. Explore RAG features and document management
