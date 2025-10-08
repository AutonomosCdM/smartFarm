# Security Policy

## 🔒 Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. **DO NOT** Create a Public Issue

Security vulnerabilities should **never** be reported through public GitHub issues.

### 2. Report Privately

Please report security vulnerabilities by:

- **Email**: Send details to the repository maintainers
- **Subject**: "SECURITY: [Brief Description]"
- **Include**:
  - Type of vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if any)

### 3. What to Expect

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 5 business days
- **Fix Timeline**: Depends on severity
  - **Critical**: Within 7 days
  - **High**: Within 14 days
  - **Medium**: Within 30 days
  - **Low**: Next release cycle

## 🛡️ Security Best Practices

### API Keys and Secrets

- **NEVER** commit API keys or secrets to the repository
- Always use `.env` files for sensitive configuration
- Keep `.env` files in `.gitignore`
- Use `.env.example` for templates (without real values)
- Rotate API keys regularly

### Docker Security

- Use official Docker images only
- Keep Docker and images updated
- Don't run containers as root when possible
- Review volume permissions
- Use specific version tags instead of `latest` in production

### Environment Variables

```bash
# ✅ GOOD - Using environment variables
GROQ_API_KEY=your_key_here

# ❌ BAD - Hardcoded in files
api_key = "gsk_abc123..."
```

### GitHub Security Features

This repository uses:

- **Secret Scanning**: Detects committed secrets
- **Push Protection**: Blocks pushes containing secrets
- **Dependabot**: Automated dependency updates
- **Code Scanning**: Automated security analysis

## 🔐 Secure Configuration

### Minimum Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No secrets in configuration files
- [ ] Strong, unique API keys
- [ ] Regular dependency updates
- [ ] HTTPS for all external connections
- [ ] Container auto-restart enabled
- [ ] Regular backups configured
- [ ] Access logs monitored

### API Key Management

1. **Generate Strong Keys**
   - Use Groq Console to generate keys
   - Never reuse keys across projects

2. **Store Securely**
   - Use `.env` files locally
   - Use secret managers in production
   - Never commit to version control

3. **Rotate Regularly**
   - Change keys every 90 days minimum
   - Rotate immediately if compromised
   - Update all dependent systems

4. **Revoke Old Keys**
   - Revoke keys before generating new ones
   - Test with new keys before full deployment
   - Document key rotation in changelogs

## 🚫 Common Vulnerabilities to Avoid

### 1. Exposed Secrets

```bash
# ❌ NEVER DO THIS
git add .env
git commit -m "Add config"
```

```bash
# ✅ CORRECT
echo ".env" >> .gitignore
git add .env.example  # Template only
```

### 2. SQL Injection

While this project doesn't directly use SQL, be aware when extending:

```python
# ❌ VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_input}"

# ✅ SAFE
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_input,))
```

### 3. Command Injection

```bash
# ❌ VULNERABLE
docker exec container bash -c "echo $USER_INPUT"

# ✅ SAFE
docker exec container bash -c "echo \"$USER_INPUT\""
```

## 🔍 Security Auditing

### Regular Audits

Perform these checks monthly:

```bash
# Check for secrets in git history
git secrets --scan-history

# Audit dependencies
docker scout cves

# Check file permissions
find . -type f -perm 0777

# Review Docker image
docker history ghcr.io/open-webui/open-webui:main
```

### Automated Scans

This repository uses:

- **GitHub Secret Scanning**: Automatic
- **Dependabot Alerts**: Automatic
- **CodeQL Analysis**: On push to main

## 📋 Incident Response

If a security incident occurs:

1. **Assess Impact**
   - Determine scope and severity
   - Identify affected systems

2. **Contain**
   - Revoke compromised credentials
   - Isolate affected systems
   - Document all actions

3. **Eradicate**
   - Remove vulnerabilities
   - Patch systems
   - Update dependencies

4. **Recover**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for recurrence

5. **Report**
   - Notify affected users
   - Document timeline
   - Implement preventive measures

## 🆘 Emergency Contacts

For critical security issues requiring immediate attention:

1. Create a security advisory on GitHub
2. Contact repository maintainers directly
3. For Groq API issues: [Groq Support](https://groq.com/support)
4. For Open WebUI issues: [Open WebUI Security](https://github.com/open-webui/open-webui/security)

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Groq Security Documentation](https://console.groq.com/docs/security)

## 🏆 Responsible Disclosure

We appreciate responsible disclosure and will:

- Acknowledge your contribution
- Keep you updated on fix progress
- Credit you in security advisories (if desired)
- Consider a security acknowledgment section

Thank you for helping keep SmartFarm secure! 🛡️
