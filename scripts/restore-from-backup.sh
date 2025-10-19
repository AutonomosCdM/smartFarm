#!/bin/bash
# SmartFarm - Restore from Automated Backup
# Restores both Open WebUI and Redis data from automated backup archives

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_BASE_DIR="/opt/smartfarm/backups"
VOLUME_OPENWEBUI="open-webui"
VOLUME_REDIS="smartfarm-redis"
CONTAINER_OPENWEBUI="open-webui"
CONTAINER_REDIS="smartfarm-redis"
LOG_FILE="/var/log/smartfarm-restore.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SmartFarm Automated Restore System   ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo ""

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Error: This script must be run as root or with sudo${NC}"
   exit 1
fi

# Function to list available backups
list_backups() {
    local backup_type=$1
    local backup_dir="${BACKUP_BASE_DIR}/${backup_type}"

    if [[ ! -d "${backup_dir}" ]]; then
        echo "No ${backup_type} backups found"
        return
    fi

    local backups=($(ls -t "${backup_dir}"/smartfarm-backup-*.tar.gz 2>/dev/null))

    if [[ ${#backups[@]} -eq 0 ]]; then
        echo "No ${backup_type} backups found"
        return
    fi

    echo -e "${YELLOW}${backup_type^} Backups:${NC}"
    local i=1
    for backup in "${backups[@]}"; do
        local size=$(du -h "${backup}" | cut -f1)
        local date=$(basename "${backup}" | sed -E 's/smartfarm-backup-([0-9]{8})_([0-9]{6}).*/\1 \2/' | sed 's/\([0-9]\{4\}\)\([0-9]\{2\}\)\([0-9]\{2\}\) \([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)/\1-\2-\3 \4:\5:\6/')
        echo -e "  ${BLUE}${i}.${NC} $(basename "${backup}") (${size}) - ${date}"
        ((i++))
    done
    echo ""
}

# Function to show backup metadata
show_metadata() {
    local backup_file=$1
    local temp_dir=$(mktemp -d)
    trap "rm -rf ${temp_dir}" RETURN

    tar xzf "${backup_file}" -C "${temp_dir}" metadata.json 2>/dev/null || {
        echo -e "${YELLOW}No metadata found in backup${NC}"
        return
    }

    if [[ -f "${temp_dir}/metadata.json" ]]; then
        echo -e "${YELLOW}Backup Metadata:${NC}"
        cat "${temp_dir}/metadata.json" | python3 -m json.tool 2>/dev/null || cat "${temp_dir}/metadata.json"
        echo ""
    fi
}

# If no arguments, show help
if [[ $# -eq 0 ]]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <backup-file>           # Restore from specific backup file"
    echo "  $0 --list                  # List all available backups"
    echo "  $0 --latest [type]         # Restore from latest backup (daily/weekly/monthly)"
    echo "  $0 --s3 <s3-key>          # Restore from S3 backup"
    echo ""

    list_backups "daily"
    list_backups "weekly"
    list_backups "monthly"

    exit 0
fi

# Parse arguments
BACKUP_FILE=""
RESTORE_MODE="file"

case "$1" in
    --list)
        list_backups "daily"
        list_backups "weekly"
        list_backups "monthly"
        exit 0
        ;;
    --latest)
        BACKUP_TYPE="${2:-daily}"
        BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_TYPE}"

        if [[ ! -d "${BACKUP_DIR}" ]]; then
            echo -e "${RED}❌ Error: No ${BACKUP_TYPE} backups found${NC}"
            exit 1
        fi

        BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | head -1)

        if [[ -z "${BACKUP_FILE}" ]]; then
            echo -e "${RED}❌ Error: No ${BACKUP_TYPE} backups found${NC}"
            exit 1
        fi

        echo -e "${GREEN}✓ Selected latest ${BACKUP_TYPE} backup: $(basename "${BACKUP_FILE}")${NC}"
        ;;
    --s3)
        S3_KEY="$2"
        S3_BUCKET="${S3_BUCKET:-smartfarm-backups}"
        AWS_REGION="${AWS_REGION:-us-east-1}"

        if [[ -z "${S3_KEY}" ]]; then
            echo -e "${RED}❌ Error: S3 key required${NC}"
            echo "Usage: $0 --s3 <s3-key>"
            exit 1
        fi

        BACKUP_FILE="/tmp/smartfarm-s3-restore-$(date +%s).tar.gz"
        RESTORE_MODE="s3"

        echo -e "${YELLOW}📥 Downloading from S3...${NC}"
        if ! aws s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "${BACKUP_FILE}" --region "${AWS_REGION}"; then
            echo -e "${RED}❌ Error: Failed to download from S3${NC}"
            exit 1
        fi

        trap "rm -f ${BACKUP_FILE}" EXIT
        ;;
    *)
        BACKUP_FILE="$1"

        # Check if backup file exists
        if [[ ! -f "${BACKUP_FILE}" ]]; then
            echo -e "${RED}❌ Error: Backup file '${BACKUP_FILE}' not found${NC}"
            exit 1
        fi
        ;;
esac

log "=== SmartFarm Restore Started ==="
log "Backup file: ${BACKUP_FILE}"

# Show metadata
show_metadata "${BACKUP_FILE}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo -e "${BLUE}📦 Backup file:${NC} $(basename "${BACKUP_FILE}")"
echo -e "${BLUE}💾 Size:${NC} ${BACKUP_SIZE}"
echo ""

# Warning
echo -e "${RED}⚠️  WARNING: This will replace ALL existing data!${NC}"
echo -e "${YELLOW}📦 Backup file: ${BACKUP_FILE}${NC}"
echo ""
read -p "Are you sure you want to continue? Type 'yes' to proceed: " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

# Create temporary extraction directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

log "Extracting backup to temporary directory..."
echo -e "${YELLOW}📂 Extracting backup...${NC}"
tar xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Verify backup contents
if [[ ! -f "${TEMP_DIR}/openwebui.tar.gz" ]] || [[ ! -f "${TEMP_DIR}/redis.tar.gz" ]]; then
    echo -e "${RED}❌ Error: Invalid backup file (missing components)${NC}"
    exit 1
fi

# Stop containers if running
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
log "Stopping containers..."

if docker ps -q --filter "name=${CONTAINER_OPENWEBUI}" | grep -q .; then
    docker stop "${CONTAINER_OPENWEBUI}" 2>&1 | tee -a "${LOG_FILE}"
fi

if docker ps -q --filter "name=${CONTAINER_REDIS}" | grep -q .; then
    docker stop "${CONTAINER_REDIS}" 2>&1 | tee -a "${LOG_FILE}"
fi

# Remove existing volumes
echo -e "${YELLOW}🗑️  Removing existing volumes...${NC}"
log "Removing existing volumes..."

for volume in "${VOLUME_OPENWEBUI}" "${VOLUME_REDIS}"; do
    if docker volume inspect "${volume}" > /dev/null 2>&1; then
        docker volume rm "${volume}" 2>&1 | tee -a "${LOG_FILE}"
    fi
done

# Create new volumes
echo -e "${YELLOW}📦 Creating new volumes...${NC}"
log "Creating new volumes..."

docker volume create "${VOLUME_OPENWEBUI}" 2>&1 | tee -a "${LOG_FILE}"
docker volume create "${VOLUME_REDIS}" 2>&1 | tee -a "${LOG_FILE}"

# Restore Open WebUI
echo -e "${YELLOW}🔄 Restoring Open WebUI data...${NC}"
log "Restoring Open WebUI volume..."

docker run --rm \
    -v "${VOLUME_OPENWEBUI}:/data" \
    -v "${TEMP_DIR}:/backup:ro" \
    alpine \
    sh -c "cd /data && tar xzf /backup/openwebui.tar.gz" 2>&1 | tee -a "${LOG_FILE}"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    echo -e "${RED}❌ Error: Failed to restore Open WebUI volume${NC}"
    exit 1
fi

# Restore Redis
echo -e "${YELLOW}🔄 Restoring Redis data...${NC}"
log "Restoring Redis volume..."

docker run --rm \
    -v "${VOLUME_REDIS}:/data" \
    -v "${TEMP_DIR}:/backup:ro" \
    alpine \
    sh -c "cd /data && tar xzf /backup/redis.tar.gz" 2>&1 | tee -a "${LOG_FILE}"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    echo -e "${RED}❌ Error: Failed to restore Redis volume${NC}"
    exit 1
fi

# Start containers
echo -e "${YELLOW}🚀 Starting containers...${NC}"
log "Starting containers..."

cd /opt/smartfarm
docker-compose up -d 2>&1 | tee -a "${LOG_FILE}"

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 5

# Health check
MAX_ATTEMPTS=12
ATTEMPT=0
HEALTH_OK=false

while [[ ${ATTEMPT} -lt ${MAX_ATTEMPTS} ]]; do
    if docker ps -q --filter "name=${CONTAINER_OPENWEBUI}" --filter "health=healthy" | grep -q .; then
        HEALTH_OK=true
        break
    fi

    ((ATTEMPT++))
    echo -e "${YELLOW}   Attempt ${ATTEMPT}/${MAX_ATTEMPTS}...${NC}"
    sleep 5
done

# Check final status
echo ""
if docker ps -q --filter "name=${CONTAINER_OPENWEBUI}" | grep -q . && \
   docker ps -q --filter "name=${CONTAINER_REDIS}" | grep -q .; then

    if [[ "${HEALTH_OK}" == "true" ]]; then
        echo -e "${GREEN}✅ Restore completed successfully!${NC}"
        echo ""
        echo -e "${GREEN}🌐 Open WebUI is available at:${NC}"
        echo -e "   Local:      http://localhost:3001"
        echo -e "   Production: https://smartfarm.autonomos.dev"
        log "=== Restore Completed Successfully ==="
    else
        echo -e "${YELLOW}⚠️  Containers started but health check pending${NC}"
        echo -e "${YELLOW}Check status with: docker ps${NC}"
        log "Restore completed with warnings - health check pending"
    fi
else
    echo -e "${RED}❌ Error: Containers failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    log "ERROR: Restore failed - containers did not start"
    exit 1
fi

exit 0
