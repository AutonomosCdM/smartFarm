# SmartFarm Secrets Management

## Overview

This document consolidates all secrets management procedures, rotation schedules, and security practices for SmartFarm.

## Secrets Inventory

### API Keys

| Service | Key Variable | Purpose | Rotation Schedule | Last Rotated | Next Rotation |
|---------|-------------|---------|-------------------|--------------|---------------|
| Groq | GROQ_API_KEY | LLM inference | 90 days | 2025-10-17 | 2026-01-15 |
| OpenAI | OPENAI_API_KEY | Embeddings for Excel | 90 days | 2025-10-17 | 2026-01-15 |

### System Credentials

| Credential | Type | Rotation Schedule | Last Changed | Next Change |
|-----------|------|-------------------|--------------|-------------|
| SSH Key | Key pair | Annual | 2025-10-08 | 2026-10-08 |
| Admin Password | Web UI | 60 days | 2025-10-08 | 2025-12-07 |
| Ubuntu User | System | 180 days | 2025-10-08 | 2026-04-08 |

### Infrastructure Secrets

| Secret | Location | Purpose | Rotation |
|--------|----------|---------|----------|
| SSL Certificate | Let's Encrypt | HTTPS | Auto (90 days) |
| CloudWatch Keys | AWS CLI | Monitoring | IAM role (no rotation) |
| GitHub Deploy Key | GitHub Secrets | CI/CD | Annual |

## Rotation Procedures

### API Key Rotation

#### Groq API Key

1. **Generate New Key**
   ```bash
   # Visit https://console.groq.com/keys
   # Click "Create API Key"
   # Copy the new key (starts with gsk_)
   ```

2. **Update Production**
   ```bash
   # SSH to server
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

   # Update .env file
   cd /opt/smartfarm
   sudo nano .env
   # Replace GROQ_API_KEY=gsk_old with GROQ_API_KEY=gsk_new

   # Restart container
   sudo docker-compose restart
   ```

3. **Verify**
   ```bash
   # Check logs for errors
   sudo docker logs open-webui --tail 50

   # Test chat functionality
   curl -I https://smartfarm.autonomos.dev
   ```

4. **Revoke Old Key**
   ```bash
   # Return to https://console.groq.com/keys
   # Delete the old key
   ```

#### OpenAI API Key

1. **Generate New Key**
   ```bash
   # Visit https://platform.openai.com/api-keys
   # Click "Create new secret key"
   # Copy the new key (starts with sk-)
   ```

2. **Update Production**
   ```bash
   # Same process as Groq
   sudo nano /opt/smartfarm/.env
   # Replace OPENAI_API_KEY=sk-old with OPENAI_API_KEY=sk-new
   sudo docker-compose restart
   ```

3. **Verify Excel Tool**
   ```bash
   # Test Excel processing functionality
   # Upload test spreadsheet via UI
   ```

4. **Revoke Old Key**
   ```bash
   # Return to OpenAI platform
   # Delete old key
   ```

### SSH Key Rotation

1. **Generate New Key Pair**
   ```bash
   # On local machine
   ssh-keygen -t ed25519 -f ~/Downloads/smartfarm-key-new.pem
   chmod 400 ~/Downloads/smartfarm-key-new.pem
   ```

2. **Add New Public Key**
   ```bash
   # Connect with old key
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163

   # Add new public key
   echo "ssh-ed25519 AAAAC3... your-email" >> ~/.ssh/authorized_keys
   ```

3. **Test New Key**
   ```bash
   # From local machine
   ssh -i ~/Downloads/smartfarm-key-new.pem ubuntu@98.87.30.163
   ```

4. **Remove Old Key**
   ```bash
   # Edit authorized_keys
   nano ~/.ssh/authorized_keys
   # Remove old key line
   ```

5. **Update Documentation**
   ```bash
   # Update all references to old key filename
   # Update GitHub Secrets if used in CI/CD
   ```

## Rotation Schedule

### Quarterly Tasks (Every 90 Days)

- [ ] Rotate Groq API key
- [ ] Rotate OpenAI API key
- [ ] Review access logs
- [ ] Update security documentation

### Bi-Monthly Tasks (Every 60 Days)

- [ ] Change admin password
- [ ] Review user accounts
- [ ] Audit API usage

### Semi-Annual Tasks (Every 180 Days)

- [ ] Change system passwords
- [ ] Review firewall rules
- [ ] Security audit

### Annual Tasks

- [ ] Rotate SSH keys
- [ ] Update GitHub deploy keys
- [ ] Full security review
- [ ] Compliance assessment

## Emergency Rotation Procedures

### Suspected Compromise

If any secret is suspected to be compromised:

1. **Immediate Actions** (< 5 minutes)
   ```bash
   # 1. Generate new secret immediately
   # 2. Update production
   ssh -i ~/Downloads/smartfarm-key.pem ubuntu@98.87.30.163
   sudo nano /opt/smartfarm/.env
   sudo docker-compose restart

   # 3. Revoke compromised secret
   # 4. Check logs for unauthorized access
   sudo docker logs open-webui | grep -E "401|403"
   ```

2. **Investigation** (< 30 minutes)
   - Review access logs
   - Check for data exfiltration
   - Identify exposure vector
   - Document timeline

3. **Remediation** (< 1 hour)
   - Patch vulnerability
   - Rotate all related secrets
   - Update security procedures
   - Notify stakeholders if needed

### Rotation Checklist Template

```markdown
## [Service] Key Rotation - [Date]

### Pre-Rotation
- [ ] Backup current configuration
- [ ] Document current key (last 4 chars only)
- [ ] Verify rollback procedure
- [ ] Schedule maintenance window (if needed)

### Rotation
- [ ] Generate new key
- [ ] Update development environment
- [ ] Test in development
- [ ] Update production environment
- [ ] Restart services
- [ ] Verify functionality

### Post-Rotation
- [ ] Revoke old key
- [ ] Update documentation
- [ ] Update password manager
- [ ] Log rotation in this document
- [ ] Set next rotation reminder

### Verification Tests
- [ ] API connectivity test
- [ ] Feature functionality test
- [ ] Performance verification
- [ ] Error log review
```

## Best Practices

### Storage

1. **Never Store Secrets In:**
   - Git repositories
   - Docker images
   - Log files
   - Slack/Discord/Email
   - Documentation

2. **Always Store Secrets In:**
   - Environment variables
   - `.env` files (gitignored)
   - Password managers
   - AWS Secrets Manager (future)

### Access Control

1. **Principle of Least Privilege**
   - Only grant necessary permissions
   - Use read-only keys where possible
   - Separate keys for dev/staging/production

2. **Audit Trail**
   - Log all secret access
   - Monitor for unusual patterns
   - Regular access reviews

### Security Measures

1. **Key Complexity**
   - Use provider's maximum key length
   - Never create custom/weak keys
   - Use different keys for different environments

2. **Transmission Security**
   - Only transmit over encrypted channels (HTTPS/SSH)
   - Never send via unencrypted email
   - Use secure file transfer for key exchange

## Automation Opportunities

### Current Manual Process

All rotation is currently manual, taking ~30 minutes per rotation.

### Future Automation Plans

1. **Phase 1: Alerts** (Q1 2026)
   - Automated expiry notifications
   - Calendar reminders
   - Slack/Discord alerts

2. **Phase 2: Semi-Automation** (Q2 2026)
   - Script-assisted rotation
   - Automated testing
   - One-click deployment

3. **Phase 3: Full Automation** (Q3 2026)
   - AWS Secrets Manager integration
   - Automatic rotation
   - Zero-downtime updates

## Compliance Requirements

### Current Compliance

- **SOC 2**: Basic key rotation (90 days)
- **GDPR**: Data encryption at rest and in transit
- **PCI DSS**: N/A (no payment processing)

### Audit Evidence

- Rotation logs maintained in this document
- CloudWatch logs for access patterns
- Git history for configuration changes

## Secret Rotation Log

### 2025

#### Q4 2025
- **2025-10-17**: Emergency rotation - Groq and OpenAI keys (exposed in logs)
- **2025-10-08**: Initial setup - All keys created

### Upcoming Rotations

- **2025-12-07**: Admin password rotation due
- **2026-01-15**: API keys rotation due (90 days)
- **2026-04-08**: System password rotation due (180 days)
- **2026-10-08**: SSH key rotation due (annual)

## Tools and Scripts

### Check Key Age
```bash
#!/bin/bash
# check-key-age.sh

echo "=== SmartFarm Secret Ages ==="
echo "Groq API Key last rotated: 2025-10-17 ($(( ($(date +%s) - $(date -d '2025-10-17' +%s)) / 86400 )) days ago)"
echo "OpenAI API Key last rotated: 2025-10-17 ($(( ($(date +%s) - $(date -d '2025-10-17' +%s)) / 86400 )) days ago)"
echo "SSH Key created: 2025-10-08 ($(( ($(date +%s) - $(date -d '2025-10-08' +%s)) / 86400 )) days ago)"
```

### Test API Keys
```bash
#!/bin/bash
# test-api-keys.sh

# Test Groq API
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY" | jq '.data[0]' > /dev/null && \
  echo "✅ Groq API key valid" || echo "❌ Groq API key invalid"

# Test OpenAI API
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.data[0]' > /dev/null && \
  echo "✅ OpenAI API key valid" || echo "❌ OpenAI API key invalid"
```

## Contact Information

### Key Stakeholders

| Role | Contact | Responsibility |
|------|---------|---------------|
| System Admin | admin@autonomos.dev | Primary key rotation |
| DevOps Lead | N/A | Backup rotation authority |
| Security Team | security@autonomos.dev | Incident response |

### External Support

| Service | Support URL | Response Time |
|---------|------------|---------------|
| Groq | console.groq.com/support | 24-48 hours |
| OpenAI | help.openai.com | 24-48 hours |
| AWS | AWS Support Console | 1-24 hours (based on plan) |

---

*Document version: 2.0*
*Last updated: 2025-10-17*
*Next review: 2025-12-17*
*Total secrets managed: 5*