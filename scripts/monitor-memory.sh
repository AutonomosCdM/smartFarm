#!/bin/bash
#
# SmartFarm Memory Monitor
# Collects RAM/swap usage and top processes every 5 minutes
# Usage: ./monitor-memory.sh
#

set -euo pipefail

# Configuration
LOG_DIR="/var/log/smartfarm"
LOG_FILE="${LOG_DIR}/memory-usage.log"
RETENTION_DAYS=7

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Initialize log file with header if it doesn't exist
if [[ ! -f "${LOG_FILE}" ]]; then
    echo "timestamp,mem_used_mb,mem_total_mb,mem_pct,swap_used_mb,swap_total_mb,swap_pct,top_process,top_mem_pct" > "${LOG_FILE}"
fi

# Rotate old logs (keep last N days)
find "${LOG_DIR}" -name "memory-usage.log.*" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# Rotate if log is > 10MB
if [[ -f "${LOG_FILE}" ]] && [[ $(stat -f%z "${LOG_FILE}" 2>/dev/null || stat -c%s "${LOG_FILE}" 2>/dev/null || echo 0) -gt 10485760 ]]; then
    mv "${LOG_FILE}" "${LOG_FILE}.$(date +%Y%m%d-%H%M%S)"
    echo "timestamp,mem_used_mb,mem_total_mb,mem_pct,swap_used_mb,swap_total_mb,swap_pct,top_process,top_mem_pct" > "${LOG_FILE}"
fi

# Collect memory stats
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S")

# Parse free output (works on both Linux and macOS)
FREE_OUTPUT=$(free -m 2>/dev/null || vm_stat 2>/dev/null | awk '
    /Pages active/ { active = $3 }
    /Pages inactive/ { inactive = $3 }
    /Pages wired/ { wired = $4 }
    /Pages free/ { free = $3 }
    END {
        page_size = 4096
        used_mb = int((active + inactive + wired) * page_size / 1024 / 1024)
        total_mb = int((active + inactive + wired + free) * page_size / 1024 / 1024)
        print used_mb " " total_mb " 0 0"
    }
')

# For Linux systems
if command -v free &> /dev/null; then
    MEM_USED=$(free -m | awk '/^Mem:/ {print $3}')
    MEM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
    SWAP_USED=$(free -m | awk '/^Swap:/ {print $3}')
    SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
else
    # Fallback for macOS (development)
    read MEM_USED MEM_TOTAL SWAP_USED SWAP_TOTAL <<< "${FREE_OUTPUT}"
fi

# Calculate percentages (avoid division by zero)
MEM_PCT=0
SWAP_PCT=0
[[ ${MEM_TOTAL} -gt 0 ]] && MEM_PCT=$(awk "BEGIN {printf \"%.1f\", ($MEM_USED/$MEM_TOTAL)*100}")
[[ ${SWAP_TOTAL} -gt 0 ]] && SWAP_PCT=$(awk "BEGIN {printf \"%.1f\", ($SWAP_USED/$SWAP_TOTAL)*100}")

# Get top memory process (cross-platform)
if command -v ps &> /dev/null; then
    TOP_PROCESS=$(ps aux --sort=-%mem 2>/dev/null | awk 'NR==2 {print $11}' | sed 's/,/_/g' || \
                  ps aux -m 2>/dev/null | awk 'NR==2 {print $11}' | sed 's/,/_/g' || \
                  echo "unknown")
    TOP_MEM_PCT=$(ps aux --sort=-%mem 2>/dev/null | awk 'NR==2 {print $4}' || \
                  ps aux -m 2>/dev/null | awk 'NR==2 {print $4}' || \
                  echo "0")
else
    TOP_PROCESS="unknown"
    TOP_MEM_PCT="0"
fi

# Clean process name (remove path, limit length)
TOP_PROCESS=$(basename "${TOP_PROCESS}" | cut -c1-50)

# Write to temp file then atomic move (prevent corruption)
TMP_FILE="${LOG_FILE}.tmp.$$"
echo "${TIMESTAMP},${MEM_USED},${MEM_TOTAL},${MEM_PCT},${SWAP_USED},${SWAP_TOTAL},${SWAP_PCT},${TOP_PROCESS},${TOP_MEM_PCT}" > "${TMP_FILE}"
cat "${TMP_FILE}" >> "${LOG_FILE}"
rm -f "${TMP_FILE}"

# Optional: Log top 5 processes (detailed log)
DETAIL_LOG="${LOG_DIR}/memory-detail.log"
{
    echo "=== Memory Snapshot: ${TIMESTAMP} ==="
    echo "Memory: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PCT}%)"
    echo "Swap: ${SWAP_USED}MB / ${SWAP_TOTAL}MB (${SWAP_PCT}%)"
    echo ""
    echo "Top 5 Processes:"
    ps aux --sort=-%mem 2>/dev/null | head -6 | awk 'NR>1 {printf "  %5.1f%% %s\n", $4, $11}' || \
    ps aux -m 2>/dev/null | head -6 | awk 'NR>1 {printf "  %5.1f%% %s\n", $4, $11}' || \
    echo "  (unavailable)"
    echo ""
} >> "${DETAIL_LOG}"

# Rotate detail log if > 50MB
if [[ -f "${DETAIL_LOG}" ]] && [[ $(stat -f%z "${DETAIL_LOG}" 2>/dev/null || stat -c%s "${DETAIL_LOG}" 2>/dev/null || echo 0) -gt 52428800 ]]; then
    tail -n 5000 "${DETAIL_LOG}" > "${DETAIL_LOG}.tmp"
    mv "${DETAIL_LOG}.tmp" "${DETAIL_LOG}"
fi

exit 0
