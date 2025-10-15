# Troubleshooting Guide

Common issues and solutions for SmartFarm.

---

## 🐳 Docker Issues

### Container Won't Start

**Symptoms**: Container exits immediately or won't start

**Solutions**:

```bash
# Check container logs
docker logs open-webui

# Check container status
docker ps -a --filter "name=open-webui"

# Restart container
docker restart open-webui

# If that doesn't work, recreate container
docker rm -f open-webui
docker-compose up -d
```

### Port Already in Use

**Symptoms**: Error message: "port is already allocated"

**Solutions**:

```bash
# Find what's using the port
lsof -i :3001

# Option 1: Stop the conflicting process
kill -9 <PID>

# Option 2: Change port in .env
echo "OPENWEBUI_PORT=3002" >> .env
docker-compose down
docker-compose up -d
```

### Volume Permission Issues

**Symptoms**: Container can't write to volume

**Solutions**:

```bash
# Check volume
docker volume inspect open-webui

# Remove and recreate volume
docker-compose down
docker volume rm open-webui
docker-compose up -d
```

### Container Health Check Failing

**Symptoms**: Container status shows "unhealthy"

**Solutions**:

```bash
# Check health status
docker inspect open-webui --format='{{.State.Health.Status}}'

# Check health logs
docker inspect open-webui --format='{{range .State.Health.Log}}{{.Output}}{{end}}'

# Restart container
docker restart open-webui
```

---

## 🚀 CI/CD Deployment Issues

### Deployment Workflow Failed

**Symptoms**: GitHub Actions deployment workflow shows red X

**Check Workflow Status**:

```bash
# View recent workflow runs
gh run list --repo AutonomosCdM/smartFarm --limit 5

# View detailed logs for failed run
gh run view <run-id> --log --repo AutonomosCdM/smartFarm

# Or view in browser:
# https://github.com/AutonomosCdM/smartFarm/actions
```

### SSH Connection Failed

**Symptoms**: Workflow fails at "Setup SSH" or "Test SSH Connection" step

**Solutions**:

1. **Verify GitHub Secrets**:
   ```bash
   # Check secrets are configured (from local machine)
   gh secret list --repo AutonomosCdM/smartFarm

   # Should show:
   # SSH_PRIVATE_KEY
   # SSH_HOST
   # SSH_USER
   # DEPLOY_PATH
   ```

2. **Test SSH Manually**:
   ```bash
   # Test SSH connection from local machine
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
   ```

3. **Check Key Format**:
   - Ensure SSH_PRIVATE_KEY is the full RSA private key
   - Must include `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`
   - No extra whitespace or line breaks

### Health Check Failed

**Symptoms**: Deployment completes but health check times out

**Solutions**:

1. **Check Container Status**:
   ```bash
   # SSH to server
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

   # Check if container is running
   docker ps --filter "name=open-webui"

   # Check container health
   docker inspect open-webui --format='{{.State.Health.Status}}'
   ```

2. **Check Application Logs**:
   ```bash
   # View container logs
   docker logs open-webui --tail 50

   # Check for errors
   docker logs open-webui | grep -i error
   ```

3. **Test Local Health**:
   ```bash
   # Test if app responds on server
   curl http://localhost:3001

   # Should return HTML content
   ```

4. **Check Nginx**:
   ```bash
   # Test Nginx configuration
   sudo nginx -t

   # Check Nginx status
   sudo systemctl status nginx

   # View Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

### Git Permission Errors

**Symptoms**: Deployment fails with "permission denied" or "dubious ownership" errors

**Solutions**:

```bash
# SSH to server
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123

# Fix git ownership (deploy script handles this automatically)
cd /opt/smartfarm
sudo git config --global --add safe.directory /opt/smartfarm

# If still failing, reset repository
sudo git reset --hard origin/main
sudo git clean -fd
```

**Note**: The deployment script runs all git operations with sudo to avoid permission issues.

### Automatic Rollback Executed

**Symptoms**: Workflow completes but shows rollback was performed

**What It Means**:
- Deployment succeeded initially
- Health checks failed
- System automatically rolled back to previous working version

**Solutions**:

1. **Identify the Issue**:
   ```bash
   # View workflow logs to see why health check failed
   gh run view <run-id> --log --repo AutonomosCdM/smartFarm
   ```

2. **Test Locally First**:
   ```bash
   # Before pushing to main, test locally:
   docker-compose down
   docker-compose up -d

   # Verify it works
   curl http://localhost:3001
   ```

3. **Fix and Redeploy**:
   - Fix the issue in your code
   - Test locally again
   - Push to `main` branch to trigger new deployment

### Manual Trigger Not Working

**Symptoms**: Can't trigger workflow manually from GitHub UI

**Solutions**:

```bash
# Trigger from command line
gh workflow run deploy-production.yml --repo AutonomosCdM/smartFarm

# Or specify branch
gh workflow run deploy-production.yml --ref main --repo AutonomosCdM/smartFarm
```

### Workflow Stuck/Timeout

**Symptoms**: Workflow runs for 15 minutes then times out

**Check**:

1. **Server Accessible**:
   ```bash
   # Test SSH from local machine
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
   ```

2. **Server Resources**:
   ```bash
   # SSH to server and check
   df -h  # Disk space
   free -h  # Memory
   docker ps  # Running containers
   ```

3. **GitHub Actions Status**:
   - Visit [GitHub Status](https://www.githubstatus.com)
   - Check if GitHub Actions is experiencing issues

---

## 🔌 API Connection Issues

### "Connection Failed" Error

**Symptoms**: Can't connect to Groq API in Open WebUI

**Checklist**:

1. **Verify API Key**:
   ```bash
   # Test API key directly
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer $GROQ_API_KEY"
   ```

2. **Check URL Format**:
   - Correct: `https://api.groq.com/openai/v1`
   - Wrong: `https://api.groq.com/openai/v1/` (trailing slash)
   - Wrong: `https://api.groq.com` (missing path)

3. **Verify API Key is Active**:
   - Visit [console.groq.com/keys](https://console.groq.com/keys)
   - Ensure key is not revoked or expired

4. **Check Container Logs**:
   ```bash
   docker logs open-webui | grep -i error
   ```

### "Rate Limit Exceeded"

**Symptoms**: 429 error, too many requests

**Solutions**:

```bash
# Wait 60 seconds
sleep 60

# Check your rate limits
# Visit https://console.groq.com/settings/limits

# Consider upgrading to paid tier

# Use smaller/faster models to reduce token usage
```

### "Unauthorized" Error (401)

**Symptoms**: API returns 401 Unauthorized

**Solutions**:

```bash
# Verify API key
echo $GROQ_API_KEY

# Test API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# If invalid, regenerate at console.groq.com/keys
# Update .env file
# Restart container
docker restart open-webui
```

---

## 🖥️ Web Interface Issues

### Can't Access http://localhost:3001

**Symptoms**: Browser can't connect

**Checklist**:

1. **Container Running**:
   ```bash
   docker ps --filter "name=open-webui"
   ```

2. **Port Correct**:
   ```bash
   cat .env | grep OPENWEBUI_PORT
   ```

3. **Firewall**:
   - Check if firewall is blocking port
   - Try: `curl http://localhost:3001`

4. **Browser Cache**:
   - Clear browser cache
   - Try incognito/private mode
   - Try different browser

### Models Don't Appear

**Symptoms**: No models in dropdown after configuring Groq

**Solutions**:

1. **Save Connection First**:
   - Go to Admin Panel → Connections
   - Click "Save" on your Groq connection

2. **Reload Page**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Check Connection Status**:
   - Admin Panel → Connections
   - Verify connection shows as "Active"

4. **Browser Console**:
   - Open Developer Tools (F12)
   - Check Console tab for errors

### Login Issues

**Symptoms**: Can't login or create account

**Solutions**:

```bash
# Check container logs
docker logs open-webui | grep -i auth

# Reset database (⚠️ loses all data)
docker-compose down
docker volume rm open-webui
docker-compose up -d
```

---

## 💾 Data Persistence Issues

### Data Not Persisting

**Symptoms**: Conversations lost after restart

**Check Volume**:

```bash
# Verify volume exists
docker volume ls | grep open-webui

# Check volume mount
docker inspect open-webui | grep -A 10 Mounts

# Verify volume has data
docker exec open-webui ls -la /app/backend/data
```

**Solutions**:

```bash
# If using docker-compose, ensure volume is defined
cat docker-compose.yml | grep -A 5 volumes

# Recreate with proper volume
docker-compose down
docker-compose up -d
```

### Backup Failed

**Symptoms**: Backup script fails

**Solutions**:

```bash
# Ensure container is running
docker ps --filter "name=open-webui"

# Ensure backup directory exists
mkdir -p backups

# Manual backup
docker run --rm \
  -v open-webui:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/manual-backup-$(date +%Y%m%d).tar.gz -C /data .
```

---

## 🔧 Performance Issues

### Slow Responses

**Symptoms**: AI responses are slow

**Solutions**:

1. **Use Faster Models**:
   - Switch to `llama-3.1-8b-instant`
   - Or `groq/compound-mini`

2. **Check Groq Status**:
   - Visit [status.groq.com](https://status.groq.com)

3. **Check Network**:
   ```bash
   # Test connection speed
   curl -w "@-" -o /dev/null -s https://api.groq.com/openai/v1/models <<'EOF'
   time_namelookup: %{time_namelookup}\n
   time_connect: %{time_connect}\n
   time_total: %{time_total}\n
   EOF
   ```

4. **Container Resources**:
   ```bash
   # Check container stats
   docker stats open-webui --no-stream
   ```

### High Memory Usage

**Symptoms**: Docker using too much memory

**Solutions**:

```bash
# Check memory usage
docker stats open-webui --no-stream

# Restart container
docker restart open-webui

# Limit container memory in docker-compose.yml
# Add under open-webui service:
# mem_limit: 2g
```

---

## 🛡️ Security Issues

### API Key Exposed

**Symptoms**: API key accidentally committed or shared

**Actions**:

1. **Immediately Revoke**:
   - Visit [console.groq.com/keys](https://console.groq.com/keys)
   - Revoke the compromised key

2. **Generate New Key**:
   - Create new key at Groq Console
   - Update `.env` file

3. **Restart Services**:
   ```bash
   docker restart open-webui
   ```

4. **Check Git History**:
   ```bash
   # Scan for secrets
   git secrets --scan-history

   # If found in history, consider:
   # - git filter-branch (complex)
   # - Report to GitHub
   ```

### Unauthorized Access

**Symptoms**: Suspicious activity or unknown users

**Actions**:

```bash
# Check logs for suspicious activity
docker logs open-webui | grep -i "login\|auth\|failed"

# Reset all passwords
# (Do this through Open WebUI interface)

# Consider enabling additional security:
# - Use reverse proxy with HTTPS
# - Enable authentication proxy
# - Use firewall rules
```

---

## 🔄 Update Issues

### Update Failed

**Symptoms**: Container won't start after update

**Solutions**:

```bash
# Rollback to previous version
docker pull ghcr.io/open-webui/open-webui:v0.6.33

# Or recreate with specific version
docker rm -f open-webui
docker run -d -p 3001:8080 \
  --add-host=host.docker.internal:host-gateway \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart always \
  ghcr.io/open-webui/open-webui:v0.6.33
```

### Migration Issues

**Symptoms**: Data compatibility issues after update

**Solutions**:

```bash
# Restore from backup
docker-compose down
docker volume rm open-webui
./scripts/restore.sh backups/open-webui-backup-YYYYMMDD.tar.gz
docker-compose up -d
```

---

## 📋 Diagnostic Commands

### Full System Check

```bash
#!/bin/bash
echo "=== SmartFarm Diagnostic ==="
echo ""

echo "Docker Version:"
docker --version
echo ""

echo "Container Status:"
docker ps --filter "name=open-webui"
echo ""

echo "Container Logs (last 20 lines):"
docker logs open-webui --tail 20
echo ""

echo "Volume:"
docker volume inspect open-webui | grep Mountpoint
echo ""

echo "Environment:"
cat .env | grep -v "API_KEY"
echo ""

echo "Network Test:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001
echo ""

echo "Groq API Test:"
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | jq -r '.data[0].id' 2>/dev/null
echo ""
```

Save as `scripts/diagnostic.sh` and run with `bash scripts/diagnostic.sh`

---

## 🆘 Getting Help

If none of these solutions work:

1. **Check Logs**:
   ```bash
   docker logs open-webui > smartfarm-logs.txt
   ```

2. **GitHub Issues**:
   - [SmartFarm Issues](https://github.com/AutonomosCdM/smartFarm/issues)
   - [Open WebUI Issues](https://github.com/open-webui/open-webui/issues)

3. **Community Support**:
   - [Open WebUI Discord](https://discord.gg/open-webui)
   - [Groq Discord](https://groq.com/discord)

4. **Include in Report**:
   - Operating system
   - Docker version
   - Container logs
   - Steps to reproduce
   - Expected vs actual behavior

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Open WebUI Documentation](https://docs.openwebui.com/)
- [Groq Documentation](https://console.groq.com/docs)
- [GitHub Discussions](https://github.com/AutonomosCdM/smartFarm/discussions)
