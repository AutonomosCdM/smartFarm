# SmartFarm Security Overview

## Security Philosophy

SmartFarm implements defense-in-depth with multiple security layers to protect user data, API credentials, and system integrity.

## Security Architecture

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│ Layer 1: Network Security               │
│  • HTTPS/TLS encryption                 │
│  • Firewall (ports 22, 80, 443 only)   │
│  • DDoS protection (AWS Shield Basic)   │
│  • fail2ban intrusion prevention        │
├─────────────────────────────────────────┤
│ Layer 2: SSH Hardening (NEW 2025-10-19)│
│  • Key-based authentication only        │
│  • Password authentication disabled     │
│  • Root login disabled                  │
│  • Rate limiting (MaxStartups 10:30:60) │
│  • Automatic IP banning (3 fails = 1hr)│
├─────────────────────────────────────────┤
│ Layer 3: Application Security           │
│  • User authentication & sessions       │
│  • Role-based access (Admin/User)       │
│  • Input validation & sanitization      │
├─────────────────────────────────────────┤
│ Layer 4: API Security                   │
│  • Environment variable isolation       │
│  • Key rotation procedures              │
│  • No secrets in code/logs             │
├─────────────────────────────────────────┤
│ Layer 5: Data Security                  │
│  • Encrypted backups                    │
│  • Docker volume isolation              │
│  • Database access controls             │
├─────────────────────────────────────────┤
│ Layer 6: Monitoring & Logging           │
│  • CloudWatch real-time log streaming   │
│  • SSH activity monitoring              │
│  • fail2ban event tracking              │
│  • 7-day log retention                  │
└─────────────────────────────────────────┘
```

## Current Security Status

### ✅ Implemented

- **HTTPS with Let's Encrypt** - All traffic encrypted
- **Static IP** - Prevents IP hijacking
- **API Key Management** - Environment variables, gitignored
- **Regular Backups** - Snapshot capability
- **Docker Isolation** - Container security
- **Monitoring** - CloudWatch alerts for anomalies
- **Memory Protection** - Swap configured, OOM prevention
- **SSH Hardening** - fail2ban intrusion prevention, strict authentication (2025-10-19)
- **Real-time Log Monitoring** - CloudWatch log streaming for auth.log and fail2ban.log

### 🔧 In Progress

- **Input Validation** - Security modules created, pending deployment
- **Rate Limiting** - Implementation ready for production
- **Enhanced Monitoring** - Discord/Slack webhooks planned

### 📋 Planned Improvements

- **WAF (Web Application Firewall)** - CloudFlare integration
- **Automated Security Scanning** - GitHub Dependabot
- **Penetration Testing** - Quarterly assessments
- **SOC 2 Compliance** - For enterprise customers

## Security Best Practices

### 1. API Key Management

**Never commit secrets to git:**
```bash
# Good - Use environment variables
GROQ_API_KEY=${GROQ_API_KEY}

# Bad - Hardcoded keys
GROQ_API_KEY=gsk_actual_key_here
```

**Rotation schedule:**
- API keys: Every 90 days
- Admin passwords: Every 60 days
- SSL certificates: Auto-renewed before expiry

### 2. Access Control

**Principle of Least Privilege:**
- Users can only access their own data
- Admin functions require admin role
- SSH access limited to key-based auth
- Database access only through application

### 3. Monitoring & Alerting

**What we monitor:**
- Failed login attempts
- Memory/CPU anomalies
- Disk usage spikes
- API rate limit violations
- SSL certificate expiry

**Alert channels:**
- Email (implemented)
- CloudWatch SNS (implemented)
- Discord webhook (planned)

### 4. Incident Response

**Response procedure:**
1. **Detect** - Monitoring alerts trigger
2. **Assess** - Determine severity and scope
3. **Contain** - Isolate affected systems
4. **Eradicate** - Remove threat
5. **Recover** - Restore from backup if needed
6. **Document** - Update incident log

**Key contacts:**
- System Admin: admin@autonomos.dev
- AWS Support: Via console
- GitHub Security: security@github.com

## Security Checklist for Operators

### Daily Checks
- [ ] Review CloudWatch alerts
- [ ] Check system logs for anomalies
- [ ] Verify backup completion

### Weekly Checks
- [ ] Review user access logs
- [ ] Check for security updates
- [ ] Test backup restoration

### Monthly Checks
- [ ] Rotate API keys if needed
- [ ] Review and update firewall rules
- [ ] Security patch assessment

### Quarterly Checks
- [ ] Full security audit
- [ ] Update security documentation
- [ ] Incident response drill

## Common Security Tasks

### Check Security Status (NEW)

```bash
# Run comprehensive security dashboard
./scripts/security-status.sh

# Quick status check
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo fail2ban-client status sshd"
```

### Rotate API Keys

```bash
# 1. Generate new keys from providers
# 2. Update .env file
nano .env

# 3. Restart application
docker-compose restart

# 4. Verify functionality
docker logs open-webui
```

### Review Access Logs

```bash
# SSH authentication logs (local)
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo tail -f /var/log/auth.log"

# fail2ban activity
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo tail -f /var/log/fail2ban.log"

# CloudWatch Logs (via AWS Console)
# Navigate to: CloudWatch → Log groups → /aws/ec2/smartfarm/ssh

# Application access
docker logs open-webui | grep "401\|403"

# Nginx access logs
docker exec open-webui tail -f /var/log/nginx/access.log
```

### Manage fail2ban

```bash
# Check status
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo fail2ban-client status sshd"

# List banned IPs
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo fail2ban-client get sshd banip"

# Unban an IP
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo fail2ban-client set sshd unbanip <IP>"

# Restart fail2ban
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 "sudo systemctl restart fail2ban"
```

### Emergency Response

```bash
# Immediate lockdown
sudo ufw deny from any

# Stop services
docker-compose down

# Investigate
sudo journalctl -xe
docker logs open-webui

# Restore from backup if compromised
./scripts/restore.sh backup-file.tar.gz
```

## Security Resources

### Documentation
- [security/SSH_HARDENING_REPORT.md](security/SSH_HARDENING_REPORT.md) - SSH security configuration (2025-10-19)
- [security/INCIDENTS.md](security/INCIDENTS.md) - Incident history
- [security/SECRETS_MANAGEMENT.md](security/SECRETS_MANAGEMENT.md) - Key rotation procedures
- [security/AUDIT_REPORTS.md](security/AUDIT_REPORTS.md) - Security findings

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security details to: admin@autonomos.dev
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 48 hours and provide a fix within 7 days for critical issues.

## Compliance & Certifications

### Current Status
- **SSL/TLS**: A+ rating on SSL Labs
- **GDPR**: Basic compliance (data isolation, right to delete)
- **PCI DSS**: N/A (no payment processing)

### Future Goals
- **SOC 2 Type I**: 2026 target
- **ISO 27001**: Under consideration
- **HIPAA**: If healthcare use cases emerge

---

*Security documentation version: 2.0*
*Last reviewed: 2025-10-17*
*Next review: 2026-01-17*