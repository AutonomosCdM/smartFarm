#!/bin/bash
# SmartFarm - Install Backup Automation
# Sets up automated daily backups with cron jobs

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SMARTFARM_DIR="/opt/smartfarm"
BACKUP_BASE_DIR="${SMARTFARM_DIR}/backups"
CRON_USER="root"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-arn:aws:sns:us-east-1:586794472237:smartfarm-alerts}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  SmartFarm Backup Automation Installer ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ Error: This script must be run as root or with sudo${NC}"
   exit 1
fi

# Verify we're in the right directory
if [[ ! -d "${SMARTFARM_DIR}" ]]; then
    echo -e "${RED}❌ Error: SmartFarm directory not found at ${SMARTFARM_DIR}${NC}"
    exit 1
fi

cd "${SMARTFARM_DIR}"

# Check if required scripts exist
REQUIRED_SCRIPTS=(
    "scripts/automate-backups.sh"
    "scripts/restore-from-backup.sh"
    "scripts/test-restore.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [[ ! -f "${SMARTFARM_DIR}/${script}" ]]; then
        echo -e "${RED}❌ Error: Required script not found: ${script}${NC}"
        exit 1
    fi

    # Ensure executable
    chmod +x "${SMARTFARM_DIR}/${script}"
done

echo -e "${GREEN}✓ All required scripts found${NC}"

# Create backup directories
echo -e "${YELLOW}📁 Creating backup directories...${NC}"
mkdir -p "${BACKUP_BASE_DIR}"/{daily,weekly,monthly}
echo -e "${GREEN}✓ Backup directories created${NC}"

# Create log directory
echo -e "${YELLOW}📝 Setting up logging...${NC}"
touch /var/log/smartfarm-backup.log
touch /var/log/smartfarm-backup-error.log
touch /var/log/smartfarm-restore-test.log
touch /var/log/smartfarm-restore-test-error.log
chmod 644 /var/log/smartfarm-*.log
echo -e "${GREEN}✓ Log files created${NC}"

# Setup environment variables
echo -e "${YELLOW}⚙️  Configuring environment...${NC}"

if [[ ! -f "${SMARTFARM_DIR}/.env" ]]; then
    echo -e "${YELLOW}   Creating .env file...${NC}"
    cp "${SMARTFARM_DIR}/.env.example" "${SMARTFARM_DIR}/.env" || true
fi

# Check if backup config exists in .env
if ! grep -q "SNS_TOPIC_ARN" "${SMARTFARM_DIR}/.env" 2>/dev/null; then
    echo "" >> "${SMARTFARM_DIR}/.env"
    echo "# Backup Configuration" >> "${SMARTFARM_DIR}/.env"
    echo "SNS_TOPIC_ARN=${SNS_TOPIC_ARN}" >> "${SMARTFARM_DIR}/.env"
    echo "SNS_ENABLED=true" >> "${SMARTFARM_DIR}/.env"
    echo "AWS_REGION=${AWS_REGION}" >> "${SMARTFARM_DIR}/.env"
    echo "" >> "${SMARTFARM_DIR}/.env"
    echo "# S3 Backup (optional - run setup-s3-backups.sh first)" >> "${SMARTFARM_DIR}/.env"
    echo "S3_ENABLED=false" >> "${SMARTFARM_DIR}/.env"
    echo "S3_BUCKET=smartfarm-backups" >> "${SMARTFARM_DIR}/.env"
fi

echo -e "${GREEN}✓ Environment configured${NC}"

# Setup cron jobs
echo -e "${YELLOW}⏰ Setting up cron jobs...${NC}"

# Remove old cron entries (if any)
crontab -u ${CRON_USER} -l 2>/dev/null | grep -v "smartfarm.*backup" | crontab -u ${CRON_USER} - || true

# Create new cron entries
CRON_TEMP=$(mktemp)

# Get existing crontab
crontab -u ${CRON_USER} -l 2>/dev/null > "${CRON_TEMP}" || true

# Add SmartFarm backup cron jobs
cat >> "${CRON_TEMP}" <<EOF

# SmartFarm Automated Backups
# Daily backup at 2:00 AM UTC
0 2 * * * cd ${SMARTFARM_DIR} && . ./.env && ${SMARTFARM_DIR}/scripts/automate-backups.sh >> /var/log/smartfarm-backup.log 2>> /var/log/smartfarm-backup-error.log

# Weekly restore test on Sundays at 3:00 AM UTC
0 3 * * 0 cd ${SMARTFARM_DIR} && . ./.env && ${SMARTFARM_DIR}/scripts/test-restore.sh >> /var/log/smartfarm-restore-test.log 2>> /var/log/smartfarm-restore-test-error.log
EOF

# Install new crontab
crontab -u ${CRON_USER} "${CRON_TEMP}"
rm "${CRON_TEMP}"

echo -e "${GREEN}✓ Cron jobs installed${NC}"

# Verify cron installation
echo ""
echo -e "${YELLOW}📋 Installed cron jobs:${NC}"
crontab -u ${CRON_USER} -l | grep -A 2 "SmartFarm Automated Backups" || echo -e "${RED}Warning: Could not display cron jobs${NC}"

# Check AWS CLI
echo ""
echo -e "${YELLOW}🔍 Checking AWS CLI...${NC}"
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✓ AWS CLI installed${NC}"

    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✓ AWS credentials configured${NC}"
        SNS_STATUS="${GREEN}✓ Enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  AWS credentials not configured${NC}"
        echo -e "${YELLOW}   SNS alerts will be disabled until credentials are configured${NC}"
        SNS_STATUS="${YELLOW}⚠️  Disabled (no credentials)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  AWS CLI not installed${NC}"
    echo -e "${YELLOW}   Install with: apt-get install -y awscli${NC}"
    echo -e "${YELLOW}   SNS alerts will be disabled${NC}"
    SNS_STATUS="${YELLOW}⚠️  Disabled (AWS CLI not installed)${NC}"
fi

# Run initial backup
echo ""
read -p "Run initial backup now? (yes/no): " -r
echo ""

if [[ $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${YELLOW}🔄 Running initial backup...${NC}"
    cd "${SMARTFARM_DIR}"
    source ./.env
    bash "${SMARTFARM_DIR}/scripts/automate-backups.sh"
    echo ""
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Installation Complete! ✓         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Backup Automation Configured:${NC}"
echo ""
echo -e "📦 Backup Storage:"
echo -e "   Location:      ${BACKUP_BASE_DIR}"
echo -e "   Daily:         ${BACKUP_BASE_DIR}/daily/ (keep 7)"
echo -e "   Weekly:        ${BACKUP_BASE_DIR}/weekly/ (keep 4)"
echo -e "   Monthly:       ${BACKUP_BASE_DIR}/monthly/ (keep 6)"
echo ""
echo -e "⏰ Schedule:"
echo -e "   Daily Backup:  2:00 AM UTC (daily)"
echo -e "   Restore Test:  3:00 AM UTC (Sundays)"
echo ""
echo -e "📊 Monitoring:"
echo -e "   SNS Alerts:    ${SNS_STATUS}"
echo -e "   Backup Logs:   /var/log/smartfarm-backup.log"
echo -e "   Error Logs:    /var/log/smartfarm-backup-error.log"
echo -e "   Test Logs:     /var/log/smartfarm-restore-test.log"
echo ""
echo -e "🔧 Management Commands:"
echo -e "   Manual Backup:     sudo ${SMARTFARM_DIR}/scripts/automate-backups.sh"
echo -e "   Test Restore:      sudo ${SMARTFARM_DIR}/scripts/test-restore.sh"
echo -e "   Restore Data:      sudo ${SMARTFARM_DIR}/scripts/restore-from-backup.sh --latest"
echo -e "   List Backups:      sudo ${SMARTFARM_DIR}/scripts/restore-from-backup.sh --list"
echo -e "   View Logs:         sudo tail -f /var/log/smartfarm-backup.log"
echo ""
echo -e "💰 Optional S3 Offsite Backups:"
echo -e "   Setup S3:          sudo ${SMARTFARM_DIR}/scripts/setup-s3-backups.sh"
echo -e "   Estimated Cost:    < \$0.25/month"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. ✓ Backups will run automatically every day at 2 AM UTC"
echo -e "2. ✓ Restore tests will run every Sunday at 3 AM UTC"
echo -e "3. ${YELLOW}Optional:${NC} Run ./scripts/setup-s3-backups.sh for S3 offsite backups"
echo -e "4. ${YELLOW}Optional:${NC} Configure SNS email subscription (check admin@autonomos.dev)"
echo ""

exit 0
