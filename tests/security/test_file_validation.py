"""
Security Tests: File Upload Validation

Tests for file upload security including:
- File size limits
- MIME type validation
- Filename sanitization
- Path traversal prevention
- Macro detection

Author: SmartFarm Security Team
Date: 2025-10-17
"""

import pytest
import os
import sys
from io import BytesIO

# Add security module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../security'))

from file_validator import FileValidator, FileValidationError, validate_upload


class TestFileSizeValidation:
    """Test file size limits"""

    def test_file_within_limit(self):
        """Valid file size should pass"""
        validator = FileValidator(max_size=50 * 1024 * 1024)  # 50MB

        # 10MB file
        file_data = b'x' * (10 * 1024 * 1024)
        filename = 'test.xlsx'

        result = validator.validate_file(file_data, filename)
        assert result['safe_filename'] == 'test.xlsx'
        assert result['metadata']['size_mb'] == 10.0

    def test_file_exceeds_limit(self):
        """File exceeding limit should fail"""
        validator = FileValidator(max_size=10 * 1024 * 1024)  # 10MB

        # 20MB file
        file_data = b'x' * (20 * 1024 * 1024)
        filename = 'huge.xlsx'

        with pytest.raises(FileValidationError) as exc_info:
            validator.validate_file(file_data, filename)

        assert "too large" in str(exc_info.value).lower()

    def test_empty_file(self):
        """Empty file should fail"""
        validator = FileValidator()
        file_data = b''
        filename = 'empty.xlsx'

        with pytest.raises(FileValidationError) as exc_info:
            validator.validate_file(file_data, filename)

        assert "empty" in str(exc_info.value).lower()


class TestMimeTypeValidation:
    """Test MIME type validation"""

    def test_valid_xlsx_file(self):
        """Valid XLSX file should pass"""
        # XLSX magic bytes: PK\x03\x04 (ZIP signature)
        xlsx_header = b'PK\x03\x04' + b'\x00' * 100
        file_data = xlsx_header + b'x' * 1000

        validator = FileValidator()
        result = validator.validate_file(file_data, 'test.xlsx')

        # Note: Actual MIME detection may vary, adjust assertion
        assert result['safe_filename'] == 'test.xlsx'

    def test_valid_csv_file(self):
        """Valid CSV file should pass"""
        csv_data = b'col1,col2,col3\n1,2,3\n4,5,6'

        validator = FileValidator()
        result = validator.validate_file(csv_data, 'test.csv')

        assert result['safe_filename'] == 'test.csv'

    def test_invalid_mime_type_exe(self):
        """Executable file should fail"""
        # MZ header (Windows EXE)
        exe_header = b'MZ\x90\x00' + b'\x00' * 100

        validator = FileValidator()

        with pytest.raises(FileValidationError) as exc_info:
            validator.validate_file(exe_header, 'malicious.xlsx')

        assert "invalid file type" in str(exc_info.value).lower()

    def test_file_extension_mismatch(self):
        """File with wrong extension should fail"""
        # PNG magic bytes but .xlsx extension
        png_header = b'\x89PNG\r\n\x1a\n' + b'\x00' * 100

        validator = FileValidator()

        with pytest.raises(FileValidationError) as exc_info:
            validator.validate_file(png_header, 'image.xlsx')

        # Should fail on either MIME or extension check


class TestFilenameSanitization:
    """Test filename sanitization"""

    def test_clean_filename(self):
        """Clean filename should pass unchanged"""
        validator = FileValidator()
        file_data = b'test' * 100
        filename = 'my_data_2024.xlsx'

        result = validator.validate_file(file_data, filename)
        assert result['safe_filename'] == 'my_data_2024.xlsx'

    def test_path_traversal_attempt(self):
        """Path traversal should be blocked"""
        validator = FileValidator()
        file_data = b'test' * 100

        malicious_filenames = [
            '../../etc/passwd.xlsx',
            '../../../root/.ssh/id_rsa.xlsx',
            '..\\..\\windows\\system32\\config\\sam.xlsx',
        ]

        for filename in malicious_filenames:
            with pytest.raises(FileValidationError) as exc_info:
                validator.validate_file(file_data, filename)

            assert "forbidden" in str(exc_info.value).lower() or \
                   "invalid" in str(exc_info.value).lower()

    def test_special_characters(self):
        """Special characters should be sanitized or rejected"""
        validator = FileValidator()
        file_data = b'test' * 100

        # These should be sanitized or rejected
        problematic_filenames = [
            'file<script>.xlsx',
            'data|pipe.xlsx',
            'file:colon.xlsx',
            'file"quote.xlsx',
        ]

        for filename in problematic_filenames:
            try:
                result = validator.validate_file(file_data, filename)
                # If it passes, safe_filename should be sanitized
                assert '<script>' not in result['safe_filename']
                assert '|' not in result['safe_filename']
            except FileValidationError:
                # Or it should be rejected
                pass

    def test_unicode_filename(self):
        """Unicode filename should be handled safely"""
        validator = FileValidator()
        file_data = b'test' * 100
        filename = 'données_été_2024.xlsx'

        # Should either sanitize or accept
        result = validator.validate_file(file_data, filename)
        # Werkzeug secure_filename converts to ASCII
        assert result['safe_filename']  # Not empty

    def test_very_long_filename(self):
        """Very long filename should be truncated"""
        validator = FileValidator()
        file_data = b'test' * 100
        filename = 'a' * 300 + '.xlsx'

        result = validator.validate_file(file_data, filename)
        # Should be truncated to 255 chars
        assert len(result['safe_filename']) <= 255


class TestMacroDetection:
    """Test macro detection in Excel files"""

    def test_xlsx_without_macros(self):
        """XLSX without macros should pass"""
        # Simple XLSX structure (ZIP with no VBA)
        import zipfile
        from io import BytesIO

        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zf:
            zf.writestr('[Content_Types].xml', '<Types/>')
            zf.writestr('xl/workbook.xml', '<workbook/>')

        file_data = buffer.getvalue()
        validator = FileValidator()

        result = validator.validate_file(file_data, 'test.xlsx')
        assert result['safe_filename'] == 'test.xlsx'

    def test_xlsm_with_macros(self):
        """XLSM with macros should be rejected"""
        # XLSX with VBA project
        import zipfile
        from io import BytesIO

        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zf:
            zf.writestr('[Content_Types].xml', '<Types/>')
            zf.writestr('xl/workbook.xml', '<workbook/>')
            zf.writestr('xl/vbaProject.bin', b'VBA_MACRO_CODE')  # Macro file

        file_data = buffer.getvalue()
        validator = FileValidator()

        with pytest.raises(FileValidationError) as exc_info:
            validator.validate_file(file_data, 'macro.xlsx')

        assert "macro" in str(exc_info.value).lower()


class TestIntegration:
    """Integration tests with real-world scenarios"""

    def test_legitimate_excel_upload(self):
        """Real Excel file should pass all checks"""
        # Create minimal valid XLSX
        import zipfile
        from io import BytesIO

        buffer = BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zf:
            zf.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types/>')
            zf.writestr('xl/workbook.xml', '<?xml version="1.0"?><workbook/>')
            zf.writestr('xl/worksheets/sheet1.xml', '<worksheet/>')

        file_data = buffer.getvalue()
        filename = 'sales_data_2024.xlsx'

        result = validate_upload(file_data, filename)

        assert result['safe_filename'] == 'sales_data_2024.xlsx'
        assert result['metadata']['extension'] == '.xlsx'
        assert result['metadata']['size_mb'] < 1

    def test_csv_upload(self):
        """CSV file should pass"""
        csv_data = b'Name,Age,City\nJohn,30,NYC\nJane,25,LA'
        filename = 'users.csv'

        result = validate_upload(csv_data, filename)

        assert result['safe_filename'] == 'users.csv'
        assert result['metadata']['extension'] == '.csv'

    def test_multiple_security_issues(self):
        """File with multiple issues should fail"""
        # Large file + path traversal + wrong extension
        file_data = b'x' * (100 * 1024 * 1024)  # 100MB
        filename = '../../etc/passwd.exe'

        validator = FileValidator(max_size=50 * 1024 * 1024)

        with pytest.raises(FileValidationError):
            validator.validate_file(file_data, filename)


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
