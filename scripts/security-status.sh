#!/bin/bash
# SmartFarm Security Status Dashboard
# Quick security status check for production server
# Usage: ./scripts/security-status.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server details
SERVER="ubuntu@98.87.30.163"
SSH_KEY="$HOME/Downloads/smartfarm-key.pem"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SmartFarm Production Server - Security Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check SSH connectivity
echo -e "${YELLOW}Testing SSH connectivity...${NC}"
if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$SERVER" "echo ''" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to server${NC}"
    exit 1
fi
echo ""

# Run security checks on server
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  1. fail2ban Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check fail2ban service
if systemctl is-active --quiet fail2ban; then
    echo -e "${GREEN}✅ fail2ban service: RUNNING${NC}"

    # Get jail status
    FAILED=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Currently failed" | awk '{print $4}')
    BANNED=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Currently banned" | awk '{print $4}')
    TOTAL_FAILED=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Total failed" | awk '{print $4}')
    TOTAL_BANNED=$(sudo fail2ban-client status sshd 2>/dev/null | grep "Total banned" | awk '{print $4}')

    echo -e "   Currently failed attempts: ${YELLOW}${FAILED}${NC}"
    echo -e "   Currently banned IPs: ${YELLOW}${BANNED}${NC}"
    echo -e "   Total failed attempts: ${TOTAL_FAILED}"
    echo -e "   Total banned IPs: ${TOTAL_BANNED}"

    # Show banned IPs if any
    if [ "$BANNED" != "0" ]; then
        echo -e "${YELLOW}   Banned IP addresses:${NC}"
        sudo fail2ban-client status sshd | grep "Banned IP list" | cut -d: -f2
    fi
else
    echo -e "${RED}❌ fail2ban service: NOT RUNNING${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  2. SSH Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check SSH hardening
PASS_AUTH=$(sudo sshd -T | grep "^passwordauthentication" | awk '{print $2}')
ROOT_LOGIN=$(sudo sshd -T | grep "^permitrootlogin" | awk '{print $2}')
PUBKEY_AUTH=$(sudo sshd -T | grep "^pubkeyauthentication" | awk '{print $2}')
MAX_TRIES=$(sudo sshd -T | grep "^maxauthtries" | awk '{print $2}')

if [ "$PASS_AUTH" == "no" ]; then
    echo -e "${GREEN}✅ Password authentication: DISABLED${NC}"
else
    echo -e "${RED}❌ Password authentication: ENABLED (INSECURE)${NC}"
fi

if [ "$ROOT_LOGIN" == "no" ]; then
    echo -e "${GREEN}✅ Root login: DISABLED${NC}"
else
    echo -e "${RED}❌ Root login: ENABLED (INSECURE)${NC}"
fi

if [ "$PUBKEY_AUTH" == "yes" ]; then
    echo -e "${GREEN}✅ Public key authentication: ENABLED${NC}"
else
    echo -e "${RED}❌ Public key authentication: DISABLED${NC}"
fi

echo -e "   Max authentication tries: ${MAX_TRIES}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  3. CloudWatch Agent${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check CloudWatch agent
if systemctl is-active --quiet amazon-cloudwatch-agent; then
    echo -e "${GREEN}✅ CloudWatch agent: RUNNING${NC}"

    # Get agent details
    AGENT_STATUS=$(sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status -m ec2 2>/dev/null)
    VERSION=$(echo "$AGENT_STATUS" | grep -oP '"version": "\K[^"]+' || echo "unknown")
    STARTTIME=$(echo "$AGENT_STATUS" | grep -oP '"starttime": "\K[^"]+' || echo "unknown")

    echo -e "   Version: ${VERSION}"
    echo -e "   Started: ${STARTTIME}"
    echo -e "   Monitoring:"
    echo -e "     - /var/log/auth.log → /aws/ec2/smartfarm/ssh"
    echo -e "     - /var/log/fail2ban.log → /aws/ec2/smartfarm/fail2ban"
else
    echo -e "${RED}❌ CloudWatch agent: NOT RUNNING${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  4. Recent Security Events (Last 24 Hours)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Count recent failed attempts
FAILED_24H=$(sudo grep "Failed password" /var/log/auth.log 2>/dev/null | grep "$(date -d '24 hours ago' '+%b %d')" | wc -l)
INVALID_USER_24H=$(sudo grep "Invalid user" /var/log/auth.log 2>/dev/null | grep "$(date -d '24 hours ago' '+%b %d')" | wc -l)
ACCEPTED_24H=$(sudo grep "Accepted publickey" /var/log/auth.log 2>/dev/null | grep "$(date -d '24 hours ago' '+%b %d')" | wc -l)

echo -e "   Failed login attempts: ${YELLOW}${FAILED_24H}${NC}"
echo -e "   Invalid user attempts: ${YELLOW}${INVALID_USER_24H}${NC}"
echo -e "   Successful connections: ${GREEN}${ACCEPTED_24H}${NC}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  5. System Resources${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# System resources
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

echo -e "   Memory usage: ${MEM_USAGE}%"
echo -e "   Disk usage: ${DISK_USAGE}%"
echo -e "   Load average (1m): ${LOAD_AVG}"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Security Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Overall security status
ISSUES=0

if ! systemctl is-active --quiet fail2ban; then
    echo -e "${RED}⚠️  fail2ban is not running - start with: sudo systemctl start fail2ban${NC}"
    ((ISSUES++))
fi

if [ "$PASS_AUTH" != "no" ]; then
    echo -e "${RED}⚠️  Password authentication is enabled - SECURITY RISK${NC}"
    ((ISSUES++))
fi

if [ "$ROOT_LOGIN" != "no" ]; then
    echo -e "${RED}⚠️  Root login is enabled - SECURITY RISK${NC}"
    ((ISSUES++))
fi

if ! systemctl is-active --quiet amazon-cloudwatch-agent; then
    echo -e "${YELLOW}⚠️  CloudWatch agent is not running - logs not being sent${NC}"
    ((ISSUES++))
fi

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ All security systems operational${NC}"
    echo -e "${GREEN}✅ Server is properly hardened${NC}"
else
    echo -e "${YELLOW}⚠️  ${ISSUES} issue(s) detected - please review above${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

REMOTE_SCRIPT

echo -e "${GREEN}Security status check complete!${NC}"
echo ""
echo -e "For detailed documentation, see: ${BLUE}docs/security/SSH_HARDENING_REPORT.md${NC}"
echo ""
