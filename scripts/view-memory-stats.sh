#!/bin/bash
#
# SmartFarm Memory Statistics Viewer
# Quick analysis of collected memory data
# Usage: ./view-memory-stats.sh [entries_count]
#

set -euo pipefail

LOG_FILE="/var/log/smartfarm/memory-usage.log"
ENTRIES_COUNT=${1:-288}  # Default: 288 entries = 24 hours @ 5min intervals

if [[ ! -f "${LOG_FILE}" ]]; then
    echo "ERROR: Log file not found: ${LOG_FILE}"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SmartFarm Memory Statistics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get last N entries (excluding header) and calculate stats
STATS=$(tail -n +2 "${LOG_FILE}" | tail -n "${ENTRIES_COUNT}" | awk -F',' '
{
    count++
    mem_sum += $4
    swap_sum += $5

    if ($4 > mem_max || count == 1) { mem_max = $4; mem_max_time = $1 }
    if ($4 < mem_min || count == 1) { mem_min = $4; mem_min_time = $1 }
    if ($5 > swap_max || count == 1) { swap_max = $5; swap_max_time = $1 }
    if ($5 < swap_min || count == 1) swap_min = $5

    # Track processes
    processes[$8]++
}
END {
    if (count > 0) {
        print count
        print mem_sum/count
        print mem_min
        print mem_max
        print swap_sum/count
        print swap_min
        print swap_max
        print mem_max_time
        print swap_max_time

        # Find most common process
        max_proc_count = 0
        for (proc in processes) {
            if (processes[proc] > max_proc_count) {
                max_proc_count = processes[proc]
                max_proc = proc
            }
        }
        print max_proc
    } else {
        print "0\n0\n0\n0\n0\n0\n0\nN/A\nN/A\nN/A"
    }
}
')

# Parse stats into array
IFS=$'\n' read -r -d '' -a STATS_ARRAY <<< "${STATS}" || true

SAMPLE_COUNT=${STATS_ARRAY[0]:-0}
MEM_AVG=${STATS_ARRAY[1]:-0}
MEM_MIN=${STATS_ARRAY[2]:-0}
MEM_MAX=${STATS_ARRAY[3]:-0}
SWAP_AVG=${STATS_ARRAY[4]:-0}
SWAP_MIN=${STATS_ARRAY[5]:-0}
SWAP_MAX=${STATS_ARRAY[6]:-0}
MEM_MAX_TIME=${STATS_ARRAY[7]:-N/A}
SWAP_MAX_TIME=${STATS_ARRAY[8]:-N/A}
TOP_PROC=${STATS_ARRAY[9]:-unknown}

if [[ "${SAMPLE_COUNT}" == "0" ]]; then
    echo "No data found in log file"
    exit 0
fi

DURATION=$(awk "BEGIN {printf \"%.1f\", ${SAMPLE_COUNT} * 5 / 60}")

printf "📈 Summary:\n"
printf "  Samples: %d (every 5 min)\n" "${SAMPLE_COUNT}"
printf "  Duration: %.1f hours\n" "${DURATION}"
printf "  Most active process: %s\n" "${TOP_PROC}"
echo ""

printf "💾 Memory Usage:\n"
printf "  Average: %.1f%%\n" "${MEM_AVG}"
printf "  Min:     %.1f%%\n" "${MEM_MIN}"
printf "  Max:     %.1f%% (at %s)\n" "${MEM_MAX}" "${MEM_MAX_TIME}"
echo ""

printf "💿 Swap Usage:\n"
printf "  Average: %.0f MB\n" "${SWAP_AVG}"
printf "  Min:     %.0f MB\n" "${SWAP_MIN}"
printf "  Max:     %.0f MB (at %s)\n" "${SWAP_MAX}" "${SWAP_MAX_TIME}"
echo ""

# Alert if concerning patterns
if awk "BEGIN {exit !(${SWAP_AVG:-0} > 100)}" 2>/dev/null; then
    printf "⚠️  WARNING: Swap is actively used (avg %.0fMB)\n" "${SWAP_AVG}"
    echo "   Consider upgrading to 4GB instance"
    echo ""
fi

if awk "BEGIN {exit !(${MEM_MAX:-0} > 90)}" 2>/dev/null; then
    printf "⚠️  WARNING: Memory peaked at %.1f%%\n" "${MEM_MAX}"
    echo "   System may be at risk of OOM"
    echo ""
fi

# Top processes
echo "🔝 Most Common High-Memory Processes:"
tail -n +2 "${LOG_FILE}" | awk -F',' '{print $8}' | sort | uniq -c | sort -rn | head -5 | \
  awk '{printf "  %3d occurrences: %s\n", $1, $2}'
echo ""

# Recent entries
echo "📋 Last 10 Entries:"
tail -n 10 "${LOG_FILE}" | tail -n +2 | awk -F',' '{printf "  %s | Mem: %5.1f%% | Swap: %4dMB | %s\n", $1, $4, $5, $8}'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📁 Full logs: ${LOG_FILE}"
echo "🔍 View details: tail -n 100 /var/log/smartfarm/memory-detail.log"
echo "💡 Tip: Run with number to see N entries (e.g., ./view-memory-stats.sh 576 for 48h)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
