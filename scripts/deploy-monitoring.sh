#!/bin/bash
#
# SmartFarm Memory Monitoring - One-Command Deployment
# Deploys monitoring scripts and sets up cron jobs on production
# Usage: ./deploy-monitoring.sh
#

set -euo pipefail

# Configuration
SSH_KEY="$HOME/Downloads/smartfarm-key.pem"
SSH_HOST="ubuntu@98.87.30.163"
REMOTE_SCRIPTS_DIR="/opt/smartfarm/scripts"
LOCAL_SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 SmartFarm Memory Monitoring Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify scripts exist locally
REQUIRED_SCRIPTS=(
    "monitor-memory.sh"
    "check-memory-alert.sh"
    "view-memory-stats.sh"
)

echo "📋 Step 1: Verifying local scripts..."
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ ! -f "${LOCAL_SCRIPTS_DIR}/${script}" ]]; then
        echo "❌ ERROR: Missing script: ${script}"
        exit 1
    fi
    echo "  ✓ ${script}"
done
echo ""

# Verify SSH key exists
if [[ ! -f "${SSH_KEY}" ]]; then
    echo "❌ ERROR: SSH key not found: ${SSH_KEY}"
    exit 1
fi

echo "📤 Step 2: Uploading scripts to production..."
scp -i "${SSH_KEY}" \
    "${LOCAL_SCRIPTS_DIR}/monitor-memory.sh" \
    "${LOCAL_SCRIPTS_DIR}/check-memory-alert.sh" \
    "${LOCAL_SCRIPTS_DIR}/view-memory-stats.sh" \
    "${SSH_HOST}:/tmp/"
echo "  ✓ Scripts uploaded"
echo ""

echo "🔧 Step 3: Installing scripts on production..."
ssh -i "${SSH_KEY}" "${SSH_HOST}" bash << 'REMOTE_SCRIPT'
set -euo pipefail

# Move scripts to proper location
sudo mv /tmp/monitor-memory.sh /opt/smartfarm/scripts/
sudo mv /tmp/check-memory-alert.sh /opt/smartfarm/scripts/
sudo mv /tmp/view-memory-stats.sh /opt/smartfarm/scripts/

# Make executable
sudo chmod +x /opt/smartfarm/scripts/monitor-memory.sh
sudo chmod +x /opt/smartfarm/scripts/check-memory-alert.sh
sudo chmod +x /opt/smartfarm/scripts/view-memory-stats.sh

# Set ownership
sudo chown ubuntu:ubuntu /opt/smartfarm/scripts/*.sh

# Create log directory
sudo mkdir -p /var/log/smartfarm/alerts
sudo chown -R ubuntu:ubuntu /var/log/smartfarm

echo "  ✓ Scripts installed"
echo ""

# Test monitoring script
echo "🧪 Step 4: Testing monitoring script..."
/opt/smartfarm/scripts/monitor-memory.sh
if [[ -f /var/log/smartfarm/memory-usage.log ]]; then
    echo "  ✓ Monitoring script working"
    echo ""
    echo "📊 First log entry:"
    tail -1 /var/log/smartfarm/memory-usage.log | sed 's/^/    /'
    echo ""
else
    echo "  ❌ ERROR: Log file not created"
    exit 1
fi

# Test alert script
echo "🧪 Step 5: Testing alert script..."
/opt/smartfarm/scripts/check-memory-alert.sh
echo "  ✓ Alert script working"
echo ""

# Setup cron jobs
echo "🕐 Step 6: Setting up cron jobs..."

# Check if cron entries already exist
if crontab -l 2>/dev/null | grep -q "monitor-memory.sh"; then
    echo "  ℹ️  Cron jobs already exist, skipping..."
else
    # Create temporary crontab file
    crontab -l 2>/dev/null > /tmp/current-crontab || echo "" > /tmp/current-crontab

    # Add monitoring cron jobs
    cat >> /tmp/current-crontab << 'CRON_ENTRIES'

# SmartFarm Memory Monitoring (deployed on 2025-10-17)
# Monitor memory every 5 minutes
*/5 * * * * /opt/smartfarm/scripts/monitor-memory.sh >> /var/log/smartfarm/cron-errors.log 2>&1

# Check alerts every 5 minutes (offset by 1 minute)
1-56/5 * * * * /opt/smartfarm/scripts/check-memory-alert.sh >> /var/log/smartfarm/cron-errors.log 2>&1
CRON_ENTRIES

    # Install new crontab
    crontab /tmp/current-crontab
    rm /tmp/current-crontab

    echo "  ✓ Cron jobs installed"
fi
echo ""

# Display cron configuration
echo "📋 Current cron configuration:"
crontab -l | grep -A2 "SmartFarm Memory" || echo "  (no monitoring jobs found)"
echo ""

REMOTE_SCRIPT

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Next Steps:"
echo ""
echo "1. Wait 10 minutes and verify data collection:"
echo "   ssh -i ${SSH_KEY} ${SSH_HOST} 'tail -20 /var/log/smartfarm/memory-usage.log'"
echo ""
echo "2. View live statistics:"
echo "   ssh -i ${SSH_KEY} ${SSH_HOST} '/opt/smartfarm/scripts/view-memory-stats.sh'"
echo ""
echo "3. Check for alerts:"
echo "   ssh -i ${SSH_KEY} ${SSH_HOST} 'cat /var/log/smartfarm/alerts/memory-alerts.log'"
echo ""
echo "4. Monitor cron execution:"
echo "   ssh -i ${SSH_KEY} ${SSH_HOST} 'cat /var/log/smartfarm/cron-errors.log'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📖 Full documentation: docs/MEMORY_MONITORING.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
