# SSH Hardening Reference Guide

## SSH Configuration Details

### Core sshd_config Settings

```bash
# /etc/ssh/sshd_config
Protocol 2                    # Use SSH protocol 2 only
PermitRootLogin no           # Disable root login
PasswordAuthentication no    # Disable password auth
PubkeyAuthentication yes     # Enable key-based auth
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3               # Max authentication attempts
LoginGraceTime 20            # Login timeout in seconds
PermitEmptyPasswords no      # No empty passwords
StrictModes yes              # Check file permissions
AllowUsers ubuntu            # Only allow specific users
ClientAliveInterval 300      # Keep-alive interval
ClientAliveCountMax 2        # Max keep-alive messages
```

### fail2ban Advanced Configuration

```bash
# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600
findtime = 600

# Custom jail for aggressive attackers
[sshd-aggressive]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 2
bantime = 86400
findtime = 300
```

## Monitoring Commands Reference

### Authentication Monitoring

```bash
# Recent successful logins
last -10

# Failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Accepted logins
sudo grep "Accepted publickey" /var/log/auth.log | tail -10

# Check for unusual sudo usage
sudo grep sudo /var/log/auth.log | tail -20

# View all authentication events
sudo aureport -au

# Check SSH daemon status
sudo systemctl status sshd
```

### fail2ban Management

```bash
# Check all jail status
sudo fail2ban-client status

# View specific jail details
sudo fail2ban-client status sshd

# List all banned IPs
sudo fail2ban-client get sshd banned

# Ban IP manually
sudo fail2ban-client set sshd banip <IP>

# Unban IP
sudo fail2ban-client set sshd unbanip <IP>

# Reload configuration
sudo fail2ban-client reload

# View fail2ban logs
sudo tail -f /var/log/fail2ban.log
```

### Network Analysis

```bash
# Active SSH connections
ss -tnp | grep :22

# All listening ports
sudo netstat -tulpn | grep LISTEN

# Track connection attempts
sudo tcpdump -i any port 22 -n

# Geographic origin of connections (requires geoiplookup)
for ip in $(sudo grep "Failed password" /var/log/auth.log | grep -oE "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" | sort -u); do
  echo "$ip: $(geoiplookup $ip)"
done
```

## CloudWatch Metrics Configuration

### Custom Metrics Setup

```json
{
  "metrics": {
    "namespace": "SmartFarm/Security",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "*"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/auth.log",
            "log_group_name": "smartfarm-ssh",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/fail2ban.log",
            "log_group_name": "smartfarm-fail2ban",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

### CloudWatch Alarms

```bash
# Create SSH failed login alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "SSH-Failed-Logins" \
  --alarm-description "Alert on high SSH failed login attempts" \
  --metric-name FailedSSHLogins \
  --namespace SmartFarm/Security \
  --statistic Sum \
  --period 300 \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# Create fail2ban activity alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Fail2ban-Bans" \
  --alarm-description "Alert on fail2ban ban events" \
  --metric-name BannedIPs \
  --namespace SmartFarm/Security \
  --statistic Sum \
  --period 3600 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Advanced Security Configurations

### Port Knocking Setup

```bash
# Install knockd
sudo apt install knockd

# /etc/knockd.conf
[options]
    UseSyslog

[openSSH]
    sequence    = 7000,8000,9000
    seq_timeout = 5
    command     = /sbin/iptables -I INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

[closeSSH]
    sequence    = 9000,8000,7000
    seq_timeout = 5
    command     = /sbin/iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    tcpflags    = syn

# Usage
knock <server_ip> 7000 8000 9000  # Open
ssh user@server
knock <server_ip> 9000 8000 7000  # Close
```

### Two-Factor Authentication

```bash
# Install Google Authenticator
sudo apt install libpam-google-authenticator

# Configure for user
google-authenticator

# Update PAM configuration
sudo nano /etc/pam.d/sshd
# Add: auth required pam_google_authenticator.so

# Update SSH configuration
sudo nano /etc/ssh/sshd_config
# Set: ChallengeResponseAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### SSH Key Management Best Practices

```bash
# Generate strong Ed25519 key
ssh-keygen -t ed25519 -C "github-actions@smartfarm"

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Add key with restrictions
echo "restrict,command=\"/opt/smartfarm/deployment/deploy.sh\" $(cat key.pub)" >> ~/.ssh/authorized_keys

# Rotate keys quarterly
# 1. Generate new key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_new

# 2. Add to authorized_keys
cat ~/.ssh/id_ed25519_new.pub >> ~/.ssh/authorized_keys

# 3. Test new key
ssh -i ~/.ssh/id_ed25519_new user@server

# 4. Remove old key
sed -i '/OLD_KEY_IDENTIFIER/d' ~/.ssh/authorized_keys
```

## Audit Scripts

### Daily Security Check

```bash
#!/bin/bash
# /usr/local/bin/ssh-security-audit.sh

echo "=== SSH Security Audit - $(date) ==="

echo "1. Failed login attempts (last 24h):"
sudo grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l

echo "2. Successful logins (last 24h):"
sudo grep "Accepted publickey" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l

echo "3. Currently banned IPs:"
sudo fail2ban-client status sshd | grep "Banned IP"

echo "4. Active SSH sessions:"
