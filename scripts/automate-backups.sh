#!/bin/bash
# SmartFarm - Automated Backup Script with Retention Policy
# Performs daily backups of Open WebUI data, Redis data, and SQLite database
# Implements 7-daily, 4-weekly, 6-monthly retention policy

set -e

# Configuration
BACKUP_BASE_DIR="/opt/smartfarm/backups"
DAILY_DIR="${BACKUP_BASE_DIR}/daily"
WEEKLY_DIR="${BACKUP_BASE_DIR}/weekly"
MONTHLY_DIR="${BACKUP_BASE_DIR}/monthly"
VOLUME_OPENWEBUI="open-webui"
VOLUME_REDIS="smartfarm-redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_TODAY=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)
BACKUP_FILE="smartfarm-backup-${TIMESTAMP}.tar.gz"
LOG_FILE="/var/log/smartfarm-backup.log"
ERROR_LOG="/var/log/smartfarm-backup-error.log"

# SNS Configuration (for alerts)
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-arn:aws:sns:us-east-1:586794472237:smartfarm-alerts}"
SNS_ENABLED="${SNS_ENABLED:-true}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# S3 Configuration (optional)
S3_ENABLED="${S3_ENABLED:-false}"
S3_BUCKET="${S3_BUCKET:-smartfarm-backups}"
S3_PREFIX="backups"

# Retention policy
DAILY_KEEP=7
WEEKLY_KEEP=4
MONTHLY_KEEP=6

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

error_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${ERROR_LOG}" >&2
}

send_sns_alert() {
    local subject="$1"
    local message="$2"

    if [[ "${SNS_ENABLED}" == "true" ]] && command -v aws &> /dev/null; then
        aws sns publish \
            --topic-arn "${SNS_TOPIC_ARN}" \
            --subject "SmartFarm Backup: ${subject}" \
            --message "${message}" \
            --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}" || true
    fi
}

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   error_log "This script must be run as root or with sudo"
   exit 1
fi

log "=== SmartFarm Automated Backup Started ==="
log "Timestamp: ${TIMESTAMP}"
log "Backup file: ${BACKUP_FILE}"

# Create backup directories
mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}" "${MONTHLY_DIR}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    error_log "Docker is not running"
    send_sns_alert "FAILED - Docker Not Running" "Backup failed: Docker daemon is not running"
    exit 1
fi

# Check if volumes exist
for volume in "${VOLUME_OPENWEBUI}" "${VOLUME_REDIS}"; do
    if ! docker volume inspect "${volume}" > /dev/null 2>&1; then
        error_log "Volume '${volume}' not found"
        send_sns_alert "FAILED - Volume Missing" "Backup failed: Docker volume '${volume}' not found"
        exit 1
    fi
done

# Determine backup type and destination
BACKUP_TYPE="daily"
DEST_DIR="${DAILY_DIR}"

if [[ ${DAY_OF_MONTH} -eq 1 ]]; then
    BACKUP_TYPE="monthly"
    DEST_DIR="${MONTHLY_DIR}"
elif [[ ${DAY_OF_WEEK} -eq 7 ]]; then
    BACKUP_TYPE="weekly"
    DEST_DIR="${WEEKLY_DIR}"
fi

log "Backup type: ${BACKUP_TYPE}"
log "Destination: ${DEST_DIR}"

# Create temporary backup directory
TEMP_BACKUP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_BACKUP_DIR}" EXIT

log "Creating temporary backup in ${TEMP_BACKUP_DIR}"

# Backup Open WebUI volume
log "Backing up Open WebUI volume..."
docker run --rm \
    -v "${VOLUME_OPENWEBUI}:/data:ro" \
    -v "${TEMP_BACKUP_DIR}:/backup" \
    alpine \
    tar czf "/backup/openwebui.tar.gz" -C /data . 2>&1 | tee -a "${LOG_FILE}"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    error_log "Failed to backup Open WebUI volume"
    send_sns_alert "FAILED - Open WebUI Backup" "Failed to create Open WebUI volume backup"
    exit 1
fi

# Backup Redis volume
log "Backing up Redis volume..."
docker run --rm \
    -v "${VOLUME_REDIS}:/data:ro" \
    -v "${TEMP_BACKUP_DIR}:/backup" \
    alpine \
    tar czf "/backup/redis.tar.gz" -C /data . 2>&1 | tee -a "${LOG_FILE}"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    error_log "Failed to backup Redis volume"
    send_sns_alert "FAILED - Redis Backup" "Failed to create Redis volume backup"
    exit 1
fi

# Create metadata file
log "Creating backup metadata..."
cat > "${TEMP_BACKUP_DIR}/metadata.json" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "date": "${DATE_TODAY}",
    "backup_type": "${BACKUP_TYPE}",
    "volumes": {
        "openwebui": "${VOLUME_OPENWEBUI}",
        "redis": "${VOLUME_REDIS}"
    },
    "server": "$(hostname)",
    "docker_version": "$(docker --version)",
    "compose_version": "$(docker-compose --version || echo 'N/A')"
}
EOF

# Create final backup archive
log "Creating final backup archive..."
cd "${TEMP_BACKUP_DIR}"
tar czf "${DEST_DIR}/${BACKUP_FILE}" . 2>&1 | tee -a "${LOG_FILE}"

if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
    error_log "Failed to create final backup archive"
    send_sns_alert "FAILED - Archive Creation" "Failed to create final backup archive"
    exit 1
fi

# Calculate backup size
BACKUP_SIZE=$(du -h "${DEST_DIR}/${BACKUP_FILE}" | cut -f1)
log "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Upload to S3 if enabled
if [[ "${S3_ENABLED}" == "true" ]] && command -v aws &> /dev/null; then
    log "Uploading backup to S3..."
    S3_KEY="${S3_PREFIX}/${BACKUP_TYPE}/${BACKUP_FILE}"

    if aws s3 cp "${DEST_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}"; then
        log "S3 upload successful: s3://${S3_BUCKET}/${S3_KEY}"
    else
        error_log "S3 upload failed (backup still saved locally)"
        send_sns_alert "WARNING - S3 Upload Failed" "Backup successful but S3 upload failed. Local backup: ${DEST_DIR}/${BACKUP_FILE}"
    fi
fi

# Apply retention policy
log "Applying retention policy..."

# Daily backups: keep last 7
log "Cleaning daily backups (keeping ${DAILY_KEEP})..."
ls -t "${DAILY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | tail -n +$((DAILY_KEEP + 1)) | while read -r old_backup; do
    log "Removing old daily backup: $(basename "${old_backup}")"
    rm -f "${old_backup}"
done

# Weekly backups: keep last 4
log "Cleaning weekly backups (keeping ${WEEKLY_KEEP})..."
ls -t "${WEEKLY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | tail -n +$((WEEKLY_KEEP + 1)) | while read -r old_backup; do
    log "Removing old weekly backup: $(basename "${old_backup}")"
    rm -f "${old_backup}"
done

# Monthly backups: keep last 6
log "Cleaning monthly backups (keeping ${MONTHLY_KEEP})..."
ls -t "${MONTHLY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | tail -n +$((MONTHLY_KEEP + 1)) | while read -r old_backup; do
    log "Removing old monthly backup: $(basename "${old_backup}")"
    rm -f "${old_backup}"
done

# Count remaining backups
DAILY_COUNT=$(ls -1 "${DAILY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | wc -l)
WEEKLY_COUNT=$(ls -1 "${WEEKLY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | wc -l)
MONTHLY_COUNT=$(ls -1 "${MONTHLY_DIR}"/smartfarm-backup-*.tar.gz 2>/dev/null | wc -l)

log "Retention applied - Daily: ${DAILY_COUNT}, Weekly: ${WEEKLY_COUNT}, Monthly: ${MONTHLY_COUNT}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_BASE_DIR}" | cut -f1)
log "Total backup storage: ${TOTAL_SIZE}"

# Check disk space
DISK_USAGE=$(df -h /opt | awk 'NR==2 {print $5}' | sed 's/%//')
log "Disk usage: ${DISK_USAGE}%"

if [[ ${DISK_USAGE} -gt 90 ]]; then
    error_log "Disk usage critical: ${DISK_USAGE}%"
    send_sns_alert "WARNING - High Disk Usage" "Backup successful but disk usage is ${DISK_USAGE}%. Consider cleanup."
fi

# Send success notification
SUMMARY="Backup completed successfully
Type: ${BACKUP_TYPE}
File: ${BACKUP_FILE}
Size: ${BACKUP_SIZE}
Retention: ${DAILY_COUNT} daily, ${WEEKLY_COUNT} weekly, ${MONTHLY_COUNT} monthly
Total storage: ${TOTAL_SIZE}
Disk usage: ${DISK_USAGE}%"

log "=== Backup Completed Successfully ==="
log "${SUMMARY}"

send_sns_alert "SUCCESS - ${BACKUP_TYPE^} Backup" "${SUMMARY}"

exit 0
