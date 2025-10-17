# SmartFarm Security Modules

**Status:** Security Hardening Implementation
**Date:** 2025-10-17
**Modules:** File Validation, Rate Limiting, SQL Validation, Output Sanitization

---

## Overview

This directory contains security modules for hardening SmartFarm's file upload and query processing system. These modules provide defense-in-depth protection against common web application vulnerabilities.

### Modules

| Module | Purpose | Protection Against |
|--------|---------|---------------------|
| `file_validator.py` | File upload validation | DoS, Malicious files, Path traversal |
| `rate_limiter.py` | Upload rate limiting | Resource exhaustion, DoS |
| `sql_validator.py` | SQL query validation | SQL injection, Malicious queries |
| `output_sanitizer.py` | Result sanitization | XSS, Information leakage |

---

## Quick Start

### Installation

```bash
# Install dependencies
pip install python-magic werkzeug redis pandas

# For macOS/Linux (libmagic required)
brew install libmagic  # macOS
sudo apt-get install libmagic1  # Ubuntu/Debian

# For Windows
pip install python-magic-bin
```

### Basic Usage

```python
from security.file_validator import validate_upload
from security.rate_limiter import init_rate_limiter, check_rate_limit
from security.sql_validator import validate_sql
from security.output_sanitizer import sanitize_dataframe

# 1. Validate file upload
try:
    with open('upload.xlsx', 'rb') as f:
        file_data = f.read()

    result = validate_upload(file_data, 'upload.xlsx', user={'id': 'user123'})
    print(f"✅ File validated: {result['safe_filename']}")
except FileValidationError as e:
    print(f"❌ Validation failed: {e}")

# 2. Check rate limit
init_rate_limiter(backend='memory')  # or 'redis' for production

try:
    check_rate_limit('user123', role='user')
    print("✅ Rate limit OK")
except RateLimitExceeded as e:
    print(f"❌ Rate limit exceeded: {e}")

# 3. Validate SQL query
try:
    result = validate_sql("SELECT * FROM users WHERE age > 18")
    print(f"✅ SQL valid: {result['sanitized_query']}")
except SQLValidationError as e:
    print(f"❌ SQL invalid: {e}")

# 4. Sanitize output
import pandas as pd

df = pd.DataFrame({'name': ['<script>alert(1)</script>']})
df_safe, warning = sanitize_dataframe(df)
print(f"✅ Output sanitized: {df_safe}")
```

---

## Integration Guide

### 1. File Upload Validation

**Integrate into upload endpoint:**

```python
from security.file_validator import validate_upload, FileValidationError

async def handle_file_upload(file, user):
    """Handle file upload with security validation"""

    try:
        # Read file data
        file_data = await file.read()

        # Validate file
        result = validate_upload(
            file_data=file_data,
            filename=file.filename,
            user={'id': user.id, 'role': user.role}
        )

        # Use safe filename
        safe_filename = result['safe_filename']
        save_path = f"/tmp/uploads/{safe_filename}"

        # Save file
        with open(save_path, 'wb') as f:
            f.write(file_data)

        return {
            'success': True,
            'filename': safe_filename,
            'metadata': result['metadata']
        }

    except FileValidationError as e:
        return {
            'success': False,
            'error': str(e)
        }
```

### 2. Rate Limiting

**Initialize rate limiter (startup):**

```python
from security.rate_limiter import init_rate_limiter

# Development (in-memory)
limiter = init_rate_limiter(backend='memory')

# Production (Redis)
import redis
redis_client = redis.Redis(host='localhost', port=6379)
limiter = init_rate_limiter(backend='redis', redis_client=redis_client)
```

**Check rate limit before upload:**

```python
from security.rate_limiter import check_rate_limit, RateLimitExceeded

async def upload_handler(request, user):
    try:
        # Check rate limit
        check_rate_limit(
            identifier=user.id,  # or request.client.host for IP-based
            role=user.role,
            action='upload'
        )

        # Proceed with upload
        # ...

    except RateLimitExceeded as e:
        return JSONResponse(
            status_code=429,
            content={'error': str(e)}
        )
```

### 3. SQL Query Validation

**Validate LLM-generated SQL:**

```python
from security.sql_validator import validate_sql, SQLValidationError

def execute_query(query_text):
    """Execute SQL query with validation"""

    try:
        # Generate SQL using LlamaIndex
        sql_query = llm_generate_sql(query_text)

        # Validate SQL
        result = validate_sql(sql_query)

        if result['warnings']:
            logger.warning(f"SQL warnings: {result['warnings']}")

        # Execute sanitized SQL
        safe_sql = result['sanitized_query']
        data = db.execute(safe_sql).fetchall()

        return {
            'success': True,
            'sql': safe_sql,
            'data': data
        }

    except SQLValidationError as e:
        logger.error(f"SQL validation failed: {e}")
        return {
            'success': False,
            'error': 'Invalid query generated'
        }
```

### 4. Output Sanitization

**Sanitize query results:**

```python
from security.output_sanitizer import sanitize_dataframe, sanitize_sql

def return_query_results(df, sql_query, user):
    """Return sanitized query results"""

    # Sanitize DataFrame
    df_safe, warning = sanitize_dataframe(df, max_rows=1000)

    # Sanitize SQL (hide sensitive info)
    sql_safe = sanitize_sql(sql_query, hide_sensitive=True)

    # Build response
    response = {
        'success': True,
        'sql': sql_safe,
        'results': df_safe.to_dict('records'),
        'row_count': len(df_safe),
    }

    if warning:
        response['warning'] = warning

    return response
```

**Sanitize error messages:**

```python
from security.output_sanitizer import safe_error_message

def handle_error(error, user):
    """Return safe error message"""

    # User role determines detail level
    message = safe_error_message(error, user_role=user.role)

    return {
        'success': False,
        'error': message
    }
```

---

## Configuration

### File Validator

```python
from security.file_validator import FileValidator

validator = FileValidator(
    max_size=50 * 1024 * 1024  # 50MB (default)
)

# Override allowed types
validator.ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
]
```

### Rate Limiter

```python
from security.rate_limiter import init_rate_limiter

# Custom quotas
custom_quotas = {
    'admin': {'max_uploads': 100, 'window_minutes': 60},
    'user': {'max_uploads': 20, 'window_minutes': 60},
    'anonymous': {'max_uploads': 3, 'window_minutes': 60},
}

limiter = init_rate_limiter(
    backend='redis',
    redis_client=redis_client,
    custom_quotas=custom_quotas
)
```

### SQL Validator

```python
from security.sql_validator import SQLValidator

validator = SQLValidator(
    strict_mode=True,        # Enforce strict rules
    allow_comments=False     # Block SQL comments
)

# Override complexity limits
validator.MAX_JOINS = 5
validator.MAX_SUBQUERIES = 3
```

### Output Sanitizer

```python
from security.output_sanitizer import OutputSanitizer

sanitizer = OutputSanitizer(
    max_rows=500,           # Truncate large results
    max_cell_length=500     # Truncate long cells
)
```

---

## Testing

### Run Security Tests

```bash
# All security tests
pytest tests/security/ -v

# Specific test suite
pytest tests/security/test_file_validation.py -v
pytest tests/security/test_sql_injection.py -v
pytest tests/security/test_rate_limiting.py -v
pytest tests/security/test_output_sanitization.py -v

# With coverage
pytest tests/security/ --cov=security --cov-report=html
```

### Test SQL Injection Protection

```bash
# Run built-in SQL injection tests
python security/sql_validator.py

# Output:
# 🔒 SQL Injection Protection Test
# ✅ PASS: Blocked: '; DROP TABLE users; --
# ✅ PASS: Blocked: 1' OR '1'='1
# ...
```

### Manual Testing

```bash
# Test file validation
python security/file_validator.py /path/to/test.xlsx

# Test with malicious file
python security/file_validator.py /path/to/malicious.exe
# Expected: ❌ Validation failed: Invalid file type
```

---

## Security Best Practices

### 1. Defense in Depth

Use **all** modules together:

```python
# Complete secure upload flow
async def secure_upload(file, user):
    # 1. Rate limiting
    check_rate_limit(user.id, user.role)

    # 2. File validation
    file_data = await file.read()
    result = validate_upload(file_data, file.filename, user)

    # 3. Safe storage
    safe_path = f"/tmp/{result['safe_filename']}"
    with open(safe_path, 'wb') as f:
        f.write(file_data)

    # 4. Process file
    df = pd.read_excel(safe_path)

    # 5. Validate SQL
    sql = generate_sql(query)
    validate_sql(sql)

    # 6. Sanitize output
    df_safe, warning = sanitize_dataframe(df)

    return df_safe
```

### 2. Logging & Monitoring

```python
import logging

security_logger = logging.getLogger('smartfarm.security')

# Log security events
try:
    check_rate_limit(user_id, role)
except RateLimitExceeded:
    security_logger.warning(
        f"Rate limit exceeded: user={user_id}, role={role}",
        extra={'ip': request.client.host}
    )
    raise
```

### 3. Regular Updates

```bash
# Update dependencies monthly
pip install --upgrade python-magic werkzeug redis

# Check for vulnerabilities
pip install safety
safety check
```

### 4. Production Deployment

**Environment variables:**

```bash
# .env
RATE_LIMIT_BACKEND=redis
REDIS_HOST=localhost
REDIS_PORT=6379

FILE_UPLOAD_MAX_SIZE=52428800  # 50MB
FILE_UPLOAD_ALLOWED_TYPES=xlsx,xls,csv
```

**Docker integration:**

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  smartfarm:
    environment:
      - RATE_LIMIT_BACKEND=redis
      - REDIS_HOST=redis
```

---

## Troubleshooting

### File Validation Issues

**Problem:** "Failed to detect file type"

**Solution:**
```bash
# Install libmagic
brew install libmagic  # macOS
sudo apt-get install libmagic1  # Linux

# Or use python-magic-bin (Windows)
pip install python-magic-bin
```

### Rate Limiting Issues

**Problem:** Redis connection errors

**Solution:**
```python
# Add connection timeout
redis_client = redis.Redis(
    host='localhost',
    port=6379,
    socket_timeout=5,
    socket_connect_timeout=5
)

# Test connection
try:
    redis_client.ping()
    print("✅ Redis connected")
except redis.ConnectionError:
    print("❌ Redis unavailable, falling back to memory")
    limiter = init_rate_limiter(backend='memory')
```

### SQL Validation False Positives

**Problem:** Legitimate query blocked

**Solution:**
```python
# Disable strict mode for specific cases
validator = SQLValidator(strict_mode=False, allow_comments=True)

# Or whitelist specific patterns
validator.ALLOWED_OPERATIONS.add('CUSTOM_FUNCTION')
```

---

## Performance Impact

| Module | Overhead | Notes |
|--------|----------|-------|
| File Validator | ~50ms | MIME detection + sanitization |
| Rate Limiter (Memory) | <1ms | In-memory lookup |
| Rate Limiter (Redis) | ~5ms | Network round-trip |
| SQL Validator | ~10ms | Regex matching + parsing |
| Output Sanitizer | ~20ms | HTML escaping + truncation |

**Total overhead:** ~86ms per request (acceptable for security)

---

## Security Checklist

### Pre-Deployment

- [ ] All security modules installed
- [ ] Tests passing (100% coverage)
- [ ] Rate limiter configured (Redis in production)
- [ ] File size limits appropriate
- [ ] SQL validator in strict mode
- [ ] Output sanitization enabled
- [ ] Logging configured
- [ ] Monitoring/alerts set up

### Production

- [ ] HTTPS enabled
- [ ] API keys rotated
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Error messages sanitized
- [ ] Audit logging enabled
- [ ] Backups configured

### Ongoing

- [ ] Monthly dependency updates
- [ ] Quarterly penetration testing
- [ ] Weekly log review
- [ ] API key rotation (90 days)

---

## Support

**Documentation:**
- Main: [INPUT_VALIDATION.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/INPUT_VALIDATION.md)
- Excel: [EXCEL_PROCESSING.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/EXCEL_PROCESSING.md)
- Troubleshooting: [TROUBLESHOOTING.md](/Users/autonomos_dev/Projects/smartFarm_v5/docs/TROUBLESHOOTING.md)

**Issues:**
- GitHub: https://github.com/AutonomosCdM/smartFarm/issues
- Security: security@autonomos.dev (PGP key available)

---

## License

MIT License - See LICENSE file for details

## Authors

SmartFarm Security Team
- Initial implementation: 2025-10-17
- Maintained by: Autonomos CdM
