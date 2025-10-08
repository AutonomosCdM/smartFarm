#!/bin/bash
# SmartFarm - Backup Script
# Creates a backup of Open WebUI data

set -e

# Configuration
BACKUP_DIR="./backups"
VOLUME_NAME="open-webui"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="openwebui-backup-${TIMESTAMP}.tar.gz"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌾 SmartFarm Backup Script${NC}"
echo "================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Check if volume exists
if ! docker volume inspect ${VOLUME_NAME} > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Volume '${VOLUME_NAME}' not found${NC}"
    exit 1
fi

# Create backup directory
mkdir -p ${BACKUP_DIR}
echo -e "${YELLOW}📁 Backup directory: ${BACKUP_DIR}${NC}"

# Create backup
echo -e "${YELLOW}🔄 Creating backup...${NC}"
docker run --rm \
    -v ${VOLUME_NAME}:/data \
    -v $(pwd)/${BACKUP_DIR}:/backup \
    alpine \
    tar czf /backup/${BACKUP_FILE} -C /data .

# Check if backup was successful
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo -e "${GREEN}✅ Backup created successfully!${NC}"
    echo ""
    echo "📦 Backup file: ${BACKUP_FILE}"
    echo "💾 Size: ${BACKUP_SIZE}"
    echo "📍 Location: ${BACKUP_DIR}/${BACKUP_FILE}"
    echo ""

    # List recent backups
    echo -e "${YELLOW}📋 Recent backups:${NC}"
    ls -lht ${BACKUP_DIR}/openwebui-backup-*.tar.gz | head -5
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
