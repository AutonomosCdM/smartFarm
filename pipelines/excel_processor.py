"""
title: Excel Processor
author: SmartFarm Team
version: 1.0.0
description: Procesa archivos Excel/CSV y extrae datos para análisis agrícola
required_open_webui_version: 0.5.0
requirements: pandas, openpyxl
"""

import pandas as pd
import json
from typing import Optional, List
from pydantic import BaseModel, Field


class Pipeline:
    class Valves(BaseModel):
        pipelines: List[str] = Field(
            default=["*"],
            description="Pipelines donde aplicar este filtro"
        )
        max_rows_preview: int = Field(
            default=5,
            description="Filas máximas para vista previa"
        )

    def __init__(self):
        self.name = "Excel Processor"
        self.valves = self.Valves()

    async def inlet(self, body: dict, user: Optional[dict] = None) -> dict:
        """Procesa archivos Excel/CSV antes de enviar al LLM"""

        files = body.get("files", [])
        if not files:
            return body

        print(f"📁 Excel Processor: {len(files)} archivo(s) detectado(s)")

        processed_data = []

        for file_obj in files:
            try:
                # Extraer info del archivo
                filename = file_obj.get("filename", "unknown")

                # Intentar obtener path del archivo
                file_path = None
                if "file" in file_obj and isinstance(file_obj["file"], dict):
                    file_path = file_obj["file"].get("path") or file_obj["file"].get("filename")
                else:
                    file_path = file_obj.get("path")

                if not file_path:
                    print(f"⚠️ No se pudo obtener path de: {filename}")
                    continue

                # Verificar si es Excel/CSV
                if not filename.lower().endswith(('.xlsx', '.xls', '.csv')):
                    print(f"⏭️ Omitiendo archivo no-Excel: {filename}")
                    continue

                print(f"📊 Procesando: {filename}")

                # Leer archivo
                if filename.lower().endswith('.csv'):
                    df = pd.read_csv(file_path)
                else:
                    df = pd.read_excel(file_path)

                if df.empty:
                    print(f"⚠️ Archivo vacío: {filename}")
                    continue

                # Analizar datos
                analysis = {
                    "archivo": filename,
                    "filas": len(df),
                    "columnas": list(df.columns),
                    "tipos": {col: str(dtype) for col, dtype in df.dtypes.items()},
                    "nulos": {col: int(count) for col, count in df.isnull().sum().items() if count > 0},
                    "vista_previa": df.head(self.valves.max_rows_preview).to_dict('records')
                }

                # Estadísticas para columnas numéricas
                numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
                if numeric_cols:
                    stats = df[numeric_cols].describe().to_dict()
                    analysis["estadisticas"] = stats

                processed_data.append(analysis)
                print(f"✅ Procesado: {filename} ({len(df)} filas × {len(df.columns)} columnas)")

            except Exception as e:
                print(f"❌ Error procesando {filename}: {str(e)}")
                continue

        # Inyectar contexto si hay datos procesados
        if processed_data:
            context = self._build_context(processed_data)

            if "messages" not in body:
                body["messages"] = []

            # Insertar como primer mensaje del sistema
            body["messages"].insert(0, {
                "role": "system",
                "content": context
            })

            print(f"💉 Contexto inyectado: {len(processed_data)} archivo(s)")

        return body

    def _build_context(self, data_list: list) -> str:
        """Construye mensaje de contexto para el LLM"""

        msg = "## 📊 DATOS EXCEL PROCESADOS\n\n"
        msg += f"Se han analizado **{len(data_list)}** archivo(s):\n\n"

        for data in data_list:
            msg += f"### 📋 {data['archivo']}\n\n"
            msg += f"**Dimensiones:** {data['filas']:,} filas × {len(data['columnas'])} columnas\n\n"
            msg += f"**Columnas:** {', '.join(data['columnas'])}\n\n"

            # Advertir sobre nulos
            if data.get('nulos'):
                msg += "⚠️ **Valores nulos detectados:**\n"
                for col, count in data['nulos'].items():
                    msg += f"- {col}: {count} valores nulos\n"
                msg += "\n"

            # Vista previa
            msg += "**Vista previa (primeras filas):**\n```json\n"
            msg += json.dumps(data['vista_previa'], indent=2, ensure_ascii=False)
            msg += "\n```\n\n"

            # Estadísticas
            if data.get('estadisticas'):
                msg += "**Estadísticas (columnas numéricas):**\n```json\n"
                msg += json.dumps(data['estadisticas'], indent=2, ensure_ascii=False)
                msg += "\n```\n\n"

            msg += "---\n\n"

        # Instrucciones para el LLM
        msg += "### 🤖 INSTRUCCIONES\n\n"
        msg += "**Contexto:** SmartFarm - Agricultura Chilena\n\n"
        msg += "**Tu rol:** Analizar estos datos y proporcionar insights accionables para agricultores.\n\n"
        msg += "**Puedes:**\n"
        msg += "- Responder preguntas sobre los datos\n"
        msg += "- Generar análisis estadísticos\n"
        msg += "- Crear visualizaciones con artifacts (usar Plotly o Chart.js)\n"
        msg += "- Sugerir acciones basadas en los datos\n\n"
        msg += "**Formato de respuesta:** Claro, en español, con insights prácticos.\n"

        return msg

    async def outlet(self, body: dict, user: Optional[dict] = None) -> dict:
        """Procesa respuesta después del LLM (sin modificaciones por ahora)"""
        return body
