# SmartFarm Security - Quick Reference Card

**Server:** 98.87.30.163 | **SSH Key:** ~/Downloads/smartfarm-key.pem

---

## 🚨 Emergency Commands

```bash
# Quick security status
./scripts/security-status.sh

# Check if under attack
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status sshd && sudo tail -20 /var/log/auth.log"

# Unban an IP immediately
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client set sshd unbanip <IP>"

# Restart fail2ban
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl restart fail2ban"

# Access via browser (if locked out)
# AWS Lightsail Console → Instance → Connect using SSH
```

---

## 📊 Daily Checks

```bash
# Run security dashboard (recommended daily)
./scripts/security-status.sh

# Alternative: Manual checks
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  # fail2ban status
  sudo fail2ban-client status sshd

  # Recent failed attempts
  sudo grep "Failed" /var/log/auth.log | tail -10

  # CloudWatch agent
  sudo systemctl status amazon-cloudwatch-agent
EOF
```

---

## 🔍 Monitoring Commands

### fail2ban

```bash
# Full status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status sshd"

# List banned IPs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client get sshd banip"

# Watch fail2ban logs live
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -f /var/log/fail2ban.log"

# Unban specific IP
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client set sshd unbanip <IP_ADDRESS>"

# Ban an IP manually
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client set sshd banip <IP_ADDRESS>"
```

### SSH Logs

```bash
# Watch auth logs live
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -f /var/log/auth.log"

# Recent failed login attempts
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo grep 'Failed password' /var/log/auth.log | tail -20"

# Recent successful connections
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo grep 'Accepted publickey' /var/log/auth.log | tail -20"

# Invalid user attempts
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo grep 'Invalid user' /var/log/auth.log | tail -20"
```

### CloudWatch

```bash
# Agent status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status -m ec2"

# View agent logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -100 /opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"

# Restart agent
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl restart amazon-cloudwatch-agent"

# Check log groups (via AWS Console)
# Navigate to: CloudWatch → Log groups → /aws/ec2/smartfarm/ssh
```

---

## 🔧 Configuration

### SSH Hardening

```bash
# View effective SSH config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo sshd -T | grep -E '(password|permit|auth|max)'"

# Test SSH config syntax
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo sshd -t"

# View hardening config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cat /etc/ssh/sshd_config.d/99-smartfarm-hardening.conf"

# Restart SSH (careful!)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl restart ssh"
```

### fail2ban Configuration

```bash
# View jail config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cat /etc/fail2ban/jail.local"

# Edit jail config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
# Then: sudo nano /etc/fail2ban/jail.local

# Reload fail2ban after config change
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl reload fail2ban"
```

---

## 📈 Statistics & Reports

### fail2ban Stats

```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  echo "=== fail2ban Statistics ==="
  sudo fail2ban-client status sshd | grep -E "Currently|Total"
  echo ""
  echo "=== Recent Bans ==="
  sudo grep "Ban" /var/log/fail2ban.log | tail -10
EOF
```

### SSH Activity Summary

```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  echo "=== SSH Activity Summary (24 hours) ==="
  echo "Failed attempts: $(sudo grep 'Failed password' /var/log/auth.log | wc -l)"
  echo "Invalid users: $(sudo grep 'Invalid user' /var/log/auth.log | wc -l)"
  echo "Successful logins: $(sudo grep 'Accepted publickey' /var/log/auth.log | wc -l)"
EOF
```

### System Resources

```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  echo "=== System Resources ==="
  echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
  echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
  echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
  echo "Uptime: $(uptime -p)"
EOF
```

---

## 🛠️ Service Management

```bash
# Check service status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl status fail2ban amazon-cloudwatch-agent ssh"

# Start services
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl start fail2ban amazon-cloudwatch-agent"

# Stop services
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl stop fail2ban"

# Restart services
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl restart fail2ban amazon-cloudwatch-agent"

# Enable at boot
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl enable fail2ban amazon-cloudwatch-agent"
```

---

## 🔄 Backup & Restore

### Configuration Backups

```bash
# Backup SSH config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"

# Backup fail2ban config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup.$(date +%Y%m%d_%H%M%S)"

# List backups
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "ls -la /etc/ssh/sshd_config.backup.* /etc/fail2ban/jail.local.backup.*"
```

### Restore from Backup

```bash
# Restore SSH config (replace TIMESTAMP)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cp /etc/ssh/sshd_config.backup.TIMESTAMP /etc/ssh/sshd_config && \
   sudo sshd -t && \
   sudo systemctl restart ssh"

# Restore fail2ban config (replace TIMESTAMP)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cp /etc/fail2ban/jail.local.backup.TIMESTAMP /etc/fail2ban/jail.local && \
   sudo systemctl restart fail2ban"
```

---

## 📝 Logging

### View Logs

```bash
# fail2ban logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo journalctl -u fail2ban -n 50"

# SSH service logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo journalctl -u ssh -n 50"

# CloudWatch agent logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo journalctl -u amazon-cloudwatch-agent -n 50"

# System auth logs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -100 /var/log/auth.log"
```

---

## 🎯 Common Tasks

### Whitelist an IP

```bash
# Add to fail2ban ignoreip (edit jail.local)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
# Then: sudo nano /etc/fail2ban/jail.local
# Add to [DEFAULT] section: ignoreip = 127.0.0.1/8 YOUR_IP_HERE
# Save and: sudo systemctl reload fail2ban
```

### Adjust Ban Time

```bash
# Edit jail.local
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
# Then: sudo nano /etc/fail2ban/jail.local
# Change: bantime = 3600 (to desired seconds)
# Save and: sudo systemctl reload fail2ban
```

### Check If IP Is Banned

```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client get sshd banip | grep <IP_ADDRESS>"
```

---

## 🔗 Useful Links

- **Full Documentation:** docs/security/SSH_HARDENING_REPORT.md
- **Security Overview:** docs/SECURITY.md
- **Implementation Summary:** SECURITY_HARDENING_SUMMARY.md
- **CloudWatch Console:** https://console.aws.amazon.com/cloudwatch/
- **Lightsail Console:** https://lightsail.aws.amazon.com/

---

## 📞 Support

- **Documentation Issues:** Check docs/TROUBLESHOOTING.md
- **Security Incidents:** Document in docs/security/INCIDENTS.md
- **Emergency Access:** Use AWS Lightsail browser SSH console

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-10-19
**Print this card for quick access to common commands**
