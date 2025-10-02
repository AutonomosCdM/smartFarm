'use client';

import { Artifact } from '@/components/create-artifact';
import { SpreadsheetEditor } from '@/components/sheet-editor';
import { Copy, Download, Sparkles, LineChart } from 'lucide-react';
import { parse, unparse } from 'papaparse';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

/**
 * Sheet artifact for spreadsheet editing
 */
export const sheetArtifact = new Artifact({
  kind: 'sheet',
  description: 'Working with agricultural data spreadsheets and tables',

  initialize: () => null,

  onStreamPart: ({ streamPart, setArtifact }) => {
    // Handle sheet-specific delta updates
    if (streamPart.type === 'artifact-delta') {
      const delta = streamPart.delta as any;
      setArtifact((draft) => ({
        ...draft,
        content: delta,
        isVisible: true,
        status: 'streaming',
      }));
    }
    // Note: artifact-kind, artifact-id, artifact-title, artifact-clear, artifact-finish
    // are handled by the DataStreamHandler, not here
  },

  content: ({ content, onSaveContent, status }) => (
    <SpreadsheetEditor
      content={content}
      saveContent={onSaveContent}
      status={status}
    />
  ),

  actions: [
    {
      icon: <Copy className="w-4 h-4" />,
      description: 'Copiar como CSV',
      onClick: ({ content }) => {
        // Clean and format CSV
        const parsed = parse(content);
        const cleaned = unparse(parsed.data);
        navigator.clipboard.writeText(cleaned);
        toast.success('Copiado al portapapeles');
      },
    },
    {
      icon: <Download className="w-4 h-4" />,
      description: 'Descargar como Excel',
      onClick: ({ content }) => {
        try {
          // Parse CSV
          const parsed = parse<string[]>(content);

          // Create worksheet
          const worksheet = XLSX.utils.aoa_to_sheet(parsed.data);

          // Create workbook
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

          // Download
          XLSX.writeFile(workbook, 'smartfarm-export.xlsx');
          toast.success('Excel descargado');
        } catch (error) {
          toast.error('Error al exportar Excel');
          console.error(error);
        }
      },
    },
  ],

  toolbar: [
    {
      icon: <Sparkles className="w-4 h-4" />,
      description: 'Limpiar y formatear datos',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          content: 'Limpia y formatea los datos de la tabla, eliminando duplicados y valores vacíos',
        });
      },
    },
    {
      icon: <LineChart className="w-4 h-4" />,
      description: 'Crear gráfico',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          content: 'Crea un gráfico de líneas con estos datos',
        });
      },
    },
  ],
});
