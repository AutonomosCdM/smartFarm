import { streamObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import { DocumentHandler } from '@/lib/artifacts/server';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Chart document handler for server-side generation
 */
export const chartDocumentHandler: DocumentHandler<'chart'> = {
  kind: 'chart',

  onCreateDocument: async ({ id, title, dataStream }) => {
    dataStream.write({ type: 'artifact-id', data: id });
    dataStream.write({ type: 'artifact-title', data: title });
    dataStream.write({ type: 'artifact-kind', data: 'chart' });
    dataStream.write({ type: 'artifact-clear' });

    const { fullStream } = streamObject({
      model: groq('llama-3.3-70b-versatile'),
      system: `Eres un asistente agrícola experto en visualización de datos. Crea configuraciones de gráficos Recharts.

Reglas:
- Devuelve un objeto JSON válido con la configuración del gráfico
- Usa datos agrícolas realistas (rendimiento, temperatura, humedad, riego, etc.)
- Elige el tipo de gráfico apropiado: "line" para tendencias, "bar" para comparaciones, "area" para datos acumulados
- El campo "data" debe ser un array de objetos con los datos
- El campo "xAxis" es el nombre de la clave para el eje X (generalmente fecha o categoría)
- El campo "yAxis" es un array de nombres de claves para las series del eje Y
- Incluye un título descriptivo

Ejemplo de formato:
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
      schema: z.object({
        type: z
          .enum(['line', 'bar', 'area'])
          .describe('Tipo de gráfico'),
        title: z.string().describe('Título del gráfico'),
        data: z
          .array(z.record(z.union([z.string(), z.number()])))
          .describe('Datos del gráfico'),
        xAxis: z.string().describe('Clave para el eje X'),
        yAxis: z.array(z.string()).describe('Claves para las series del eje Y'),
      }),
    });

    let chartContent = '';
    for await (const delta of fullStream) {
      if (delta.type === 'object' && delta.object) {
        chartContent = JSON.stringify(delta.object, null, 2);
        dataStream.write({
          type: 'data-chartDelta',
          data: chartContent,
        });
      }
    }

  },

  onUpdateDocument: async ({ id, description, currentContent, dataStream }) => {
    dataStream.write({ type: 'artifact-clear' });

    const { fullStream } = streamObject({
      model: groq('llama-3.3-70b-versatile'),
      system: `Eres un asistente agrícola experto en visualización de datos. Actualiza configuraciones de gráficos Recharts.

Reglas:
- Mantén la estructura del gráfico cuando sea apropiado
- Aplica los cambios solicitados
- Devuelve un objeto JSON válido`,
      prompt: `Configuración actual:\n${currentContent}\n\nCambio solicitado: ${description}`,
      schema: z.object({
        type: z.enum(['line', 'bar', 'area']),
        title: z.string(),
        data: z.array(z.record(z.union([z.string(), z.number()]))),
        xAxis: z.string(),
        yAxis: z.array(z.string()),
      }),
    });

    let chartContent = '';
    for await (const delta of fullStream) {
      if (delta.type === 'object' && delta.object) {
        chartContent = JSON.stringify(delta.object, null, 2);
        dataStream.write({
          type: 'data-chartDelta',
          data: chartContent,
        });
      }
    }

  },
};
