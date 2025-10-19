#!/bin/bash
# Create CloudWatch alarms for SmartFarm monitoring

set -e

REGION="us-east-1"
SNS_TOPIC="arn:aws:sns:us-east-1:586794472237:smartfarm-alerts"
NAMESPACE="SmartFarm/Instance"

# Get instance ID from Lightsail
INSTANCE_ID=$(aws lightsail get-instance --instance-name smartfarm --region us-east-1 --query 'instance.name' --output text)

echo "=== Creating CloudWatch Alarms for SmartFarm ==="
echo ""
echo "Instance: $INSTANCE_ID"
echo "SNS Topic: $SNS_TOPIC"
echo "Namespace: $NAMESPACE"
echo ""

# Alarm 1: High Memory Usage
echo "1. Creating alarm: High Memory Usage (>85% for 5 minutes)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Memory-High" \
  --alarm-description "Memory usage >85% for 5 minutes - potential OOM risk" \
  --namespace "$NAMESPACE" \
  --metric-name MemoryUtilization \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --ok-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 2: High Swap Usage
echo ""
echo "2. Creating alarm: High Swap Usage (>500MB for 5 minutes)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Swap-High" \
  --alarm-description "Swap usage >500MB - memory pressure detected" \
  --namespace "$NAMESPACE" \
  --metric-name SwapUsed \
  --statistic Average \
  --period 300 \
  --threshold 524288000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --ok-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --unit Bytes \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 3: Critical Swap Usage
echo ""
echo "3. Creating alarm: Critical Swap Usage (>1GB for 2 minutes)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Swap-Critical" \
  --alarm-description "Swap usage >1GB - CRITICAL memory pressure" \
  --namespace "$NAMESPACE" \
  --metric-name SwapUsed \
  --statistic Average \
  --period 120 \
  --threshold 1073741824 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --unit Bytes \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 4: High Disk Usage
echo ""
echo "4. Creating alarm: High Disk Usage (>85% for 15 minutes)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Disk-High" \
  --alarm-description "Disk usage >85% - cleanup may be needed" \
  --namespace "$NAMESPACE" \
  --metric-name DiskUtilization \
  --statistic Average \
  --period 900 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --ok-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 5: Critical Disk Usage
echo ""
echo "5. Creating alarm: Critical Disk Usage (>95%)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Disk-Critical" \
  --alarm-description "Disk usage >95% - IMMEDIATE action required" \
  --namespace "$NAMESPACE" \
  --metric-name DiskUtilization \
  --statistic Average \
  --period 300 \
  --threshold 95 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 6: High CPU Usage (using Lightsail metrics)
echo ""
echo "6. Creating alarm: High CPU Usage (>80% for 10 minutes)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-CPU-High" \
  --alarm-description "CPU usage >80% for 10 minutes" \
  --namespace "AWS/Lightsail" \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceName,Value=smartfarm \
  --statistic Average \
  --period 600 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --ok-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 7: Instance Status Check Failed
echo ""
echo "7. Creating alarm: Instance Status Check Failed"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Status-Check-Failed" \
  --alarm-description "Instance status check failed - possible system issue" \
  --namespace "AWS/Lightsail" \
  --metric-name StatusCheckFailed \
  --dimensions Name=InstanceName,Value=smartfarm \
  --statistic Maximum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

# Alarm 8: Low Burst Capacity (burstable instance)
echo ""
echo "8. Creating alarm: Low Burst Capacity (<20%)"
aws cloudwatch put-metric-alarm \
  --alarm-name "SmartFarm-Burst-Low" \
  --alarm-description "CPU burst capacity <20% - performance may degrade" \
  --namespace "AWS/Lightsail" \
  --metric-name BurstCapacityPercentage \
  --dimensions Name=InstanceName,Value=smartfarm \
  --statistic Average \
  --period 300 \
  --threshold 20 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "$SNS_TOPIC" \
  --ok-actions "$SNS_TOPIC" \
  --treat-missing-data notBreaching \
  --region "$REGION"
echo "   ✓ Created"

echo ""
echo "=== Alarm Creation Complete ==="
echo ""
echo "✅ Created 8 alarms:"
echo "   1. Memory >85%"
echo "   2. Swap >500MB"
echo "   3. Swap >1GB (critical)"
echo "   4. Disk >85%"
echo "   5. Disk >95% (critical)"
echo "   6. CPU >80%"
echo "   7. Status check failed"
echo "   8. Burst capacity <20%"
echo ""
echo "💰 Cost: \$0/month (within 10 free alarms)"
echo ""
echo "View alarms:"
echo "  aws cloudwatch describe-alarms --region us-east-1 --alarm-names SmartFarm-Memory-High SmartFarm-Swap-High SmartFarm-Disk-High SmartFarm-CPU-High"
echo ""
echo "Or in AWS Console:"
echo "  https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:"
