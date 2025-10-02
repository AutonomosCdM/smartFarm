import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { DocumentHandler } from '@/lib/artifacts/server';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Use free Llama 4 Maverick model
const MODEL = 'meta-llama/llama-4-maverick:free';

/**
 * Chart document handler for server-side generation
 */
export const chartDocumentHandler: DocumentHandler<'chart'> = {
  kind: 'chart',

  onCreateDocument: async ({ id, title, dataStream }) => {

    const { textStream } = streamText({
      model: openrouter(MODEL),
      system: `Eres un asistente agrícola experto en visualización de datos. Crea configuraciones de gráficos Recharts en formato JSON.

Reglas:
- Devuelve un objeto JSON válido con la configuración del gráfico
- Usa datos agrícolas realistas (rendimiento, temperatura, humedad, riego, etc.)
- Elige el tipo de gráfico apropiado: "line" para tendencias, "bar" para comparaciones, "area" para datos acumulados
- El campo "data" debe ser un array de objetos con los datos
- El campo "xAxis" es el nombre de la clave para el eje X (generalmente fecha o categoría)
- El campo "yAxis" es un array de nombres de claves para las series del eje Y
- Incluye un título descriptivo
- IMPORTANTE: Responde SOLO con el JSON, sin explicaciones ni markdown

Ejemplo:
{
  "type": "line",
  "title": "Rendimiento Semanal de Tomates",
  "data": [
    {"fecha": "Lun", "rendimiento": 45, "objetivo": 50},
    {"fecha": "Mar", "rendimiento": 52, "objetivo": 50}
  ],
  "xAxis": "fecha",
  "yAxis": ["rendimiento", "objetivo"]
}`,
      prompt: title,
    });

    let chartContent = '';
    for await (const delta of textStream) {
      chartContent += delta;
      dataStream.writeData({
        type: 'chartDelta',
        content: chartContent,
      });
    }

  },

  onUpdateDocument: async ({ id, description, currentContent, dataStream }) => {
    dataStream.writeData({ type: 'artifact-clear', content: null });

    const { textStream } = streamText({
      model: openrouter(MODEL),
      system: `Eres un asistente agrícola experto en visualización de datos. Actualiza configuraciones de gráficos Recharts.

Reglas:
- Mantén la estructura del gráfico cuando sea apropiado
- Aplica los cambios solicitados
- Devuelve un objeto JSON válido
- IMPORTANTE: Responde SOLO con el JSON, sin explicaciones ni markdown`,
      prompt: `Configuración actual:\n${currentContent}\n\nCambio solicitado: ${description}`,
    });

    let chartContent = '';
    for await (const delta of textStream) {
      chartContent += delta;
      dataStream.writeData({
        type: 'chartDelta',
        content: chartContent,
      });
    }

    dataStream.writeData({ type: 'artifact-finish', content: null });
  },
};
