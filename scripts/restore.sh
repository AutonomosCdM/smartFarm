#!/bin/bash
# SmartFarm - Restore Script
# Restores Open WebUI data from backup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌾 SmartFarm Restore Script${NC}"
echo "================================"
echo ""

# Check arguments
if [ $# -ne 1 ]; then
    echo -e "${YELLOW}Usage: $0 <backup-file>${NC}"
    echo ""
    echo "Available backups:"
    ls -lht backups/openwebui-backup-*.tar.gz 2>/dev/null | head -5 || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1
VOLUME_NAME="open-webui"
CONTAINER_NAME="open-webui"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo -e "${RED}❌ Error: Backup file '${BACKUP_FILE}' not found${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Warning
echo -e "${RED}⚠️  WARNING: This will replace all existing data!${NC}"
echo -e "${YELLOW}📦 Backup file: ${BACKUP_FILE}${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop container if running
if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo -e "${YELLOW}🛑 Stopping container...${NC}"
    docker stop ${CONTAINER_NAME}
fi

# Remove existing volume
if docker volume inspect ${VOLUME_NAME} > /dev/null 2>&1; then
    echo -e "${YELLOW}🗑️  Removing existing volume...${NC}"
    docker volume rm ${VOLUME_NAME}
fi

# Create new volume
echo -e "${YELLOW}📦 Creating new volume...${NC}"
docker volume create ${VOLUME_NAME}

# Restore backup
echo -e "${YELLOW}🔄 Restoring backup...${NC}"
docker run --rm \
    -v ${VOLUME_NAME}:/data \
    -v $(pwd)/$(dirname ${BACKUP_FILE}):/backup \
    alpine \
    tar xzf /backup/$(basename ${BACKUP_FILE}) -C /data

# Start container
echo -e "${YELLOW}🚀 Starting container...${NC}"
docker start ${CONTAINER_NAME} 2>/dev/null || docker-compose up -d

# Wait for container to be healthy
echo -e "${YELLOW}⏳ Waiting for container to be ready...${NC}"
sleep 5

# Check if container is running
if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo -e "${GREEN}✅ Restore completed successfully!${NC}"
    echo ""
    echo "🌐 Open WebUI should be available at: http://localhost:3001"
else
    echo -e "${RED}❌ Error: Container failed to start${NC}"
    echo "Check logs with: docker logs ${CONTAINER_NAME}"
    exit 1
fi
