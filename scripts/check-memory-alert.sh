#!/bin/bash
#
# SmartFarm Memory Alert Checker
# Reads latest memory log entry and triggers alerts on thresholds
# Usage: ./check-memory-alert.sh
#
# Thresholds:
#   - RAM usage > 85%
#   - Swap usage > 500MB
#

set -euo pipefail

# Configuration
LOG_FILE="/var/log/smartfarm/memory-usage.log"
ALERT_DIR="/var/log/smartfarm/alerts"
ALERT_FILE="${ALERT_DIR}/memory-alerts.log"
ALERT_STATE="${ALERT_DIR}/.alert-state"

SWAP_THRESHOLD_MB=500
MEM_THRESHOLD_PCT=85.0

# Create alert directory
mkdir -p "${ALERT_DIR}"

# Check if log file exists
if [[ ! -f "${LOG_FILE}" ]]; then
    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - ERROR: Log file not found: ${LOG_FILE}" | tee -a "${ALERT_FILE}"
    exit 1
fi

# Read last line (skip header)
LAST_LINE=$(tail -n 1 "${LOG_FILE}")

# Skip if it's the header
if [[ "${LAST_LINE}" =~ ^timestamp ]]; then
    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - INFO: No data yet (only header)" | tee -a "${ALERT_FILE}"
    exit 0
fi

# Parse CSV fields
IFS=',' read -r TIMESTAMP MEM_USED MEM_TOTAL MEM_PCT SWAP_USED SWAP_TOTAL SWAP_PCT TOP_PROCESS TOP_MEM_PCT <<< "${LAST_LINE}"

# Alert conditions
ALERT_TRIGGERED=false
ALERT_MSG=""

# Check swap usage
if (( $(echo "${SWAP_USED} > ${SWAP_THRESHOLD_MB}" | bc -l 2>/dev/null || echo 0) )); then
    ALERT_TRIGGERED=true
    ALERT_MSG="${ALERT_MSG}\n🔴 SWAP CRITICAL: ${SWAP_USED}MB used (threshold: ${SWAP_THRESHOLD_MB}MB, ${SWAP_PCT}%)"
fi

# Check memory percentage
if (( $(echo "${MEM_PCT} > ${MEM_THRESHOLD_PCT}" | bc -l 2>/dev/null || echo 0) )); then
    ALERT_TRIGGERED=true
    ALERT_MSG="${ALERT_MSG}\n🔴 MEMORY CRITICAL: ${MEM_PCT}% used (threshold: ${MEM_THRESHOLD_PCT}%)"
fi

# Trigger alert
if [[ "${ALERT_TRIGGERED}" == "true" ]]; then
    # Check if we already alerted recently (prevent spam)
    LAST_ALERT_TIME=0
    if [[ -f "${ALERT_STATE}" ]]; then
        LAST_ALERT_TIME=$(cat "${ALERT_STATE}")
    fi

    CURRENT_TIME=$(date +%s)
    TIME_SINCE_ALERT=$((CURRENT_TIME - LAST_ALERT_TIME))

    # Alert every 30 minutes max (1800 seconds)
    if [[ ${TIME_SINCE_ALERT} -gt 1800 ]]; then
        ALERT_OUTPUT="
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 SMARTFARM MEMORY ALERT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Time: ${TIMESTAMP}
${ALERT_MSG}

📊 Current Status:
  Memory: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PCT}%)
  Swap:   ${SWAP_USED}MB / ${SWAP_TOTAL}MB (${SWAP_PCT}%)
  Top Process: ${TOP_PROCESS} (${TOP_MEM_PCT}%)

🔧 Recommended Actions:
  1. Check logs: docker logs open-webui --tail 100
  2. Review processes: docker stats
  3. Consider upgrade if swap consistently used
  4. View details: tail -n 50 /var/log/smartfarm/memory-detail.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"

        # Write to alert log
        echo "${ALERT_OUTPUT}" | tee -a "${ALERT_FILE}"

        # Update alert state
        echo "${CURRENT_TIME}" > "${ALERT_STATE}"

        # Optional: Send to Discord/Slack webhook (uncomment and configure)
        # WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK"
        # curl -X POST "${WEBHOOK_URL}" \
        #   -H "Content-Type: application/json" \
        #   -d "{\"content\": \"${ALERT_OUTPUT}\"}"

        # Optional: Send email (uncomment and configure)
        # echo "${ALERT_OUTPUT}" | mail -s "SmartFarm Memory Alert" admin@autonomos.dev

        exit 2  # Exit with code 2 to indicate alert triggered
    else
        echo "$(date -u +"%Y-%m-%d %H:%M:%S") - INFO: Alert suppressed (last alert ${TIME_SINCE_ALERT}s ago)" >> "${ALERT_FILE}"
        exit 0
    fi
else
    echo "$(date -u +"%Y-%m-%d %H:%M:%S") - OK: Memory=${MEM_PCT}%, Swap=${SWAP_USED}MB" >> "${ALERT_FILE}"
    exit 0
fi
