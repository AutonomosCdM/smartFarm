#!/bin/bash
# Deploy CloudWatch monitoring to SmartFarm production
# Run this script locally, it will SSH to production and install everything

set -e

REGION="us-east-1"
SSH_KEY="~/Downloads/smartfarm-key.pem"
SSH_HOST="ubuntu@98.87.30.163"
SNS_TOPIC="arn:aws:sns:us-east-1:586794472237:smartfarm-alerts"

echo "=== SmartFarm CloudWatch Monitoring Deployment ==="
echo ""

# Check SSH access
echo "1. Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$SSH_HOST" "echo 'SSH OK'" 2>/dev/null; then
  echo "❌ Cannot connect to production server"
  exit 1
fi
echo "   ✓ SSH connection verified"
echo ""

# Upload CloudWatch agent config
echo "2. Uploading CloudWatch agent configuration..."
ssh -i "$SSH_KEY" "$SSH_HOST" "sudo mkdir -p /tmp/monitoring"

cat << 'AGENTCONFIG' | ssh -i "$SSH_KEY" "$SSH_HOST" "sudo tee /tmp/monitoring/cloudwatch-config.json > /dev/null"
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "cwagent"
  },
  "metrics": {
    "namespace": "SmartFarm/Instance",
    "metrics_collected": {
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MemoryUtilization",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "swap": {
        "measurement": [
          {
            "name": "swap_used",
            "rename": "SwapUsed",
            "unit": "Bytes"
          },
          {
            "name": "swap_used_percent",
            "rename": "SwapUtilization",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DiskUtilization",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 300,
        "resources": [
          "/"
        ]
      }
    },
    "aggregation_dimensions": [
      []
    ]
  }
}
AGENTCONFIG

echo "   ✓ Configuration uploaded"
echo ""

# Install CloudWatch agent
echo "3. Installing CloudWatch agent..."
ssh -i "$SSH_KEY" "$SSH_HOST" << 'INSTALL'
set -e
cd /tmp
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb 2>&1 | grep -v "Selecting previously unselected" || true
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc/
sudo cp /tmp/monitoring/cloudwatch-config.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
echo "CloudWatch agent installed"
INSTALL

echo "   ✓ Agent installed"
echo ""

# Start CloudWatch agent
echo "4. Starting CloudWatch agent..."
ssh -i "$SSH_KEY" "$SSH_HOST" << 'START'
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json 2>&1 | tail -5
START

echo "   ✓ Agent started"
echo ""

# Verify agent is running
echo "5. Verifying agent status..."
ssh -i "$SSH_KEY" "$SSH_HOST" "sudo systemctl status amazon-cloudwatch-agent | head -3" || echo "   (systemctl not available, checking process...)"
ssh -i "$SSH_KEY" "$SSH_HOST" "ps aux | grep cloudwatch-agent | grep -v grep" | head -1 && echo "   ✓ Agent is running"
echo ""

echo "=== Agent Installation Complete ==="
echo ""
echo "Wait 2-3 minutes for metrics to appear in CloudWatch."
echo "Then run: ./create_alarms.sh"
