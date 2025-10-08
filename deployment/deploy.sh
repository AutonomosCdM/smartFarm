#!/bin/bash
# SmartFarm - Production Deployment Script
# Run this script on your server (34.200.33.195)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌾 SmartFarm Production Deployment${NC}"
echo "========================================"
echo ""

# Configuration
REPO_URL="https://github.com/AutonomosCdM/smartFarm.git"
INSTALL_DIR="/opt/smartfarm"
BACKUP_DIR="/opt/smartfarm-backup-$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment Checklist${NC}"
echo "----------------------------"

# 1. Check Docker
echo -e "${YELLOW}🐳 Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# 2. Check Docker Compose
echo -e "${YELLOW}🐳 Checking Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# 3. Check Git
echo -e "${YELLOW}📦 Checking Git...${NC}"
if ! command -v git &> /dev/null; then
    apt-get update
    apt-get install -y git
    echo -e "${GREEN}✅ Git installed${NC}"
else
    echo -e "${GREEN}✅ Git already installed${NC}"
fi

# 4. Backup existing installation
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}📦 Backing up existing installation...${NC}"
    cp -r "$INSTALL_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}✅ Backup created: $BACKUP_DIR${NC}"
fi

# 5. Clone/Update repository
echo -e "${YELLOW}📥 Deploying SmartFarm...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi
echo -e "${GREEN}✅ Repository updated${NC}"

# 6. Configure environment
echo -e "${YELLOW}⚙️  Configuring environment...${NC}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}📝 IMPORTANT: Edit .env file and add your Groq API key${NC}"
    echo -e "${YELLOW}   nano $INSTALL_DIR/.env${NC}"
    read -p "Press Enter after you've added your API key..."
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# 7. Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || true

# 8. Pull latest images
echo -e "${YELLOW}📥 Pulling latest Docker images...${NC}"
docker-compose pull

# 9. Start services
echo -e "${YELLOW}🚀 Starting SmartFarm...${NC}"
docker-compose up -d

# 10. Wait for service to be ready
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 10

# 11. Check status
if docker ps | grep -q "open-webui"; then
    echo -e "${GREEN}✅ SmartFarm is running!${NC}"
else
    echo -e "${RED}❌ Failed to start SmartFarm${NC}"
    echo "Check logs: docker-compose logs"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose ps
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Configure Nginx reverse proxy (see nginx.conf)"
echo "2. Test locally: curl http://localhost:3001"
echo "3. Access: https://smartfarm.autonomos.dev"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "  View logs:    cd $INSTALL_DIR && docker-compose logs -f"
echo "  Restart:      cd $INSTALL_DIR && docker-compose restart"
echo "  Stop:         cd $INSTALL_DIR && docker-compose down"
echo "  Update:       cd $INSTALL_DIR && git pull && docker-compose up -d"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to configure Nginx!${NC}"
