# Production Deployment Guide

Complete guide to deploy SmartFarm AI on your production server.

---

## 🎯 Overview

This guide will help you deploy SmartFarm AI to:
- **Server**: 34.200.33.195
- **Domain**: smartfarm.autonomos.dev
- **Architecture**: Docker + Nginx + CloudFront (optional)

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] SSH access to server (34.200.33.195)
- [ ] Root/sudo privileges
- [ ] Groq API key from [console.groq.com](https://console.groq.com)
- [ ] Domain DNS configured (already done: smartfarm.autonomos.dev)

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your Server

```bash
# Open terminal on your local machine
ssh root@34.200.33.195

# Or if using a .pem file:
ssh -i path/to/your-key.pem ubuntu@34.200.33.195
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

### Step 6: Choose Your SSL/CloudFront Strategy

You have **two options**:

#### **Option A: Using CloudFront (Current Setup)**

Since you already have CloudFront configured:

1. **Update CloudFront Origin**:
   - Go to AWS CloudFront Console
   - Select your distribution: `d1ghj182fliscw.cloudfront.net`
   - Edit Origin:
     - **Origin Domain**: `34.200.33.195`
     - **Origin Protocol**: HTTP
     - **Origin Port**: 3001 (or 80 if using Nginx)

2. **Keep DNS as is**:
   - CNAME: `www` → `d1ghj182fliscw.cloudfront.net`
   - A Record: `smartfarm` → `34.200.33.195`

3. **SSL**: Already handled by ACM certificate

**Pros**: Global CDN, better performance, AWS-managed SSL
**Cons**: Slightly more complex setup

---

#### **Option B: Direct Nginx with Let's Encrypt (Simpler)**

If you prefer direct access without CloudFront:

1. **Update DNS** (remove CloudFront):
   - A Record: `smartfarm` → `34.200.33.195`
   - Remove CNAME or point to main domain

2. **Install SSL Certificate**:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d smartfarm.autonomos.dev

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS
```

3. **Certbot** will automatically:
   - Get SSL certificate from Let's Encrypt
   - Configure Nginx
   - Set up auto-renewal

**Pros**: Simpler setup, direct access
**Cons**: No CDN benefits

---

### Step 7: Test Your Deployment

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
   # Should return 34.200.33.195
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
