import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { DocumentHandler } from '@/lib/artifacts/server';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use free Llama 4 Maverick model
const MODEL = 'meta-llama/llama-4-maverick:free';

/**
 * Sheet document handler for server-side generation
 */
export const sheetDocumentHandler: DocumentHandler<'sheet'> = {
  kind: 'sheet',

  onCreateDocument: async ({ id, title, dataStream }) => {

    const { textStream } = streamText({
      model: openrouter(MODEL),
      system: `Eres un asistente agrícola experto. Crea hojas de cálculo en formato CSV para datos agrícolas.

Reglas:
- Primera fila siempre son los encabezados
- Usa nombres de columnas descriptivos en español
- Incluye datos de ejemplo relevantes
- Formato CSV válido (comas, sin errores)
- Datos realistas para agricultura
- IMPORTANTE: Responde SOLO con el contenido CSV, sin explicaciones ni formato markdown`,
      prompt: title,
    });

    let csvContent = '';
    for await (const delta of textStream) {
      csvContent += delta;
      dataStream.writeData({
        type: 'sheetDelta',
        content: csvContent,
      });
    }
  },

  onUpdateDocument: async ({ id, description, currentContent, dataStream }) => {
    dataStream.writeData({ type: 'artifact-clear', content: null });

    const { textStream } = streamText({
      model: openrouter(MODEL),
      system: `Eres un asistente agrícola experto. Actualiza hojas de cálculo en formato CSV.

Reglas:
- Mantén la estructura de columnas existente cuando sea apropiado
- Aplica los cambios solicitados
- Formato CSV válido
- Datos realistas para agricultura
- IMPORTANTE: Responde SOLO con el contenido CSV, sin explicaciones ni formato markdown`,
      prompt: `Contenido actual:\n${currentContent}\n\nCambio solicitado: ${description}`,
    });

    let csvContent = '';
    for await (const delta of textStream) {
      csvContent += delta;
      dataStream.writeData({
        type: 'sheetDelta',
        content: csvContent,
      });
    }

    dataStream.writeData({ type: 'artifact-finish', content: null });
  },
};
