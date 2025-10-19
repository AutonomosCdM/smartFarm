# SSH Security Hardening

**Server:** 98.87.30.163 | **SSH Key:** ~/Downloads/smartfarm-key.pem

## Overview

SmartFarm production server uses multiple layers of SSH security to protect against unauthorized access while maintaining accessibility for CI/CD operations.

**Security Architecture:**
```
Internet (0.0.0.0/0)
    ↓
Port 22 (SSH)
    ↓
Layer 1: Key-Based Authentication (no passwords)
    ↓
Layer 2: fail2ban (rate limiting)
    ↓
Layer 3: SSH Hardening (config restrictions)
    ↓
Layer 4: CloudWatch Monitoring (alerts)
    ↓
Production Server (98.87.30.163)
```

**Why Port 22 is Open to 0.0.0.0/0:**
- Self-hosted GitHub Actions runner requires local access
- No remote SSH needed for CI/CD
- Multiple security layers protect against attacks
- Standard practice for self-hosted CI/CD systems

## Security Layers

### Layer 1: Key-Based Authentication

**Configuration:**
```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
PermitEmptyPasswords no
```

**Key Management:**
- Deployment key: `~/Downloads/smartfarm-key.pem`
- Public key on server: `~ubuntu/.ssh/authorized_keys`
- Only authorized keys can access
- Quarterly key rotation recommended

**View Authorized Keys:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "cat ~/.ssh/authorized_keys"
```

### Layer 2: fail2ban Protection

**Configuration:**
```bash
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

**Protection Features:**
- Auto-bans IPs after 3 failed attempts in 10 minutes
- Ban duration: 1 hour
- Monitors `/var/log/auth.log` for attack patterns
- Tracks failed password, invalid user, and connection attempts

**Check Status:**
```bash
# Overall status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status"

# SSH jail details
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client status sshd"

# List banned IPs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client get sshd banip"
```

**Unban IP:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client set sshd unbanip <IP_ADDRESS>"
```

### Layer 3: SSH Hardening

**Configuration File:** `/etc/ssh/sshd_config.d/99-smartfarm-hardening.conf`

**Key Settings:**
```bash
# Authentication
PasswordAuthentication no
ChallengeResponseAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes

# Access Control
PermitRootLogin no
MaxAuthTries 3
MaxSessions 10
LoginGraceTime 60

# Rate Limiting
MaxStartups 10:30:60

# Network Security
AllowTcpForwarding yes       # Needed for deployments
X11Forwarding no
AllowAgentForwarding no

# Cryptography (Modern Algorithms Only)
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,diffie-hellman-group16-sha512

# Logging
LogLevel VERBOSE
```

**Verify Configuration:**
```bash
# Test syntax
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo sshd -t"

# View effective config
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo sshd -T | grep -E '(passwordauth|permitroot|maxauth)'"

# Restart SSH after changes
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo systemctl restart ssh"
```

### Layer 4: CloudWatch Monitoring

**Monitored Metrics:**
- SSH login attempts (successful/failed)
- fail2ban ban events
- Unique IP addresses
- Invalid user attempts

**Log Groups:**
- `/aws/ec2/smartfarm/ssh` - SSH authentication logs
- `/aws/ec2/smartfarm/fail2ban` - fail2ban activity

**Alerts:**
- High failed login attempts (>10 in 5 minutes)
- Invalid user attempts (>1 in 5 minutes)
- Multiple fail2ban bans (>3 in 15 minutes)

See [../operations/MONITORING.md](../operations/MONITORING.md) for details.

## Monitoring & Auditing

### Daily Security Checks

**Run Security Dashboard:**
```bash
./scripts/security-status.sh
```

**Manual Checks:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  echo "=== SSH Security Status ==="
  echo "fail2ban status:"
  sudo fail2ban-client status sshd
  echo ""
  echo "Recent failed attempts:"
  sudo grep "Failed" /var/log/auth.log | tail -10
  echo ""
  echo "Recent successful logins:"
  sudo grep "Accepted publickey" /var/log/auth.log | tail -5
EOF
```

### SSH Activity Monitoring

**Watch Logs in Real-Time:**
```bash
# All SSH activity
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -f /var/log/auth.log | grep sshd"

# Failed attempts only
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -f /var/log/auth.log | grep 'Failed password'"

# Successful connections
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo tail -f /var/log/auth.log | grep 'Accepted publickey'"
```

**Activity Summary:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  echo "=== Last 24 Hours ==="
  echo "Failed attempts: $(sudo grep 'Failed password' /var/log/auth.log | wc -l)"
  echo "Invalid users: $(sudo grep 'Invalid user' /var/log/auth.log | wc -l)"
  echo "Successful logins: $(sudo grep 'Accepted publickey' /var/log/auth.log | wc -l)"
  echo "Unique IPs trying to connect: $(sudo grep 'sshd' /var/log/auth.log | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort -u | wc -l)"
EOF
```

### Active Connections

```bash
# Current SSH sessions
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "who && w"

# Active SSH connections
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "ss -tnp | grep :22"
```

## Key Rotation Procedures

### Quarterly SSH Key Rotation

**1. Generate New Key Pair:**
```bash
# On local machine
ssh-keygen -t ed25519 -C "smartfarm-deploy-$(date +%Y%m)" \
  -f ~/Downloads/smartfarm-key-new.pem
```

**2. Add New Public Key to Server:**
```bash
# Copy new public key
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "echo '$(cat ~/Downloads/smartfarm-key-new.pem.pub)' >> ~/.ssh/authorized_keys"
```

**3. Test New Key:**
```bash
ssh -i ~/Downloads/smartfarm-key-new.pem ubuntu@98.87.30.163 "echo 'New key works!'"
```

**4. Remove Old Key:**
```bash
# After confirming new key works
ssh -i ~/Downloads/smartfarm-key-new.pem ubuntu@98.87.30.163 \
  "sed -i '/OLD_KEY_FINGERPRINT/d' ~/.ssh/authorized_keys"

# Rename files
mv ~/Downloads/smartfarm-key.pem ~/Downloads/smartfarm-key-old.pem
mv ~/Downloads/smartfarm-key-new.pem ~/Downloads/smartfarm-key.pem
```

**5. Update Documentation:**
Update any scripts or documentation referencing the old key.

See [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) for API key rotation.

## Incident Response

### Detecting Attacks

**Indicators of Attack:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 << 'EOF'
  # High failed attempt rate
  sudo grep "Failed password" /var/log/auth.log | tail -50

  # Unusual login times
  last -10

  # Unusual sudo usage
  sudo grep sudo /var/log/auth.log | tail -20

  # Check for brute force patterns
  sudo grep "authentication failure" /var/log/auth.log | \
    awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -10
EOF
```

### Emergency Response

**1. Temporary Lockdown (Breaks CI/CD):**
```bash
# EMERGENCY ONLY - Stops all SSH access
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo ufw delete allow 22/tcp && sudo ufw reload"

# Re-enable when safe
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo ufw allow 22/tcp && sudo ufw reload"
```

**2. Ban Specific IP:**
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo fail2ban-client set sshd banip <ATTACKER_IP>"
```

**3. Revoke Compromised Key:**
```bash
# Remove from authorized_keys
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sed -i '/COMPROMISED_KEY_PATTERN/d' ~/.ssh/authorized_keys"

# Generate and deploy new key immediately
```

**4. Full Investigation:**
```bash
# Check recent logins
last -20

# Check sudo activity
sudo grep sudo /var/log/auth.log

# Check for unauthorized changes
sudo find /opt/smartfarm -type f -mtime -1

# Review Docker logs
docker logs open-webui --since 24h
```

### Access via Console (If Locked Out)

If SSH is completely locked:
1. Go to AWS Lightsail Console
2. Select smartfarm instance
3. Click "Connect using SSH"
4. Browser-based SSH console opens
5. Investigate and fix SSH configuration

## Configuration Backup

**Backup SSH Configurations:**
```bash
# Backup current configs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S) && \
   sudo cp /etc/fail2ban/jail.local /etc/fail2ban/jail.local.backup.$(date +%Y%m%d_%H%M%S)"

# List backups
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "ls -la /etc/ssh/sshd_config.backup.* /etc/fail2ban/jail.local.backup.*"
```

**Restore from Backup:**
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

## Maintenance

### Daily Tasks
- Review fail2ban status
- Check for unusual login activity
- Monitor CloudWatch alerts

### Weekly Tasks
- Review banned IP list
- Check CloudWatch agent status
- Audit authorized_keys file

### Monthly Tasks
- Review and update fail2ban rules if needed
- Apply system security updates
- Review firewall rules
- Test SSH configuration changes in isolation

### Quarterly Tasks
- Rotate SSH keys
- Review and update SSH hardening config
- Audit all security configurations
- Test disaster recovery procedures

## Related Documentation

- [Security Overview](../SECURITY.md)
- [Secrets Management](./SECRETS_MANAGEMENT.md) - API key rotation
- [Security Incidents](./INCIDENTS.md) - Past incidents and resolutions
- [Monitoring Guide](../operations/MONITORING.md) - CloudWatch setup
- [Audit Reports](./AUDIT_REPORTS.md) - Security audit findings

## Reference Commands

### Quick Status Check
```bash
./scripts/security-status.sh
```

### fail2ban Management
```bash
# Status
sudo fail2ban-client status sshd

# Unban IP
sudo fail2ban-client set sshd unbanip <IP>

# Ban IP
sudo fail2ban-client set sshd banip <IP>

# Reload config
sudo systemctl reload fail2ban
```

### SSH Management
```bash
# Test config
sudo sshd -t

# View effective config
sudo sshd -T | less

# Restart SSH
sudo systemctl restart ssh
```

### Log Monitoring
```bash
# Watch SSH logs
sudo tail -f /var/log/auth.log

# Watch fail2ban logs
sudo tail -f /var/log/fail2ban.log

# Recent failed attempts
sudo grep "Failed password" /var/log/auth.log | tail -20
```

---

**Last Updated:** 2025-10-19
**Server:** 98.87.30.163
**SSH Configuration:** `/etc/ssh/sshd_config.d/99-smartfarm-hardening.conf`
**fail2ban Configuration:** `/etc/fail2ban/jail.local`
