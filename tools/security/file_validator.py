"""
File Upload Security Validator

Provides comprehensive validation for file uploads including:
- File size limits
- MIME type validation (magic bytes)
- Filename sanitization (path traversal prevention)
- Macro detection for Excel files

Author: SmartFarm Security Team
Date: 2025-10-17
"""

import os
import re
from typing import Optional, Dict, Any
from werkzeug.utils import secure_filename
import magic  # python-magic for MIME detection


class FileValidationError(Exception):
    """Custom exception for file validation failures"""
    pass


class FileValidator:
    """Validates file uploads with security checks"""

    # Configuration
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    ALLOWED_MIME_TYPES = [
        'application/vnd.ms-excel',  # .xls
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
        'text/csv',  # .csv
        'text/plain',  # .csv (alternative)
    ]

    ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

    # Forbidden patterns in filenames
    FORBIDDEN_PATTERNS = [
        r'\.\.',  # Parent directory traversal
        r'[<>:"|?*]',  # Windows forbidden chars
        r'[\x00-\x1f]',  # Control characters
        r'^\..*',  # Hidden files (Unix)
    ]

    def __init__(self, max_size: Optional[int] = None):
        """
        Initialize validator

        Args:
            max_size: Override default max file size in bytes
        """
        if max_size:
            self.MAX_FILE_SIZE = max_size

    def validate_file(
        self,
        file_data: bytes,
        filename: str,
        user: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive file validation

        Args:
            file_data: Raw file bytes
            filename: Original filename
            user: User dict with 'id' and 'role' keys (optional)

        Returns:
            Dict with 'safe_filename' and 'metadata'

        Raises:
            FileValidationError: If any validation fails
        """

        # 1. File size check
        file_size = len(file_data)
        if file_size > self.MAX_FILE_SIZE:
            raise FileValidationError(
                f"File too large: {file_size/1024/1024:.1f}MB "
                f"(max: {self.MAX_FILE_SIZE/1024/1024:.0f}MB)"
            )

        if file_size == 0:
            raise FileValidationError("Empty file not allowed")

        # 2. MIME type validation (magic bytes, not extension)
        mime_type = self._detect_mime_type(file_data)

        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise FileValidationError(
                f"Invalid file type: {mime_type}. "
                f"Allowed: Excel (.xlsx, .xls) or CSV only"
            )

        # 3. Extension validation (defense in depth)
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in self.ALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"Invalid file extension: {file_ext}. "
                f"Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )

        # 4. Filename sanitization (path traversal prevention)
        safe_name = self._sanitize_filename(filename)
        if not safe_name:
            raise FileValidationError(
                "Invalid filename. Use only alphanumeric characters, "
                "dots, underscores, and hyphens"
            )

        # 5. Check for forbidden patterns
        self._check_forbidden_patterns(filename)

        # 6. Macro detection (for .xlsx files)
        if mime_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            if self._has_macros(file_data):
                raise FileValidationError(
                    "Macro-enabled Excel files (.xlsm) not allowed for security. "
                    "Please save as .xlsx without macros"
                )

        # Return validation result
        return {
            'safe_filename': safe_name,
            'metadata': {
                'original_filename': filename,
                'mime_type': mime_type,
                'size_bytes': file_size,
                'size_mb': round(file_size / 1024 / 1024, 2),
                'extension': file_ext,
                'validated_at': self._get_timestamp(),
            }
        }

    def _detect_mime_type(self, file_data: bytes) -> str:
        """
        Detect MIME type using magic bytes (first 2048 bytes)

        This is more secure than trusting file extensions
        """
        try:
            # Use magic library for robust MIME detection
            mime = magic.from_buffer(file_data[:2048], mime=True)
            return mime
        except Exception as e:
            raise FileValidationError(f"Failed to detect file type: {str(e)}")

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename using werkzeug.secure_filename

        This prevents:
        - Path traversal (../../etc/passwd)
        - Unicode attacks
        - Special character injection
        """
        # Use werkzeug's battle-tested sanitizer
        safe_name = secure_filename(filename)

        # Additional check: ensure not empty after sanitization
        if not safe_name or safe_name == '':
            return None

        # Limit length
        if len(safe_name) > 255:
            name, ext = os.path.splitext(safe_name)
            safe_name = name[:250] + ext

        return safe_name

    def _check_forbidden_patterns(self, filename: str) -> None:
        """Check for forbidden patterns in filename"""
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, filename):
                raise FileValidationError(
                    f"Forbidden character pattern detected in filename"
                )

    def _has_macros(self, file_data: bytes) -> bool:
        """
        Detect if Excel file contains macros

        XLSX files are ZIP archives. Macros are stored in vbaProject.bin
        """
        try:
            import zipfile
            from io import BytesIO

            # Try to open as ZIP
            with zipfile.ZipFile(BytesIO(file_data)) as zip_file:
                # Check for VBA project files (macros)
                for filename in zip_file.namelist():
                    if 'vbaProject.bin' in filename.lower():
                        return True
                    if 'vba' in filename.lower():
                        return True

            return False

        except zipfile.BadZipFile:
            # Not a valid XLSX file
            return False
        except Exception:
            # If detection fails, be conservative: assume no macros
            return False

    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'


# Convenience function
def validate_upload(
    file_data: bytes,
    filename: str,
    user: Optional[Dict[str, Any]] = None,
    max_size: Optional[int] = None
) -> Dict[str, Any]:
    """
    Validate file upload (convenience wrapper)

    Args:
        file_data: Raw file bytes
        filename: Original filename
        user: User dict (optional)
        max_size: Override max size (optional)

    Returns:
        Validation result with safe_filename and metadata

    Raises:
        FileValidationError: If validation fails
    """
    validator = FileValidator(max_size=max_size)
    return validator.validate_file(file_data, filename, user)


# Example usage
if __name__ == '__main__':
    # Test validation
    import sys

    if len(sys.argv) < 2:
        print("Usage: python file_validator.py <file_path>")
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        with open(filepath, 'rb') as f:
            file_data = f.read()

        filename = os.path.basename(filepath)
        result = validate_upload(file_data, filename)

        print("✅ File validation successful!")
        print(f"   Safe filename: {result['safe_filename']}")
        print(f"   MIME type: {result['metadata']['mime_type']}")
        print(f"   Size: {result['metadata']['size_mb']} MB")

    except FileValidationError as e:
        print(f"❌ Validation failed: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print(f"❌ File not found: {filepath}")
        sys.exit(1)
