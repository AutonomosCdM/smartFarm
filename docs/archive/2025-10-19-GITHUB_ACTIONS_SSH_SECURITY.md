# GitHub Actions SSH Security Configuration

## Overview

SmartFarm uses GitHub Actions for automated CI/CD deployment to AWS Lightsail. This requires SSH access from GitHub's infrastructure to our production server, following industry-standard security practices.

**Why Port 22 is Open to 0.0.0.0/0:**
- GitHub Actions runners use dynamic IP addresses from a large pool
- Restricting to specific IPs would break automated deployments
- This is standard practice for CI/CD systems (Travis CI, CircleCI, etc.)
- Multiple security layers protect against unauthorized access

## Security Architecture

```
Internet (0.0.0.0/0)
    ↓
Port 22 (SSH)
    ↓
Layer 1: SSH Key Authentication (no passwords)
    ↓
Layer 2: fail2ban (rate limiting)
    ↓
Layer 3: SSH Hardening (config restrictions)
    ↓
Layer 4: CloudWatch Monitoring (alerts)
    ↓
Ubuntu Server (98.87.30.163)
```

## Security Layers

### Layer 1: Key-Based Authentication

**Configuration:**
```bash
# /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

**Key Management:**
- Deployment key stored in GitHub Secrets (SSH_PRIVATE_KEY)
- Only GitHub Actions has access to the private key
- Public key on server: `~ubuntu/.ssh/authorized_keys`
- Key rotation quarterly (see SECRETS_MANAGEMENT.md)

### Layer 2: fail2ban Protection

**Configuration:**
```bash
# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600
```

**Protection Features:**
- Auto-bans IPs after 5 failed attempts in 10 minutes
- Ban duration: 1 hour (configurable)
- Monitors `/var/log/auth.log` for suspicious patterns
- Whitelist for GitHub Actions IPs (optional)

**Check Status:**
```bash
sudo fail2ban-client status sshd
sudo fail2ban-client status # Overall status
```

**View Banned IPs:**
```bash
sudo fail2ban-client get sshd banned
sudo iptables -L -n | grep REJECT
```

### Layer 3: SSH Hardening

**Security Configuration:**
```bash
# /etc/ssh/sshd_config
Protocol 2
PermitRootLogin no
MaxAuthTries 3
LoginGraceTime 20
PermitEmptyPasswords no
StrictModes yes
AllowUsers ubuntu
ClientAliveInterval 300
ClientAliveCountMax 2
```

**Hardening Features:**
- SSH Protocol 2 only (encrypted)
- Root login disabled
- Maximum 3 authentication attempts
- 20-second login timeout
- Only 'ubuntu' user allowed
- Idle connections timeout after 10 minutes

### Layer 4: CloudWatch Monitoring

**Monitored Metrics:**
```bash
# Custom metrics pushed to CloudWatch
- SSH login attempts (successful/failed)
- fail2ban ban events
- Unique IP addresses attempting connection
- Geographic origin of connections
```

**Alert Configuration:**
```yaml
# CloudWatch Alarms
- Name: HighSSHFailedLogins
  Metric: ssh_failed_logins
  Threshold: 20 per 5 minutes
  Action: SNS notification

- Name: NewSSHKey
  Metric: authorized_keys_modified
  Threshold: Any change
  Action: Immediate alert
```

## Firewall Rules

**Current Configuration:**
```bash
# Check current rules
sudo ufw status numbered

# Expected output:
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 22/tcp (v6)               ALLOW IN    Anywhere (v6)
[ 5] 80/tcp (v6)               ALLOW IN    Anywhere (v6)
[ 6] 443/tcp (v6)              ALLOW IN    Anywhere (v6)
```

## Monitoring and Alerting

### Real-Time Monitoring

**Watch SSH Connections:**
```bash
# Live SSH connection monitoring
sudo tail -f /var/log/auth.log | grep sshd

# Active SSH sessions
who
w
ss -tnp | grep :22
```

**fail2ban Monitoring:**
```bash
# Watch fail2ban activity
sudo tail -f /var/log/fail2ban.log

# Check jail status
sudo fail2ban-client status sshd
```

### CloudWatch Dashboards

**Access Dashboard:**
1. AWS Console → CloudWatch → Dashboards → SmartFarm-Security
2. Monitor panels:
   - SSH Login Attempts (graph)
   - Failed Authentication by IP (table)
   - Geographic Heat Map
   - fail2ban Activity

**CLI Monitoring:**
```bash
# Get recent metrics
aws cloudwatch get-metric-statistics \
  --namespace SmartFarm/Security \
  --metric-name SSHFailedLogins \
  --start-time 2024-10-17T00:00:00Z \
  --end-time 2024-10-17T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Incident Response

### Detecting Unauthorized Access

**Check Indicators:**
```bash
# Recent successful logins
last -10

# Failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Check for unusual commands
history | tail -50

# Review sudo usage
sudo grep sudo /var/log/auth.log | tail -20
```

### Emergency Response

**1. Temporary Port Closure (Breaks CI/CD):**
```bash
# EMERGENCY ONLY - Stops all SSH access
sudo ufw delete allow 22/tcp
sudo ufw reload

# Re-enable when safe
sudo ufw allow 22/tcp
sudo ufw reload
```

**2. Revoke Specific Key:**
```bash
# Remove compromised key from authorized_keys
sudo nano ~/.ssh/authorized_keys
# Delete the compromised key line
# Save and exit
```

**3. Ban Specific IP:**
```bash
# Manual IP ban
sudo fail2ban-client set sshd banip <IP_ADDRESS>

# Unban when resolved
sudo fail2ban-client set sshd unbanip <IP_ADDRESS>
```

**4. Full Lockdown Procedure:**
```bash
# 1. Close SSH port
sudo ufw delete allow 22/tcp

# 2. Terminate active sessions
sudo pkill -u ubuntu

# 3. Rotate keys (from console access)
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new

# 4. Update GitHub secret
# Go to: GitHub → Settings → Secrets → Update SSH_PRIVATE_KEY

# 5. Re-enable access
sudo ufw allow 22/tcp
```

## Access Revocation

### Rotating Deployment Keys

**Step 1: Generate New Keys**
```bash
# On local machine
ssh-keygen -t ed25519 -C "github-actions@smartfarm" -f smartfarm-deploy-key
```

**Step 2: Update Server**
```bash
# Copy new public key to server
ssh -i current-key.pem ubuntu@98.87.30.163
echo "NEW_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

**Step 3: Update GitHub**
1. Navigate to: https://github.com/AutonomosCdM/smartFarm/settings/secrets
2. Click on SSH_PRIVATE_KEY
3. Update with new private key content
4. Save

**Step 4: Test Deployment**
```bash
# Trigger test deployment
git push origin main
# Monitor: gh run watch
```

**Step 5: Remove Old Key**
```bash
# After successful test, remove old key from server
ssh ubuntu@98.87.30.163
nano ~/.ssh/authorized_keys
# Remove old key line
```
