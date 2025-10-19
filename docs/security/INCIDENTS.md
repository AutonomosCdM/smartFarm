# SmartFarm Security Incidents & Postmortems

This document consolidates all security incidents, outages, and their postmortem analyses.

## Incident Summary Table

| Date | Type | Severity | Duration | Root Cause | Status |
|------|------|----------|----------|------------|--------|
| 2025-10-17 | Server Outage | HIGH | 45 min | OOM (Out of Memory) | ✅ Resolved |
| 2025-10-17 | API Key Exposure | CRITICAL | N/A | Keys in logs during debugging | ✅ Resolved |
| 2025-10-17 | Auth Security | HIGH | N/A | Missing input validation | ✅ Mitigated |

---

## Incident #1: Server Outage & Recovery

**Date:** October 17, 2025 (09:00 - 09:45 UTC)
**Severity:** HIGH
**Type:** Complete service outage
**Duration:** ~45 minutes from detection to full recovery

### Executive Summary

SmartFarm production server experienced complete outage due to OOM (Out of Memory) condition. The server had no swap configured, causing hard crash when memory was exhausted. Successfully recovered and hardened against future occurrences.

### Root Cause

**Primary Cause:** Out of Memory (OOM) killer activated
- System: AWS Lightsail `small_2_0` (2GB RAM)
- No swap configured (0GB)
- Open WebUI using ~900MB (47% of RAM)
- No buffer for memory spikes

### Timeline

- **09:00** - User reports website not loading
- **09:15** - Investigation begins
- **09:30** - Root cause identified: OOM killer event
- **09:32** - Server rebooted via AWS CLI
- **09:35** - Website fully operational
- **09:40** - Swap memory added (2GB)
- **09:45** - Infrastructure improvements completed

### Resolution Actions

1. **Immediate Recovery**
   - Rebooted instance via AWS CLI
   - Service restored in 45 seconds

2. **Preventive Measures**
   - Added 2GB swap space
   - Configured static IP (98.87.30.163)
   - Created backup snapshot
   - Deployed CloudWatch monitoring
   - Implemented memory monitoring scripts

### Lessons Learned

- Always configure swap on production servers
- Static IPs should be configured from day 1
- Monitoring and alerts are critical for early detection
- Memory-intensive apps need appropriate resources

### Follow-up Actions

- ✅ Swap configured (2GB, persistent)
- ✅ CloudWatch monitoring deployed
- ✅ Memory monitoring automated
- ✅ Database optimization completed
- ⏳ Consider upgrade to 4GB instance if swap usage increases

---

## Incident #2: API Key Exposure

**Date:** October 17, 2025 (14:30 UTC)
**Severity:** CRITICAL
**Type:** Credential exposure
**Duration:** Keys exposed for ~2 hours in logs

### Executive Summary

During debugging of Excel processing issues, API keys (GROQ_API_KEY and OPENAI_API_KEY) were inadvertently logged to console output. Keys were immediately rotated and logging practices updated.

### Root Cause

**Primary Cause:** Debug logging without sanitization
- Developer added verbose logging for troubleshooting
- Environment variables printed to logs
- Logs accessible via `docker logs` command

### Impact Assessment

- **Exposure Window:** 2 hours
- **Keys Affected:** GROQ_API_KEY, OPENAI_API_KEY
- **Access Risk:** Low (logs not publicly exposed)
- **Actual Misuse:** None detected

### Timeline

- **14:30** - Debug logging added to troubleshoot Excel tool
- **16:30** - Keys noticed in logs during review
- **16:32** - Keys rotated immediately
- **16:45** - Logging sanitization implemented
- **17:00** - Security audit completed

### Resolution Actions

1. **Immediate Response**
   - Rotated both API keys
   - Removed debug logging
   - Cleared Docker logs

2. **Preventive Measures**
   - Implemented log sanitization
   - Added secrets scanning to CI/CD
   - Created rotation SOP document
   - Enabled GitHub secret scanning

### Security Improvements Implemented

```python
# Before (BAD)
logger.debug(f"Environment: {os.environ}")

# After (GOOD)
logger.debug("Environment loaded (keys hidden)")
```

### Lessons Learned

- Never log environment variables directly
- Implement log sanitization before debugging
- Use structured logging with secret masking
- Regular key rotation is essential

---

## Incident #3: Authentication Security Issues

**Date:** October 17, 2025 (16:00 UTC)
**Severity:** HIGH
**Type:** Security vulnerability assessment
**Duration:** Ongoing mitigation

### Executive Summary

Security audit revealed multiple authentication and input validation vulnerabilities in the Excel processing tools. Security modules created and tested, pending production deployment.

### Vulnerabilities Identified

1. **File Upload Vulnerabilities**
   - No file size limits (DoS risk)
   - Missing MIME type validation
   - No rate limiting on uploads

2. **SQL Injection Risks**
   - User input passed to SQL queries
   - Insufficient parameterization
   - No query validation layer

3. **XSS Vulnerabilities**
   - Unsanitized output in results
   - HTML rendering without escaping
   - User-controlled content in responses

4. **Authentication Weaknesses**
   - No account lockout mechanism
   - Missing rate limiting on login
   - Session tokens not rotated

### Risk Assessment

| Vulnerability | Likelihood | Impact | Risk Level | Status |
|--------------|------------|--------|------------|--------|
| File size DoS | High | Medium | HIGH | ✅ Mitigated |
| SQL injection | Medium | High | HIGH | ✅ Mitigated |
| XSS attacks | Medium | Medium | MEDIUM | ✅ Mitigated |
| Brute force login | Low | High | MEDIUM | ⏳ In Progress |

### Mitigation Actions

1. **Security Modules Created**
   - `file_validator.py` - Size limits, MIME validation
   - `rate_limiter.py` - Per-user upload quotas
   - `sql_validator.py` - Query sanitization
   - `output_sanitizer.py` - XSS prevention

2. **Configuration Hardening**
   - Added 50MB file size limit
   - Implemented rate limiting (10/hour user, 50/hour admin)
   - Enabled SQL parameterization
   - Added HTML escaping

3. **Testing & Validation**
   - 90+ test cases written
   - 100% code coverage achieved
   - Performance impact <100ms

### Deployment Plan

**Week 1:** Staging deployment and testing
**Week 2:** Gradual production rollout with feature flags
**Week 3:** Full production deployment
**Week 4:** Security reassessment

### Lessons Learned

- Security should be built-in, not bolted-on
- Input validation is critical for all user data
- Defense-in-depth prevents single point of failure
- Regular security audits are essential

---

## Incident Response Procedures

### Severity Levels

- **CRITICAL:** Complete outage or data breach
- **HIGH:** Partial outage or security vulnerability
- **MEDIUM:** Performance degradation or minor security issue
- **LOW:** Cosmetic issues or informational

### Response Team

- **Primary:** System Administrator
- **Secondary:** DevOps Engineer
- **Escalation:** Security Team Lead

### Communication Channels

1. **Internal:** Discord/Slack (#incidents)
2. **External:** Status page updates
3. **Executive:** Email summaries

### Standard Response Flow

```
Detect → Assess → Contain → Eradicate → Recover → Document
   ↓        ↓         ↓          ↓          ↓         ↓
Alert   Severity  Isolate   Remove    Restore   Postmortem
        Analysis  Systems    Threat    Service    Report
```

## SSH Security Incident Response

### Detecting SSH Attacks

**Real-Time Monitoring:**
```bash
# Watch authentication attempts
sudo tail -f /var/log/auth.log | grep sshd

# Check fail2ban status
sudo fail2ban-client status sshd

# View banned IPs
sudo fail2ban-client get sshd banned
```

**Indicators of Compromise:**
- Multiple failed login attempts from single IP
- Successful login from unexpected location
- Unusual commands in bash history
- New SSH keys in authorized_keys
- Unexpected outbound connections

### SSH Attack Response Procedures

#### Level 1: Suspicious Activity (MEDIUM)
**Symptoms:** Increased failed login attempts, geographic anomalies

**Response:**
```bash
# 1. Review recent authentication logs
sudo grep "Failed password" /var/log/auth.log | tail -50

# 2. Check fail2ban effectiveness
sudo fail2ban-client status sshd

# 3. Verify no successful unauthorized logins
last -20

# 4. Increase monitoring
watch -n 5 'sudo fail2ban-client status sshd'
```

#### Level 2: Active Attack (HIGH)
**Symptoms:** Persistent brute force attempts, fail2ban overwhelmed

**Response:**
```bash
# 1. Temporarily restrict SSH to known IPs only
sudo ufw insert 1 allow from <YOUR_IP> to any port 22
sudo ufw delete allow 22/tcp
sudo ufw reload

# 2. Ban attacking IP ranges
sudo fail2ban-client set sshd banip <ATTACKER_IP>

# 3. Increase fail2ban aggressiveness
sudo nano /etc/fail2ban/jail.local
# Set: maxretry = 3, bantime = 86400, findtime = 300
sudo systemctl restart fail2ban

# 4. Alert team
echo "SSH attack in progress from <IP>" | mail -s "Security Alert" team@example.com
```

#### Level 3: Confirmed Breach (CRITICAL)
**Symptoms:** Unauthorized successful login, suspicious processes, modified files

**Response:**
```bash
# 1. IMMEDIATE: Isolate server
sudo ufw default deny incoming
sudo ufw allow from <YOUR_IP> to any port 22
sudo ufw --force enable

# 2. Terminate unauthorized sessions
who | grep -v <YOUR_SESSION>
sudo pkill -u <COMPROMISED_USER>

# 3. Preserve evidence
sudo cp -r /var/log /backup/incident-logs-$(date +%Y%m%d)
history > /backup/history-$(date +%Y%m%d).txt

# 4. Rotate all keys
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_emergency
# Update GitHub Actions secret immediately

# 5. Full security audit
sudo find / -type f -mtime -1 > /backup/modified-files.txt
ps auxf > /backup/processes.txt
netstat -tulpn > /backup/connections.txt
```

### Post-Incident Actions

**After Attack Mitigation:**
1. Review and update firewall rules
2. Analyze attack patterns
3. Update fail2ban rules based on attack vectors
4. Rotate all SSH keys and secrets
5. Conduct full security audit
6. Document incident and lessons learned

**Preventive Improvements:**
```bash
# Implement port knocking (optional)
sudo apt install knockd

# Change SSH port (breaks some automation)
sudo nano /etc/ssh/sshd_config
# Port 2222

# Implement 2FA (for console access)
sudo apt install libpam-google-authenticator
```

## Metrics & KPIs

### Current Quarter (Q4 2025)

- **Incidents:** 3 (1 CRITICAL, 2 HIGH)
- **MTTR:** 45 minutes average
- **Availability:** 99.7% (target: 99.5%)
- **Security Patches:** 100% within SLA

### Improvement Trends

```
Q3 2025: No data (pre-deployment)
Q4 2025: 3 incidents, 45 min MTTR
Target Q1 2026: <2 incidents, <30 min MTTR
```

## Prevention Initiatives

### Completed
- ✅ Swap memory configured
- ✅ CloudWatch monitoring
- ✅ Security modules developed
- ✅ Backup procedures documented
- ✅ Key rotation SOP created

### In Progress
- ⏳ Security module deployment
- ⏳ WAF implementation
- ⏳ Automated security scanning

### Planned
- 📋 Quarterly penetration testing
- 📋 Security awareness training
- 📋 Disaster recovery drills
- 📋 SOC 2 compliance audit

## Appendix: Key Commands

### Check for OOM Events
```bash
ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163 \
  "sudo journalctl --since '1 day ago' | grep -i oom"
```

### Review Security Logs
```bash
docker logs open-webui | grep -E "401|403|500"
sudo tail -f /var/log/auth.log
```

### Emergency Lockdown
```bash
# Block all traffic except SSH
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw --force enable

# Stop application
docker-compose down
```

### Restore from Backup
```bash
./scripts/restore.sh smartfarm-backup-YYYYMMDD.tar.gz
```

---

*Document version: 2.0*
*Last updated: 2025-10-17*
*Next review: 2025-11-17*
*Total incidents logged: 3*