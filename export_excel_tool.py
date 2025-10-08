"""
title: Export to Excel for SmartFarm
author: SmartFarm Team
description: Export markdown tables from chat to Excel files (.xlsx)
required_open_webui_version: 0.5.0
requirements: pandas, openpyxl
version: 1.0.0
licence: MIT
"""

import pandas as pd
import re
import io
import base64
from typing import Optional
from pydantic import BaseModel, Field


class Tools:
    def __init__(self):
        self.citation = False

    async def export_table_to_excel(
        self,
        markdown_table: str,
        filename: str = "export",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Export a markdown table to an Excel file.

        :param markdown_table: Markdown formatted table
        :param filename: Name for the Excel file (without extension)
        :return: Download link or status message
        """

        try:
            # Emit status
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": "Converting table to Excel...", "done": False},
                    }
                )

            # Parse markdown table
            lines = [line.strip() for line in markdown_table.strip().split('\n') if line.strip()]

            if len(lines) < 2:
                return "Error: Invalid table format. Need at least header and separator rows."

            # Extract header
            header = [cell.strip() for cell in lines[0].split('|') if cell.strip()]

            # Skip separator line (line with ---)
            data_lines = [line for line in lines[2:] if not re.match(r'^\|?\s*[-:]+\s*\|', line)]

            # Extract data rows
            data = []
            for line in data_lines:
                cells = [cell.strip() for cell in line.split('|') if cell.strip()]
                if cells and len(cells) == len(header):
                    data.append(cells)

            if not data:
                return "Error: No data rows found in table."

            # Create DataFrame
            df = pd.DataFrame(data, columns=header)

            # Convert numeric columns
            for col in df.columns:
                try:
                    # Try to convert to numeric
                    df[col] = pd.to_numeric(df[col].str.replace(',', ''), errors='ignore')
                except:
                    pass

            # Create Excel file in memory
            excel_buffer = io.BytesIO()
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Data')

                # Auto-adjust column widths
                worksheet = writer.sheets['Data']
                for idx, col in enumerate(df.columns, 1):
                    max_length = max(
                        df[col].astype(str).apply(len).max(),
                        len(col)
                    )
                    worksheet.column_dimensions[chr(64 + idx)].width = min(max_length + 2, 50)

            excel_buffer.seek(0)
            excel_data = excel_buffer.read()

            # Encode to base64 for download
            b64_data = base64.b64encode(excel_data).decode()

            # Emit done
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": "Excel file ready!", "done": True},
                    }
                )

            # Return download link (HTML)
            download_html = f"""
✅ **Excel file generated successfully!**

📊 **File**: {filename}.xlsx
📈 **Rows**: {len(df)}
📋 **Columns**: {len(df.columns)}

<a href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{b64_data}" download="{filename}.xlsx">
    <button style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-size: 14px;">
        ⬇️ Download {filename}.xlsx
    </button>
</a>

**Columns**: {', '.join(df.columns.tolist())}
"""

            return download_html

        except Exception as e:
            return f"Error exporting to Excel: {str(e)}"

    async def create_excel_from_data(
        self,
        data_dict: dict,
        filename: str = "export",
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Create an Excel file from a Python dictionary.

        :param data_dict: Dictionary with column names as keys and lists as values
        :param filename: Name for the Excel file (without extension)
        :return: Download link or status message
        """

        try:
            # Create DataFrame from dict
            df = pd.DataFrame(data_dict)

            # Create Excel file in memory
            excel_buffer = io.BytesIO()
            with pd.ExcelWriter(excel_buffer, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Data')

                # Auto-adjust column widths
                worksheet = writer.sheets['Data']
                for idx, col in enumerate(df.columns, 1):
                    max_length = max(
                        df[col].astype(str).apply(len).max(),
                        len(col)
                    )
                    worksheet.column_dimensions[chr(64 + idx)].width = min(max_length + 2, 50)

            excel_buffer.seek(0)
            excel_data = excel_buffer.read()

            # Encode to base64
            b64_data = base64.b64encode(excel_data).decode()

            # Return download link
            download_html = f"""
✅ **Excel file created!**

<a href="data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{b64_data}" download="{filename}.xlsx">
    <button style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
        ⬇️ Download {filename}.xlsx
    </button>
</a>

Rows: {len(df)} | Columns: {len(df.columns)}
"""

            return download_html

        except Exception as e:
            return f"Error creating Excel: {str(e)}"
