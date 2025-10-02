import { streamObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { DocumentHandler } from '@/lib/artifacts/server';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Sheet document handler for server-side generation
 */
export const sheetDocumentHandler: DocumentHandler<'sheet'> = {
  kind: 'sheet',

  onCreateDocument: async ({ id, title, dataStream }) => {

    const { fullStream } = streamObject({
      model: groq('llama-3.3-70b-versatile'),
      system: `Eres un asistente agrícola experto. Crea hojas de cálculo en formato CSV para datos agrícolas.

Reglas:
- Primera fila siempre son los encabezados
- Usa nombres de columnas descriptivos en español
- Incluye datos de ejemplo relevantes
- Formato CSV válido (comas, sin errores)
- Datos realistas para agricultura`,
      prompt: title,
      schema: z.object({
        csv: z
          .string()
          .describe(
            'Contenido CSV con encabezados y datos de ejemplo para agricultura'
          ),
      }),
    });

    let csvContent = '';
    for await (const delta of fullStream) {
      if (delta.type === 'object' && delta.object.csv) {
        csvContent = delta.object.csv;
        dataStream.write({
          type: 'data-sheetDelta',
          data: csvContent,
        });
      }
    }
  },

  onUpdateDocument: async ({ id, description, currentContent, dataStream }) => {
    dataStream.write({ type: 'artifact-clear' });

    const { fullStream } = streamObject({
      model: groq('llama-3.3-70b-versatile'),
      system: `Eres un asistente agrícola experto. Actualiza hojas de cálculo en formato CSV.

Reglas:
- Mantén la estructura de columnas existente cuando sea apropiado
- Aplica los cambios solicitados
- Formato CSV válido
- Datos realistas para agricultura`,
      prompt: `Contenido actual:\n${currentContent}\n\nCambio solicitado: ${description}`,
      schema: z.object({
        csv: z.string().describe('Contenido CSV actualizado'),
      }),
    });

    let csvContent = '';
    for await (const delta of fullStream) {
      if (delta.type === 'object' && delta.object.csv) {
        csvContent = delta.object.csv;
        dataStream.write({
          type: 'artifact-delta',
          data: csvContent,
        });
      }
    }

    dataStream.write({ type: 'artifact-finish' });
  },
};
