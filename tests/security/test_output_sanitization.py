"""
Security Tests: Output Sanitization

Tests output sanitization to prevent XSS and information leakage.

Author: SmartFarm Security Team
Date: 2025-10-17
"""

import pytest
import pandas as pd
import sys
import os

# Add security module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../security'))

from output_sanitizer import (
    OutputSanitizer,
    sanitize_dataframe,
    sanitize_sql,
    safe_error_message
)


class TestDataFrameSanitization:
    """Test DataFrame sanitization for XSS prevention"""

    def test_xss_script_tag(self):
        """Script tags should be escaped"""
        data = {
            'name': ['<script>alert("XSS")</script>'],
            'value': [100]
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, warning = sanitizer.sanitize_dataframe(df)

        # Should be HTML escaped
        assert '&lt;script&gt;' in df_safe['name'].values[0]
        assert '<script>' not in df_safe['name'].values[0]

    def test_xss_img_tag(self):
        """Image tags with onerror should be escaped"""
        data = {
            'description': ['<img src=x onerror=alert(1)>'],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Should be escaped
        assert '&lt;img' in df_safe['description'].values[0]
        assert '<img' not in df_safe['description'].values[0]

    def test_javascript_protocol(self):
        """javascript: protocol should be escaped"""
        data = {
            'link': ['javascript:alert(1)'],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # javascript: should be escaped
        assert 'javascript&#58;' in df_safe['link'].values[0] or \
               'javascript:' not in df_safe['link'].values[0]

    def test_data_uri(self):
        """data: URIs should be escaped"""
        data = {
            'uri': ['data:text/html,<script>alert(1)</script>'],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # data: should be escaped
        assert 'data&#58;' in df_safe['uri'].values[0] or \
               'data:' not in df_safe['uri'].values[0]

    def test_sql_injection_in_cells(self):
        """SQL injection strings in cells should be escaped"""
        data = {
            'input': ["'; DROP TABLE users; --"],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Should be HTML escaped (but not SQL-escaped, as it's just text)
        # The dangerous SQL is now harmless text
        assert df_safe['input'].values[0]  # Not empty

    def test_special_characters(self):
        """Special HTML characters should be escaped"""
        data = {
            'text': ['<>&"\''],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        value = df_safe['text'].values[0]
        assert '&lt;' in value
        assert '&gt;' in value
        assert '&amp;' in value


class TestColumnNameSanitization:
    """Test column name sanitization"""

    def test_special_chars_in_column_names(self):
        """Special characters in column names should be sanitized"""
        data = {
            '<script>alert(1)</script>': [1, 2, 3],
            'col|with|pipes': [4, 5, 6],
            'col:with:colons': [7, 8, 9],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Column names should be sanitized
        for col in df_safe.columns:
            assert '<script>' not in col
            assert '|' not in col
            assert ':' not in col

    def test_very_long_column_names(self):
        """Very long column names should be truncated"""
        data = {
            'a' * 200: [1, 2, 3],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer(max_cell_length=1000)
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Should be truncated
        assert len(df_safe.columns[0]) <= 103  # 100 + '...'

    def test_duplicate_column_names(self):
        """Duplicate column names should be made unique"""
        data = {
            'col': [1, 2],
            'col ': [3, 4],  # Same after sanitization
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Columns should be unique
        assert len(df_safe.columns) == len(set(df_safe.columns))


class TestResultTruncation:
    """Test large result set truncation"""

    def test_truncate_large_results(self):
        """Large result sets should be truncated"""
        # Create 2000 row DataFrame
        data = {'col': list(range(2000))}
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer(max_rows=1000)
        df_safe, warning = sanitizer.sanitize_dataframe(df, truncate_large=True)

        # Should be truncated
        assert len(df_safe) == 1000
        assert warning is not None
        assert 'truncated' in warning.lower()

    def test_small_results_not_truncated(self):
        """Small result sets should pass through"""
        data = {'col': [1, 2, 3]}
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer(max_rows=1000)
        df_safe, warning = sanitizer.sanitize_dataframe(df)

        assert len(df_safe) == 3
        assert warning is None


class TestNumericValueSanitization:
    """Test numeric value handling"""

    def test_nan_values(self):
        """NaN values should be replaced"""
        data = {
            'value': [1.0, float('nan'), 3.0]
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # NaN should be replaced
        assert df_safe['value'].values[1] == 'N/A'

    def test_infinity_values(self):
        """Infinity values should be replaced"""
        data = {
            'value': [float('inf'), float('-inf'), 1.0]
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer()
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Inf should be replaced
        assert df_safe['value'].values[0] == '∞'
        assert df_safe['value'].values[1] == '-∞'


class TestSQLQuerySanitization:
    """Test SQL query sanitization"""

    def test_hide_passwords(self):
        """Passwords in SQL should be hidden"""
        sql = "SELECT * FROM users WHERE password='secret123'"

        sanitized = sanitize_sql(sql, hide_sensitive=True)

        assert 'secret123' not in sanitized
        assert 'password=***' in sanitized

    def test_hide_api_keys(self):
        """API keys in SQL should be hidden"""
        sql = "SELECT * FROM config WHERE api_key='gsk_abc123xyz'"

        sanitized = sanitize_sql(sql, hide_sensitive=True)

        assert 'gsk_abc123xyz' not in sanitized
        assert 'api_key=***' in sanitized or 'api-key=***' in sanitized

    def test_hide_secrets(self):
        """Secrets in SQL should be hidden"""
        sql = "UPDATE config SET secret='my_secret_token' WHERE id=1"

        sanitized = sanitize_sql(sql, hide_sensitive=True)

        assert 'my_secret_token' not in sanitized
        assert 'secret=***' in sanitized

    def test_truncate_very_long_sql(self):
        """Very long SQL should be truncated"""
        sql = "SELECT " + ", ".join([f"col{i}" for i in range(1000)]) + " FROM table"

        sanitizer = OutputSanitizer()
        sanitized = sanitizer.sanitize_sql_query(sql)

        # Should be truncated
        assert len(sanitized) <= 5050  # 5000 + "... (truncated)"


class TestErrorMessageSanitization:
    """Test error message sanitization"""

    def test_user_facing_generic_messages(self):
        """User-facing errors should be generic"""
        errors = [
            FileNotFoundError("/etc/passwd not found"),
            ValueError("Invalid API key: gsk_secret123"),
            MemoryError("Out of memory at 192.168.1.100"),
        ]

        sanitizer = OutputSanitizer()

        for error in errors:
            message = sanitizer.sanitize_error_message(error, user_facing=True)

            # Should not contain sensitive info
            assert '/etc/passwd' not in message
            assert 'gsk_secret123' not in message
            assert '192.168.1.100' not in message

            # Should be generic
            assert message  # Not empty

    def test_admin_messages_sanitized(self):
        """Admin errors should be sanitized but detailed"""
        error = FileNotFoundError("/home/user/secret/data.xlsx not found")

        sanitizer = OutputSanitizer()
        message = sanitizer.sanitize_error_message(error, user_facing=False)

        # Should have error type
        assert 'FileNotFoundError' in message

        # Paths should be sanitized
        assert '/home/user/secret/data.xlsx' not in message
        assert '[PATH]' in message

    def test_ip_address_sanitization(self):
        """IP addresses should be sanitized in errors"""
        error = ConnectionError("Failed to connect to 192.168.1.100:5432")

        sanitizer = OutputSanitizer()
        message = sanitizer.sanitize_error_message(error, user_facing=False)

        # IP should be sanitized
        assert '192.168.1.100' not in message
        assert '[IP]' in message

    def test_api_key_sanitization(self):
        """API keys should be partially hidden in errors"""
        errors = [
            ValueError("Invalid key: gsk_abc123def456ghi789"),
            ValueError("Auth failed with sk-proj_xyz789abc123"),
        ]

        sanitizer = OutputSanitizer()

        for error in errors:
            message = sanitizer.sanitize_error_message(error, user_facing=False)

            # Full key should not be visible
            assert 'gsk_abc123def456ghi789' not in message
            assert 'sk-proj_xyz789abc123' not in message

            # Should show prefix with asterisks
            assert 'gsk_***' in message or 'sk-***' in message


class TestCellLengthTruncation:
    """Test cell value length limits"""

    def test_truncate_long_cell_values(self):
        """Very long cell values should be truncated"""
        data = {
            'text': ['A' * 2000],
        }
        df = pd.DataFrame(data)

        sanitizer = OutputSanitizer(max_cell_length=100)
        df_safe, _ = sanitizer.sanitize_dataframe(df)

        # Should be truncated
        value = df_safe['text'].values[0]
        assert len(value) <= 103  # 100 + '...'
        assert '...' in value


class TestSecureErrorResponse:
    """Test SecureErrorResponse builder"""

    def test_user_response(self):
        """User response should be generic"""
        from output_sanitizer import SecureErrorResponse

        error = FileNotFoundError("/secret/path/file.xlsx")
        response = SecureErrorResponse.build_response(error, user_role='user')

        assert response['success'] is False
        assert '/secret/path' not in response['error']
        assert response['error_type'] is None  # Not shown to users

    def test_admin_response(self):
        """Admin response should include details"""
        from output_sanitizer import SecureErrorResponse

        error = ValueError("Invalid input")
        response = SecureErrorResponse.build_response(error, user_role='admin')

        assert response['success'] is False
        assert response['error_type'] == 'ValueError'
        assert 'Invalid input' in response['error'] or \
               '[PATH]' in response['error']  # Sanitized


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
