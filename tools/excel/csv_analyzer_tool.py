"""
title: CSV/Excel Analyzer for SmartFarm
author: SmartFarm Team
description: Analyze CSV and Excel files using pandas and natural language queries with Groq API
required_open_webui_version: 0.5.0
requirements: pandas, openpyxl, requests
version: 1.0.0
licence: MIT
"""

import pandas as pd
import json
import os
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import requests


class Tools:
    def __init__(self):
        self.valves = self.Valves()
        self.citation = False
        self.uploaded_files = {}

    class Valves(BaseModel):
        GROQ_API_KEY: str = Field(
            default="",
            description="Groq API Key for data analysis queries"
        )
        GROQ_API_BASE: str = Field(
            default="https://api.groq.com/openai/v1",
            description="Groq API base URL"
        )
        GROQ_MODEL: str = Field(
            default="llama-3.3-70b-versatile",
            description="Groq model for analysis"
        )

    async def analyze_csv_file(
        self,
        file_path: str,
        query: str,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Analyze a CSV or Excel file using pandas and AI-powered queries.

        :param file_path: Path to the CSV or Excel file
        :param query: Natural language query about the data
        :return: Analysis results as a string
        """

        try:
            # Emit status
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": f"Loading file: {file_path}", "done": False},
                    }
                )

            # Read file based on extension
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return "Error: File must be CSV or Excel format (.csv, .xlsx, .xls)"

            # Get basic info about the dataset
            rows, cols = df.shape
            columns_info = list(df.columns)
            data_types = df.dtypes.to_dict()

            # Get sample data (first 5 rows)
            sample_data = df.head(5).to_dict('records')

            # Get basic statistics
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            stats = {}
            if numeric_cols:
                stats = df[numeric_cols].describe().to_dict()

            # Emit status
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": "Analyzing data with AI...", "done": False},
                    }
                )

            # Create context for the AI
            context = f"""
Dataset Information:
- Total rows: {rows}
- Total columns: {cols}
- Columns: {', '.join(columns_info)}
- Data types: {json.dumps({k: str(v) for k, v in data_types.items()}, indent=2)}

Sample Data (first 5 rows):
{json.dumps(sample_data, indent=2, default=str)}

Numeric Column Statistics:
{json.dumps(stats, indent=2, default=str) if stats else "No numeric columns"}

User Query: {query}

Please analyze this data and answer the user's query. Provide specific insights, numbers, and actionable recommendations when applicable.
"""

            # Call Groq API
            api_key = self.valves.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

            if not api_key:
                return "Error: GROQ_API_KEY not configured. Please set it in the tool settings."

            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.valves.GROQ_MODEL,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a data analyst expert. Analyze the provided dataset and answer user queries with specific insights, numbers, and recommendations."
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 2000
            }

            response = requests.post(
                f"{self.valves.GROQ_API_BASE}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code != 200:
                return f"Error calling Groq API: {response.status_code} - {response.text}"

            result = response.json()
            analysis = result['choices'][0]['message']['content']

            # Emit done
            if __event_emitter__:
                await __event_emitter__(
                    {
                        "type": "status",
                        "data": {"description": "Analysis complete!", "done": True},
                    }
                )

            return f"""
📊 **Dataset Overview**
- Rows: {rows}
- Columns: {cols}
- File: {os.path.basename(file_path)}

---

🤖 **AI Analysis**

{analysis}

---

💡 **Dataset Columns**: {', '.join(columns_info)}
"""

        except FileNotFoundError:
            return f"Error: File not found at {file_path}"
        except Exception as e:
            return f"Error analyzing file: {str(e)}"

    async def get_data_summary(
        self,
        file_path: str,
        __user__: Optional[dict] = None,
        __event_emitter__=None,
    ) -> str:
        """
        Get a quick statistical summary of a CSV or Excel file.

        :param file_path: Path to the CSV or Excel file
        :return: Statistical summary
        """

        try:
            # Read file
            if file_path.endswith('.csv'):
                df = pd.read_csv(file_path)
            elif file_path.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file_path)
            else:
                return "Error: File must be CSV or Excel format"

            # Generate summary
            summary = f"""
📊 **Data Summary for {os.path.basename(file_path)}**

**Shape**: {df.shape[0]} rows × {df.shape[1]} columns

**Columns**:
"""
            for col in df.columns:
                dtype = df[col].dtype
                null_count = df[col].isnull().sum()
                summary += f"\n- `{col}` ({dtype}) - {null_count} nulls"

            # Add statistics for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
            if numeric_cols:
                summary += "\n\n**Numeric Columns Statistics**:\n"
                stats_df = df[numeric_cols].describe()
                summary += "\n" + stats_df.to_string()

            return summary

        except Exception as e:
            return f"Error: {str(e)}"
