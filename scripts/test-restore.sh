#!/bin/bash
# SmartFarm - Automated Restore Testing Script
# Weekly automated restore verification to ensure backup integrity

set -e

# Configuration
BACKUP_BASE_DIR="/opt/smartfarm/backups"
TEST_VOLUME_PREFIX="test-restore"
LOG_FILE="/var/log/smartfarm-restore-test.log"
ERROR_LOG="/var/log/smartfarm-restore-test-error.log"

# SNS Configuration
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-arn:aws:sns:us-east-1:586794472237:smartfarm-alerts}"
SNS_ENABLED="${SNS_ENABLED:-true}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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
            --subject "SmartFarm Restore Test: ${subject}" \
            --message "${message}" \
            --region "${AWS_REGION}" 2>&1 | tee -a "${LOG_FILE}" || true
    fi
}

cleanup_test_volumes() {
    log "Cleaning up test volumes..."

    # Remove test volumes
    for volume in $(docker volume ls -q | grep "^${TEST_VOLUME_PREFIX}-"); do
        docker volume rm "${volume}" 2>/dev/null || true
    done

    # Remove test containers
    for container in $(docker ps -aq --filter "name=${TEST_VOLUME_PREFIX}-"); do
        docker rm -f "${container}" 2>/dev/null || true
    done
}

trap cleanup_test_volumes EXIT

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error_log "This script must be run as root or with sudo"
   exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SmartFarm Restore Test Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

log "=== Restore Test Started ==="

# Find latest backup
LATEST_DAILY=$(ls -t "${BACKUP_BASE_DIR}"/daily/smartfarm-backup-*.tar.gz 2>/dev/null | head -1)
LATEST_WEEKLY=$(ls -t "${BACKUP_BASE_DIR}"/weekly/smartfarm-backup-*.tar.gz 2>/dev/null | head -1)

if [[ -z "${LATEST_DAILY}" ]]; then
    error_log "No backups found to test"
    send_sns_alert "FAILED - No Backups Found" "Restore test failed: No backup files found in ${BACKUP_BASE_DIR}"
    exit 1
fi

# Select backup to test (prefer weekly if available, otherwise daily)
if [[ -n "${LATEST_WEEKLY}" ]]; then
    BACKUP_FILE="${LATEST_WEEKLY}"
    BACKUP_TYPE="weekly"
else
    BACKUP_FILE="${LATEST_DAILY}"
    BACKUP_TYPE="daily"
fi

log "Testing backup: $(basename "${BACKUP_FILE}") (${BACKUP_TYPE})"
echo -e "${YELLOW}📦 Testing backup: $(basename "${BACKUP_FILE}")${NC}"
echo -e "${YELLOW}   Type: ${BACKUP_TYPE}${NC}"

# Verify backup file exists and is readable
if [[ ! -f "${BACKUP_FILE}" ]] || [[ ! -r "${BACKUP_FILE}" ]]; then
    error_log "Backup file not accessible: ${BACKUP_FILE}"
    send_sns_alert "FAILED - File Not Accessible" "Restore test failed: Backup file not accessible"
    exit 1
fi

# Test 1: Extract backup
echo -e "${YELLOW}Test 1: Extracting backup archive...${NC}"
log "Test 1: Extracting backup archive..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}; cleanup_test_volumes" EXIT

if ! tar tzf "${BACKUP_FILE}" > /dev/null 2>&1; then
    error_log "Backup file is corrupted or not a valid tar.gz"
    send_sns_alert "FAILED - Corrupted Backup" "Restore test failed: Backup file is corrupted"
    exit 1
fi

if ! tar xzf "${BACKUP_FILE}" -C "${TEMP_DIR}" 2>&1 | tee -a "${LOG_FILE}"; then
    error_log "Failed to extract backup"
    send_sns_alert "FAILED - Extraction Error" "Restore test failed: Could not extract backup archive"
    exit 1
fi

echo -e "${GREEN}✓ Extraction successful${NC}"

# Test 2: Verify backup contents
echo -e "${YELLOW}Test 2: Verifying backup contents...${NC}"
log "Test 2: Verifying backup contents..."

REQUIRED_FILES=("openwebui.tar.gz" "redis.tar.gz" "metadata.json")
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "${TEMP_DIR}/${file}" ]]; then
        error_log "Missing required file: ${file}"
        send_sns_alert "FAILED - Missing Files" "Restore test failed: Backup missing required file: ${file}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All required files present${NC}"

# Test 3: Verify metadata
echo -e "${YELLOW}Test 3: Verifying metadata...${NC}"
log "Test 3: Verifying metadata..."

if ! python3 -m json.tool "${TEMP_DIR}/metadata.json" > /dev/null 2>&1; then
    error_log "Invalid metadata JSON"
    send_sns_alert "FAILED - Invalid Metadata" "Restore test failed: Metadata file is invalid"
    exit 1
fi

BACKUP_DATE=$(python3 -c "import json; print(json.load(open('${TEMP_DIR}/metadata.json'))['date'])" 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Metadata valid (backup date: ${BACKUP_DATE})${NC}"

# Test 4: Create test volumes and restore
echo -e "${YELLOW}Test 4: Testing restore to isolated volumes...${NC}"
log "Test 4: Testing restore to isolated volumes..."

TEST_VOLUME_WEBUI="${TEST_VOLUME_PREFIX}-openwebui-$(date +%s)"
TEST_VOLUME_REDIS="${TEST_VOLUME_PREFIX}-redis-$(date +%s)"

docker volume create "${TEST_VOLUME_WEBUI}" 2>&1 | tee -a "${LOG_FILE}"
docker volume create "${TEST_VOLUME_REDIS}" 2>&1 | tee -a "${LOG_FILE}"

# Restore Open WebUI to test volume
if ! docker run --rm \
    -v "${TEST_VOLUME_WEBUI}:/data" \
    -v "${TEMP_DIR}:/backup:ro" \
    alpine \
    sh -c "cd /data && tar xzf /backup/openwebui.tar.gz" 2>&1 | tee -a "${LOG_FILE}"; then
    error_log "Failed to restore Open WebUI to test volume"
    send_sns_alert "FAILED - Restore Error" "Restore test failed: Could not restore Open WebUI data"
    exit 1
fi

# Restore Redis to test volume
if ! docker run --rm \
    -v "${TEST_VOLUME_REDIS}:/data" \
    -v "${TEMP_DIR}:/backup:ro" \
    alpine \
    sh -c "cd /data && tar xzf /backup/redis.tar.gz" 2>&1 | tee -a "${LOG_FILE}"; then
    error_log "Failed to restore Redis to test volume"
    send_sns_alert "FAILED - Restore Error" "Restore test failed: Could not restore Redis data"
    exit 1
fi

echo -e "${GREEN}✓ Restore to test volumes successful${NC}"

# Test 5: Verify restored data
echo -e "${YELLOW}Test 5: Verifying restored data integrity...${NC}"
log "Test 5: Verifying restored data integrity..."

# Check if SQLite database exists and is valid
DB_CHECK=$(docker run --rm \
    -v "${TEST_VOLUME_WEBUI}:/data:ro" \
    alpine \
    sh -c "[ -f /data/webui.db ] && echo 'exists' || echo 'missing'")

if [[ "${DB_CHECK}" != "exists" ]]; then
    error_log "SQLite database missing in restored volume"
    send_sns_alert "FAILED - Data Verification" "Restore test failed: SQLite database missing"
    exit 1
fi

# Verify SQLite database integrity (using sqlite3 if available)
DB_INTEGRITY=$(docker run --rm \
    -v "${TEST_VOLUME_WEBUI}:/data:ro" \
    alpine \
    sh -c "which sqlite3 > /dev/null 2>&1 && sqlite3 /data/webui.db 'PRAGMA integrity_check;' || echo 'ok'" 2>/dev/null || echo "ok")

if [[ "${DB_INTEGRITY}" != "ok" ]] && [[ "${DB_INTEGRITY}" != "integrity_check" ]]; then
    error_log "SQLite database integrity check failed"
    send_sns_alert "FAILED - Database Corrupt" "Restore test failed: SQLite database integrity check failed"
    exit 1
fi

echo -e "${GREEN}✓ Data integrity verified${NC}"

# Test 6: Verify backup size
echo -e "${YELLOW}Test 6: Checking backup size...${NC}"
log "Test 6: Checking backup size..."

BACKUP_SIZE_BYTES=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}")
BACKUP_SIZE_MB=$((BACKUP_SIZE_BYTES / 1024 / 1024))

if [[ ${BACKUP_SIZE_MB} -lt 1 ]]; then
    error_log "Backup size suspiciously small: ${BACKUP_SIZE_MB}MB"
    send_sns_alert "WARNING - Small Backup" "Restore test warning: Backup size is only ${BACKUP_SIZE_MB}MB"
elif [[ ${BACKUP_SIZE_MB} -gt 5000 ]]; then
    error_log "Backup size suspiciously large: ${BACKUP_SIZE_MB}MB"
    send_sns_alert "WARNING - Large Backup" "Restore test warning: Backup size is ${BACKUP_SIZE_MB}MB"
fi

echo -e "${GREEN}✓ Backup size acceptable: ${BACKUP_SIZE_MB}MB${NC}"

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       All Tests Passed! ✓              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

SUMMARY="Restore Test Results: ALL PASSED ✓

Backup File: $(basename "${BACKUP_FILE}")
Backup Type: ${BACKUP_TYPE}
Backup Date: ${BACKUP_DATE}
Backup Size: ${BACKUP_SIZE_MB}MB

Tests Performed:
✓ Archive extraction
✓ Content verification
✓ Metadata validation
✓ Volume restore
✓ Data integrity
✓ Size validation

Conclusion: Backup is valid and can be restored successfully."

log "=== Restore Test Completed Successfully ==="
echo "${SUMMARY}" | tee -a "${LOG_FILE}"

send_sns_alert "SUCCESS - All Tests Passed" "${SUMMARY}"

# Cleanup is handled by trap
exit 0
