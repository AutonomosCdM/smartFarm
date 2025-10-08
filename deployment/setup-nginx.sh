#!/bin/bash
# SmartFarm - Nginx Setup Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🌾 SmartFarm Nginx Configuration${NC}"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo)${NC}"
    exit 1
fi

# Install Nginx if not present
echo -e "${YELLOW}🔍 Checking Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Nginx...${NC}"
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ Nginx installed${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Backup existing config if exists
NGINX_CONF="/etc/nginx/sites-available/smartfarm"
if [ -f "$NGINX_CONF" ]; then
    echo -e "${YELLOW}📦 Backing up existing config...${NC}"
    cp "$NGINX_CONF" "$NGINX_CONF.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copy new config
echo -e "${YELLOW}📝 Installing Nginx configuration...${NC}"
cp /opt/smartfarm/deployment/nginx.conf "$NGINX_CONF"

# Create symlink if doesn't exist
if [ ! -L "/etc/nginx/sites-enabled/smartfarm" ]; then
    ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/smartfarm
    echo -e "${GREEN}✅ Symlink created${NC}"
fi

# Remove default config if exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo -e "${YELLOW}🗑️  Removing default config...${NC}"
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx config
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"

    # Reload Nginx
    echo -e "${YELLOW}🔄 Reloading Nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx reloaded${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
    exit 1
fi

# Check if CloudFront is being used
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: CloudFront Configuration${NC}"
echo "================================================"
echo ""
echo "I see you're using CloudFront (d1ghj182fliscw.cloudfront.net)"
echo ""
echo "You have two options:"
echo ""
echo "Option 1: Use CloudFront (recommended for production)"
echo "  - Update CloudFront origin to point to your server IP"
echo "  - Origin: http://34.200.33.195:3001"
echo "  - SSL is handled by CloudFront/ACM"
echo ""
echo "Option 2: Direct Nginx (simpler, for testing)"
echo "  - Point DNS directly to server: 34.200.33.195"
echo "  - Install Let's Encrypt for SSL"
echo ""
echo -e "${YELLOW}Which option do you prefer?${NC}"
echo ""

# Status
echo -e "${GREEN}🎉 Nginx Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Status:${NC}"
systemctl status nginx --no-pager
echo ""
echo -e "${BLUE}🔧 Test Commands:${NC}"
echo "  curl http://localhost:3001         # Test Open WebUI directly"
echo "  curl http://localhost              # Test Nginx proxy"
echo "  systemctl status nginx             # Check Nginx status"
echo "  tail -f /var/log/nginx/smartfarm-* # View logs"
