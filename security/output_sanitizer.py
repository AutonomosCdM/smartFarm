"""
Output Sanitization Module

Sanitizes query results and error messages to prevent:
- XSS attacks via cell values
- Information leakage via error messages
- Markdown/HTML injection
- Large result set DoS

Author: SmartFarm Security Team
Date: 2025-10-17
"""

import html
import re
import pandas as pd
from typing import Optional, Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)


class OutputSanitizer:
    """Sanitizes output for safe display"""

    # Configuration
    MAX_ROWS = 1000
    MAX_CELL_LENGTH = 1000
    MAX_COLUMN_NAME_LENGTH = 100

    def __init__(
        self,
        max_rows: Optional[int] = None,
        max_cell_length: Optional[int] = None
    ):
        """
        Initialize output sanitizer

        Args:
            max_rows: Override default max rows
            max_cell_length: Override default max cell length
        """
        if max_rows:
            self.MAX_ROWS = max_rows
        if max_cell_length:
            self.MAX_CELL_LENGTH = max_cell_length

    def sanitize_dataframe(
        self,
        df: pd.DataFrame,
        escape_html: bool = True,
        truncate_large: bool = True
    ) -> Tuple[pd.DataFrame, Optional[str]]:
        """
        Sanitize DataFrame for safe display

        Args:
            df: Input DataFrame
            escape_html: HTML escape string values
            truncate_large: Truncate large result sets

        Returns:
            Tuple of (sanitized_df, warning_message)
        """

        warning = None

        # 1. Truncate large result sets
        if truncate_large and len(df) > self.MAX_ROWS:
            df = df.head(self.MAX_ROWS)
            warning = (
                f"⚠️ Results truncated to {self.MAX_ROWS} rows "
                f"(original: {len(df)} rows)"
            )
            logger.warning(f"DataFrame truncated: {len(df)} -> {self.MAX_ROWS} rows")

        # 2. Sanitize column names
        df = self._sanitize_column_names(df)

        # 3. Sanitize cell values
        if escape_html:
            df = self._sanitize_cell_values(df)

        # 4. Handle special numeric values
        df = self._sanitize_numeric_values(df)

        return df, warning

    def _sanitize_column_names(self, df: pd.DataFrame) -> pd.DataFrame:
        """Sanitize column names to prevent injection"""

        safe_columns = []

        for col in df.columns:
            # Convert to string
            col_str = str(col)

            # Remove/replace special characters
            # Keep: alphanumeric, underscore, hyphen, space
            safe_col = re.sub(r'[^a-zA-Z0-9_\- ]', '_', col_str)

            # Trim whitespace
            safe_col = safe_col.strip()

            # Limit length
            if len(safe_col) > self.MAX_COLUMN_NAME_LENGTH:
                safe_col = safe_col[:self.MAX_COLUMN_NAME_LENGTH] + '...'

            # Ensure not empty
            if not safe_col:
                safe_col = f'column_{len(safe_columns)}'

            # Ensure uniqueness
            if safe_col in safe_columns:
                safe_col = f'{safe_col}_{len(safe_columns)}'

            safe_columns.append(safe_col)

        df.columns = safe_columns
        return df

    def _sanitize_cell_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """HTML escape all string values"""

        for col in df.columns:
            if df[col].dtype == 'object':  # String columns
                df[col] = df[col].apply(self._escape_cell_value)

        return df

    def _escape_cell_value(self, value: Any) -> str:
        """Escape individual cell value"""

        if pd.isna(value) or value is None:
            return ''

        # Convert to string
        str_value = str(value)

        # Truncate very long values
        if len(str_value) > self.MAX_CELL_LENGTH:
            str_value = str_value[:self.MAX_CELL_LENGTH] + '...'

        # HTML escape
        escaped = html.escape(str_value)

        # Additional XSS prevention: escape javascript: and data: URIs
        escaped = re.sub(
            r'(javascript|data):',
            r'\1&#58;',
            escaped,
            flags=re.IGNORECASE
        )

        return escaped

    def _sanitize_numeric_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle NaN, Inf, and other special numeric values"""

        # Replace NaN with empty string or 'N/A'
        df = df.fillna('N/A')

        # Replace infinity
        df = df.replace([float('inf')], '∞')
        df = df.replace([float('-inf')], '-∞')

        return df

    def sanitize_sql_query(
        self,
        sql: str,
        hide_sensitive: bool = True
    ) -> str:
        """
        Sanitize SQL query for safe display

        Args:
            sql: SQL query
            hide_sensitive: Hide sensitive patterns (passwords, keys)

        Returns:
            Sanitized SQL string
        """

        if not sql:
            return ''

        sanitized = sql.strip()

        if hide_sensitive:
            # Remove sensitive patterns
            sensitive_patterns = [
                (r'(password|passwd|pwd)\s*=\s*[\'"][^\'"]+[\'"]', r'\1=***'),
                (r'(secret|token|key)\s*=\s*[\'"][^\'"]+[\'"]', r'\1=***'),
                (r'(api[_-]?key)\s*=\s*[\'"][^\'"]+[\'"]', r'\1=***'),
            ]

            for pattern, replacement in sensitive_patterns:
                sanitized = re.sub(
                    pattern,
                    replacement,
                    sanitized,
                    flags=re.IGNORECASE
                )

        # Limit length
        max_sql_length = 5000
        if len(sanitized) > max_sql_length:
            sanitized = sanitized[:max_sql_length] + '\n... (truncated)'

        return sanitized

    def sanitize_error_message(
        self,
        error: Exception,
        user_facing: bool = True,
        include_type: bool = False
    ) -> str:
        """
        Sanitize error message to prevent information leakage

        Args:
            error: Exception object
            user_facing: If True, return generic message
            include_type: Include error type in message

        Returns:
            Safe error message
        """

        error_str = str(error)
        error_type = type(error).__name__

        if user_facing:
            # Generic messages by error type
            safe_messages = {
                'FileNotFoundError': 'File not found. Please upload again.',
                'ValueError': 'Invalid input. Please check your data.',
                'TypeError': 'Data type error. Please verify file format.',
                'MemoryError': 'File too large to process. Maximum size: 50MB.',
                'PermissionError': 'Permission denied. Contact support.',
                'TimeoutError': 'Request timed out. Please try again.',
                'ConnectionError': 'Service temporarily unavailable.',
            }

            # Return generic message
            message = safe_messages.get(
                error_type,
                'An error occurred. Please try again or contact support.'
            )

            if include_type:
                message = f"{error_type}: {message}"

            return message

        else:
            # Admin/debug mode: show details but sanitize
            sanitized = error_str

            # Remove file paths
            sanitized = re.sub(
                r'(/[a-zA-Z0-9_\-./]+)',
                '[PATH]',
                sanitized
            )

            # Remove IP addresses
            sanitized = re.sub(
                r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b',
                '[IP]',
                sanitized
            )

            # Remove API keys/tokens (partial)
            sanitized = re.sub(
                r'(gsk_|sk-)[a-zA-Z0-9]{20,}',
                r'\1***',
                sanitized
            )

            # Limit length
            if len(sanitized) > 500:
                sanitized = sanitized[:500] + '... (truncated)'

            return f"{error_type}: {sanitized}"


class SecureErrorResponse:
    """Secure error response builder"""

    @staticmethod
    def build_response(
        error: Exception,
        user_role: str = 'user',
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build secure error response

        Args:
            error: Exception object
            user_role: User role (admin, user, anonymous)
            context: Additional context (logged but not shown)

        Returns:
            Error response dict
        """

        sanitizer = OutputSanitizer()

        # Determine if user should see details
        show_details = user_role == 'admin'

        # Get sanitized message
        message = sanitizer.sanitize_error_message(
            error,
            user_facing=not show_details,
            include_type=show_details
        )

        # Build response
        response = {
            'success': False,
            'error': message,
            'error_type': type(error).__name__ if show_details else None,
        }

        # Log full error (server-side only)
        log_context = context or {}
        logger.error(
            f"Error: {type(error).__name__}: {error}",
            extra={'context': log_context},
            exc_info=show_details
        )

        return response


# Convenience functions
def sanitize_dataframe(
    df: pd.DataFrame,
    max_rows: int = 1000
) -> Tuple[pd.DataFrame, Optional[str]]:
    """Sanitize DataFrame (convenience wrapper)"""
    sanitizer = OutputSanitizer(max_rows=max_rows)
    return sanitizer.sanitize_dataframe(df)


def sanitize_sql(sql: str, hide_sensitive: bool = True) -> str:
    """Sanitize SQL query (convenience wrapper)"""
    sanitizer = OutputSanitizer()
    return sanitizer.sanitize_sql_query(sql, hide_sensitive)


def safe_error_message(
    error: Exception,
    user_role: str = 'user'
) -> str:
    """Get safe error message (convenience wrapper)"""
    sanitizer = OutputSanitizer()
    return sanitizer.sanitize_error_message(
        error,
        user_facing=(user_role != 'admin')
    )


# Example usage
if __name__ == '__main__':
    import pandas as pd

    # Test DataFrame sanitization
    print("🔒 Output Sanitization Test\n")
    print("=" * 60)

    # Create test DataFrame with malicious content
    test_data = {
        'name': [
            'John Doe',
            '<script>alert("XSS")</script>',
            'Jane; DROP TABLE users;--',
        ],
        'email': [
            'john@example.com',
            'javascript:alert(1)',
            'normal@email.com',
        ],
        'notes': [
            'Normal text',
            '<img src=x onerror=alert(1)>',
            'A' * 2000,  # Very long text
        ],
    }

    df = pd.DataFrame(test_data)

    print("Original DataFrame:")
    print(df.head())
    print()

    # Sanitize
    sanitizer = OutputSanitizer(max_rows=10, max_cell_length=100)
    df_safe, warning = sanitizer.sanitize_dataframe(df)

    print("Sanitized DataFrame:")
    print(df_safe.head())
    print()

    if warning:
        print(f"Warning: {warning}")
    print()

    # Test SQL sanitization
    print("SQL Sanitization:")
    sql = "SELECT * FROM users WHERE password='secret123' AND api_key='gsk_abc123xyz'"
    sql_safe = sanitizer.sanitize_sql_query(sql)
    print(f"Original: {sql}")
    print(f"Sanitized: {sql_safe}")
    print()

    # Test error sanitization
    print("Error Sanitization:")
    errors = [
        FileNotFoundError("/etc/passwd not found"),
        ValueError("Invalid API key: gsk_secret123"),
        MemoryError("Out of memory at 192.168.1.100"),
    ]

    for error in errors:
        # User-facing
        user_msg = sanitizer.sanitize_error_message(error, user_facing=True)
        print(f"User: {user_msg}")

        # Admin-facing
        admin_msg = sanitizer.sanitize_error_message(error, user_facing=False)
        print(f"Admin: {admin_msg}")
        print()
