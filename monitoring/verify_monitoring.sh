#!/bin/bash
# Verify SmartFarm monitoring setup

set -e

REGION="us-east-1"
NAMESPACE="SmartFarm/Instance"

echo "=== SmartFarm Monitoring Verification ==="
echo ""

# Check SNS topic
echo "1. SNS Topic Status:"
SNS_TOPIC=$(aws sns list-topics --region "$REGION" --output text | grep smartfarm-alerts | awk '{print $2}')
if [ -z "$SNS_TOPIC" ]; then
  echo "   ❌ SNS topic not found"
  exit 1
fi
echo "   ✓ Topic: $SNS_TOPIC"

# Check subscriptions
SUBS=$(aws sns list-subscriptions-by-topic --topic-arn "$SNS_TOPIC" --region "$REGION" --query 'Subscriptions[*].[Protocol,Endpoint,SubscriptionArn]' --output text)
if [ -z "$SUBS" ]; then
  echo "   ❌ No subscriptions found"
else
  echo "   ✓ Subscriptions:"
  echo "$SUBS" | while read proto endpoint arn; do
    if [[ "$arn" == *"PendingConfirmation"* ]]; then
      echo "      ⚠️  $proto: $endpoint (PENDING - check email!)"
    else
      echo "      ✓ $proto: $endpoint"
    fi
  done
fi
echo ""

# Check CloudWatch agent on production
echo "2. CloudWatch Agent Status:"
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'REMOTE' 2>/dev/null || echo "   ❌ Cannot connect to production server"
if sudo systemctl is-active --quiet amazon-cloudwatch-agent; then
  echo "   ✓ Agent is running"
  echo "   Process: $(ps aux | grep amazon-cloudwatch-agent | grep -v grep | awk '{print $11}' | head -1)"
else
  echo "   ❌ Agent is not running"
  exit 1
fi
REMOTE
echo ""

# Check custom metrics
echo "3. Custom Metrics (last 10 minutes):"
METRICS=("MemoryUtilization" "SwapUsed" "SwapUtilization" "DiskUtilization")
for metric in "${METRICS[@]}"; do
  COUNT=$(aws cloudwatch list-metrics \
    --namespace "$NAMESPACE" \
    --metric-name "$metric" \
    --region "$REGION" \
    --query 'length(Metrics)' \
    --output text 2>/dev/null || echo "0")
  
  if [ "$COUNT" -gt 0 ]; then
    # Get latest data point
    LATEST=$(aws cloudwatch get-metric-statistics \
      --namespace "$NAMESPACE" \
      --metric-name "$metric" \
      --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || python3 -c "from datetime import datetime, timedelta; print((datetime.utcnow() - timedelta(minutes=10)).strftime('%Y-%m-%dT%H:%M:%S'))") \
      --end-time $(date -u +%Y-%m-%dT%H:%M:%S 2>/dev/null || python3 -c "from datetime import datetime; print(datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S'))") \
      --period 300 \
      --statistics Average \
      --region "$REGION" \
      --query 'Datapoints[-1].Average' \
      --output text 2>/dev/null || echo "N/A")
    
    if [ "$LATEST" != "None" ] && [ "$LATEST" != "N/A" ]; then
      printf "   ✓ %-20s %.2f\n" "$metric:" "$LATEST"
    else
      echo "   ⚠️  $metric: No recent data (wait 2-3 min after agent start)"
    fi
  else
    echo "   ❌ $metric: Not found"
  fi
done
echo ""

# Check alarms
echo "4. CloudWatch Alarms:"
ALARMS=$(aws cloudwatch describe-alarms \
  --alarm-name-prefix "SmartFarm-" \
  --region "$REGION" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output text)

if [ -z "$ALARMS" ]; then
  echo "   ❌ No alarms found"
else
  echo "$ALARMS" | while read name state; do
    case "$state" in
      OK)
        echo "   ✓ $name: $state"
        ;;
      ALARM)
        echo "   🚨 $name: $state"
        ;;
      INSUFFICIENT_DATA)
        echo "   ⏳ $name: $state (wait for metrics)"
        ;;
    esac
  done
fi
echo ""

# Summary
echo "=== Monitoring Summary ==="
ALARM_COUNT=$(aws cloudwatch describe-alarms --alarm-name-prefix "SmartFarm-" --region "$REGION" --query 'length(MetricAlarms)' --output text)
METRIC_COUNT=$(aws cloudwatch list-metrics --namespace "$NAMESPACE" --region "$REGION" --query 'length(Metrics)' --output text 2>/dev/null || echo "0")

echo ""
echo "📊 Custom Metrics: $METRIC_COUNT"
echo "🔔 Alarms: $ALARM_COUNT"
echo "📧 SNS Topic: $SNS_TOPIC"
echo ""
echo "💰 Estimated Cost: \$0-3/month"
echo ""
echo "View in AWS Console:"
echo "  Metrics: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~();namespace=~'SmartFarm*2fInstance"
echo "  Alarms:  https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:"
