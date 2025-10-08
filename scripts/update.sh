#!/bin/bash
# SmartFarm - Update Script
# Updates Open WebUI to the latest version

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌾 SmartFarm Update Script${NC}"
echo "================================"
echo ""

CONTAINER_NAME="open-webui"
IMAGE_NAME="ghcr.io/open-webui/open-webui:main"
BACKUP_DIR="./backups"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Create backup before update
echo -e "${BLUE}📦 Creating backup before update...${NC}"
if [ -f "./scripts/backup.sh" ]; then
    bash ./scripts/backup.sh
else
    echo -e "${YELLOW}⚠️  Backup script not found, skipping backup${NC}"
    read -p "Continue without backup? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        echo "Update cancelled"
        exit 0
    fi
fi

echo ""
echo -e "${YELLOW}🔄 Pulling latest image...${NC}"
docker pull ${IMAGE_NAME}

echo ""
echo -e "${YELLOW}🛑 Stopping current container...${NC}"
docker stop ${CONTAINER_NAME} 2>/dev/null || true

echo -e "${YELLOW}🗑️  Removing old container...${NC}"
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo ""
echo -e "${YELLOW}🚀 Starting updated container...${NC}"

# Check if docker-compose exists
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
else
    # Fallback to docker run
    source .env 2>/dev/null || true
    PORT=${OPENWEBUI_PORT:-3001}

    docker run -d \
        -p ${PORT}:8080 \
        --add-host=host.docker.internal:host-gateway \
        -v open-webui:/app/backend/data \
        --name open-webui \
        --restart always \
        ${IMAGE_NAME}
fi

# Wait for container to be ready
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Check container status
if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo ""
    echo -e "${GREEN}✅ Update completed successfully!${NC}"
    echo ""

    # Get new version info
    NEW_VERSION=$(docker inspect ${IMAGE_NAME} --format='{{index .Config.Labels "org.opencontainers.image.version"}}' 2>/dev/null || echo "latest")
    echo -e "${BLUE}📊 Status:${NC}"
    echo "   Version: ${NEW_VERSION}"
    echo "   Container: Running"
    echo "   URL: http://localhost:${PORT:-3001}"
    echo ""
    echo -e "${YELLOW}💡 Tip: Clear your browser cache if you experience issues${NC}"
else
    echo ""
    echo -e "${RED}❌ Error: Container failed to start${NC}"
    echo -e "${YELLOW}🔄 Attempting to restore from backup...${NC}"

    # Try to restore latest backup
    LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/openwebui-backup-*.tar.gz 2>/dev/null | head -1)
    if [ -n "${LATEST_BACKUP}" ] && [ -f "./scripts/restore.sh" ]; then
        bash ./scripts/restore.sh ${LATEST_BACKUP}
    else
        echo -e "${RED}❌ Could not restore backup${NC}"
        echo "Check logs with: docker logs ${CONTAINER_NAME}"
    fi
    exit 1
fi
