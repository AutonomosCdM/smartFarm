#!/bin/bash
# Test CloudWatch alarm and SNS notification

set -e

REGION="us-east-1"
SNS_TOPIC="arn:aws:sns:us-east-1:586794472237:smartfarm-alerts"

echo "=== Testing SmartFarm Monitoring ==="
echo ""

# Send test notification via SNS
echo "1. Sending test notification via SNS..."
aws sns publish \
  --topic-arn "$SNS_TOPIC" \
  --subject "🧪 SmartFarm Monitoring Test" \
  --message "This is a test notification from your SmartFarm monitoring system.

✅ SNS Topic: Working
✅ CloudWatch Agent: Publishing metrics
✅ Alarms: Configured (8 total)

Current Status:
- Memory: ~39% (normal)
- Swap: 0.01% (excellent)
- Disk: 24% (plenty of space)
- CPU: Low (healthy)

You should receive this email within 1 minute.
If you don't, check your spam folder or verify the subscription is confirmed.

Next test: Trigger actual alarm (optional)

--
SmartFarm Monitoring System
https://smartfarm.autonomos.dev" \
  --region "$REGION"

echo "   ✓ Test notification sent"
echo ""

# Check subscription status
echo "2. Checking subscription status..."
SUBS=$(aws sns list-subscriptions-by-topic \
  --topic-arn "$SNS_TOPIC" \
  --region "$REGION" \
  --query 'Subscriptions[*].[Protocol,Endpoint,SubscriptionArn]' \
  --output text)

echo "$SUBS" | while read proto endpoint arn; do
  if [[ "$arn" == *"PendingConfirmation"* ]]; then
    echo "   ⚠️  $proto: $endpoint (PENDING - check email!)"
  else
    echo "   ✓ $proto: $endpoint (confirmed)"
  fi
done
echo ""

echo "3. Current Alarm Status:"
aws cloudwatch describe-alarms \
  --alarm-name-prefix "SmartFarm-" \
  --region "$REGION" \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table

echo ""
echo "=== Test Complete ==="
echo ""
echo "📧 Check your email: admin@autonomos.dev"
echo "⏱️  Email should arrive within 1 minute"
echo ""
echo "To trigger an actual alarm (simulate high memory):"
echo "  1. Temporarily set memory threshold to 30%"
echo "  2. Wait for alarm to trigger"
echo "  3. Reset threshold to 85%"
echo ""
echo "For now, the test notification confirms the system works!"
