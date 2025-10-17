# Production Deployment Guide

Complete guide to deploy SmartFarm AI on your production server.

---

## 🎯 Overview

This guide will help you deploy SmartFarm AI to:
- **Platform**: AWS Lightsail VPS
- **Server**: 54.173.46.123
- **Domain**: smartfarm.autonomos.dev
- **Architecture**: Docker + Nginx + Let's Encrypt SSL + GitHub Actions CI/CD
- **Production URL**: https://smartfarm.autonomos.dev

---

## 🚀 Deployment Methods

SmartFarm supports two deployment methods:

### 1. **Automatic Deployment (CI/CD)** ⚡ *Recommended for updates*
- Triggered automatically on push to `main` branch
- GitHub Actions handles the entire deployment
- Includes health checks and automatic rollback
- No manual SSH connection needed
- **Use for**: Regular updates and feature deployments

### 2. **Manual Deployment** 🔧 *For initial setup and emergencies*
- Direct SSH connection to server
- Run deployment script manually
- Full control over the process
- **Use for**: Initial server setup, emergency fixes, infrastructure changes

---

## ⚡ Automatic Deployment (CI/CD)

### How It Works

```
Push to main → GitHub Actions → SSH to server → Deploy → Health check → ✅ Success or ⚙️ Rollback
```

**Workflow:**
1. Developer pushes code to `main` branch
2. GitHub Actions workflow triggers automatically
3. Workflow SSHs to production server
4. Pulls latest code and runs `deployment/deploy.sh`
5. Waits 15 seconds for services to start
6. Performs health check (6 attempts over 60 seconds)
7. If successful: Deployment complete ✅
8. If failed: Automatically rolls back to previous commit ⚙️

### Monitoring Deployments

**View workflow runs:**
```bash
# From your local machine
gh run list --repo AutonomosCdM/smartFarm

# Watch a specific run
gh run watch <run-id> --repo AutonomosCdM/smartFarm

# View run logs
gh run view <run-id> --log --repo AutonomosCdM/smartFarm
```

**Or via GitHub UI:**
1. Go to https://github.com/AutonomosCdM/smartFarm/actions
2. Click on the latest workflow run
3. View deployment logs in real-time

### Manual Trigger

You can manually trigger a deployment without pushing code:

```bash
# From your local machine
gh workflow run deploy-production.yml --repo AutonomosCdM/smartFarm
```

Or via GitHub UI:
1. Go to https://github.com/AutonomosCdM/smartFarm/actions
2. Select "Deploy to Production" workflow
3. Click "Run workflow" button

### Deployment Features

- ✅ Automatic health checks
- ✅ Automatic rollback on failure
- ✅ SSH connection verification
- ✅ Service status reporting
- ✅ Secure credential handling (GitHub Secrets)
- ✅ 15-minute timeout protection

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] SSH access to server (54.173.46.123)
- [ ] Root/sudo privileges
- [ ] Groq API key from [console.groq.com](https://console.groq.com)
- [ ] Domain DNS configured (already done: smartfarm.autonomos.dev)
- [ ] GitHub repository access (for CI/CD)

---

## 🔧 Manual Deployment (Initial Setup)

**Note:** Manual deployment is typically only needed for:
- Initial server setup
- Emergency fixes when CI/CD is unavailable
- Infrastructure changes that can't be automated

For regular updates, use the [Automatic Deployment](#-automatic-deployment-cicd) method above.

---

### Step 1: Connect to Your Server

```bash
# Open terminal on your local machine
ssh ubuntu@54.173.46.123

# Using the .pem key file:
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
```

**Expected Result**: You should see your server's command prompt.

---

### Step 2: Run Automated Deployment Script

Once connected to the server, run:

```bash
# Download and execute deployment script
curl -fsSL https://raw.githubusercontent.com/AutonomosCdM/smartFarm/main/deployment/deploy.sh -o /tmp/deploy.sh
chmod +x /tmp/deploy.sh
sudo /tmp/deploy.sh
```

**What this script does:**
1. ✅ Installs Docker and Docker Compose (if needed)
2. ✅ Installs Git
3. ✅ Backs up existing installation
4. ✅ Clones SmartFarm repository to `/opt/smartfarm`
5. ✅ Creates `.env` configuration file
6. ✅ Starts SmartFarm with Docker Compose

**During Installation:**
- When prompted, press Enter to continue
- You'll need to edit the `.env` file to add your Groq API key

---

### Step 3: Configure Groq API Key

The script will pause and ask you to configure your API key:

```bash
# Edit the .env file
nano /opt/smartfarm/.env

# Find this line:
GROQ_API_KEY=your_groq_api_key_here

# Replace with your actual API key:
GROQ_API_KEY=gsk_your_actual_key_here

# Save and exit:
# Press Ctrl+X, then Y, then Enter
```

**After saving**, press Enter to continue the deployment.

---

### Step 4: Verify SmartFarm is Running

```bash
# Check if container is running
docker ps

# You should see:
# - Container name: open-webui
# - Status: Up
# - Ports: 0.0.0.0:3001->8080/tcp

# Check logs
cd /opt/smartfarm
docker-compose logs -f

# Press Ctrl+C to exit logs
```

**Test locally on the server:**

```bash
# Test if Open WebUI responds
curl http://localhost:3001

# Should return HTML content
```

---

### Step 5: Configure Nginx Reverse Proxy

Now configure Nginx to proxy requests to Open WebUI:

```bash
# Run Nginx setup script
curl -fsSL https://raw.githubusercontent.com/AutonomosCdM/smartFarm/main/deployment/setup-nginx.sh -o /tmp/setup-nginx.sh
chmod +x /tmp/setup-nginx.sh
sudo /tmp/setup-nginx.sh
```

**What this does:**
1. ✅ Installs Nginx (if needed)
2. ✅ Configures reverse proxy to port 3001
3. ✅ Enables WebSocket support (required for Open WebUI)
4. ✅ Sets up proper headers
5. ✅ Reloads Nginx

---

### Step 6: Install SSL Certificate with Let's Encrypt

**IMPORTANT**: HTTPS is required for production. Modern browsers may block HTTP-only sites.

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Generate SSL certificate and configure Nginx automatically
sudo certbot --nginx -d smartfarm.autonomos.dev --non-interactive --agree-tos --email admin@autonomos.dev --redirect
```

**What this does:**
1. ✅ Generates free SSL certificate from Let's Encrypt
2. ✅ Configures Nginx with HTTPS
3. ✅ Sets up HTTP → HTTPS redirect
4. ✅ Configures auto-renewal (runs every 90 days)

---

### Step 7: Open HTTPS Port (Port 443)

**For AWS Lightsail:**

```bash
# Using AWS CLI
aws lightsail open-instance-public-ports \
  --instance-name smartfarm \
  --port-info fromPort=443,toPort=443,protocol=TCP
```

**Or via Lightsail Console:**
1. Go to Lightsail console
2. Select your instance
3. Go to **Networking** tab
4. Add firewall rule: Port 443, TCP

---

### Step 8: Test Your Deployment

**Test HTTPS access:**

```bash
# From your local machine
curl -I https://smartfarm.autonomos.dev

# Should return: HTTP/1.1 200 OK
```

**Open in browser:**
1. Go to https://smartfarm.autonomos.dev
2. You should see Open WebUI login/signup page
3. Certificate should be valid (green padlock)

---

### Step 9: Configure Groq API in UI

1. Create your admin account (first user)
2. Click **Settings** (⚙️) in top right
3. Go to **Connections**
4. Add OpenAI API connection:
   - **API Base URL**: `https://api.groq.com/openai/v1`
   - **API Key**: Your Groq API key
5. Save and test

Models will appear in the dropdown automatically.

---

## 🎯 Quick Manual Deployment

For fast manual deployment (initial setup or emergency), run:

```bash
# SSH to server and run deployment script
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123
cd /opt/smartfarm && sudo ./deployment/deploy.sh

# Or as single command from local machine:
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@54.173.46.123 \
  'cd /opt/smartfarm && sudo ./deployment/deploy.sh'
```

**For regular updates**, use the automatic CI/CD deployment instead (push to `main` branch).

---

## ✅ Post-Deployment Checklist

```bash
# From your server
curl http://localhost:3001
curl http://localhost

# From your local machine
curl https://smartfarm.autonomos.dev
```

**Open browser**:
- Navigate to: `https://smartfarm.autonomos.dev`
- You should see Open WebUI login page

---

### Step 8: Initial Configuration

1. **Create Admin Account**:
   - Go to `https://smartfarm.autonomos.dev`
   - Click "Sign Up"
   - First user becomes administrator automatically

2. **Configure Groq API**:
   - Click your avatar → Admin Panel
   - Go to Settings → Connections
   - Add Connection:
     - Type: OpenAI Compatible
     - Name: Groq
     - Base URL: `https://api.groq.com/openai/v1`
     - API Key: (your Groq API key)

3. **Test AI Models**:
   - Select a model (e.g., `llama-3.3-70b-versatile`)
   - Start chatting!

---

## 🔧 Post-Deployment Management

### View Logs

```bash
cd /opt/smartfarm
docker-compose logs -f
```

### Restart Service

```bash
cd /opt/smartfarm
docker-compose restart
```

### Update SmartFarm

```bash
cd /opt/smartfarm
git pull origin main
docker-compose pull
docker-compose up -d
```

### Backup Data

```bash
cd /opt/smartfarm
./scripts/backup.sh
```

### Check Status

```bash
# Docker containers
docker ps

# Nginx status
sudo systemctl status nginx

# Check disk space
df -h

# Check memory
free -h
```

---

## 🛡️ Security Recommendations

### Firewall Configuration

```bash
# Install UFW (if not installed)
sudo apt-get install -y ufw

# Allow SSH
sudo ufw allow 22

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

### Regular Updates

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Update SmartFarm
cd /opt/smartfarm
git pull
docker-compose pull
docker-compose up -d
```

### Monitoring

Set up monitoring for:
- Disk space: `df -h`
- Memory usage: `free -h`
- Container status: `docker ps`
- Logs: `tail -f /var/log/nginx/smartfarm-*.log`

---

## 📊 Troubleshooting

### CI/CD Deployment Failures

**Check workflow status:**
```bash
# View recent workflow runs
gh run list --repo AutonomosCdM/smartFarm --limit 5

# View detailed logs for failed run
gh run view <run-id> --log --repo AutonomosCdM/smartFarm
```

**Common CI/CD issues:**

1. **SSH Connection Failed**
   - Check GitHub Secrets are configured correctly
   - Verify SSH key has correct permissions on server
   - Test SSH manually: `ssh -i ~/.ssh/deploy_key ubuntu@54.173.46.123`

2. **Health Check Failed**
   - Check if Open WebUI container is running: `docker ps`
   - View container logs: `docker logs open-webui`
   - Verify Nginx configuration: `sudo nginx -t`
   - Check if port 3001 is accessible: `curl http://localhost:3001`

3. **Deployment Failed with Git Errors**
   - Most git errors are handled automatically by running with sudo
   - If persisting, manually reset: `cd /opt/smartfarm && sudo git reset --hard origin/main`

4. **Rollback Executed**
   - Check workflow logs to see what caused the failure
   - Fix the issue in your code
   - Push a new commit to trigger redeployment

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Restart container
docker-compose restart

# Rebuild if needed
docker-compose down
docker-compose up -d
```

### Nginx Errors

```bash
# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/smartfarm-error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Can't Access Domain

1. **Check DNS**:
   ```bash
   nslookup smartfarm.autonomos.dev
   # Should return 54.173.46.123
   ```

2. **Check if service is running**:
   ```bash
   curl http://localhost:3001
   ```

3. **Check Nginx**:
   ```bash
   sudo systemctl status nginx
   ```

4. **Check Firewall**:
   ```bash
   sudo ufw status
   ```

### API Connection Issues

1. **Verify API key in .env**:
   ```bash
   cat /opt/smartfarm/.env | grep GROQ_API_KEY
   ```

2. **Test API key**:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **Check container logs**:
   ```bash
   docker-compose logs | grep -i error
   ```

---

## 📞 Support

If you encounter issues:

1. **Check logs first**:
   ```bash
   docker-compose logs > /tmp/smartfarm-logs.txt
   cat /tmp/smartfarm-logs.txt
   ```

2. **GitHub Issues**: [Report an issue](https://github.com/AutonomosCdM/smartFarm/issues)

3. **Documentation**: Review [Troubleshooting Guide](TROUBLESHOOTING.md)

---

## 🎉 Success Checklist

After deployment, verify:

- [ ] SmartFarm accessible at https://smartfarm.autonomos.dev
- [ ] Can create admin account
- [ ] Groq API connection working
- [ ] Can select and use AI models
- [ ] WebSocket connections working (real-time updates)
- [ ] SSL certificate valid
- [ ] Backups configured
- [ ] Firewall configured

---

## 📚 Additional Resources

- [Open WebUI Documentation](https://docs.openwebui.com)
- [Groq API Documentation](https://console.groq.com/docs)
- [Docker Documentation](https://docs.docker.com)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Congratulations! SmartFarm AI is now running in production! 🌾🎉**
