import { createGroq } from '@ai-sdk/groq';
import { NextRequest } from 'next/server';
import {
  buildSystemPrompt,
  extractLastUserMessage,
  validateRAGChunks,
  type RAGChunk,
  type AgentType,
} from '@/lib/ai';
import { createDocument } from '@/lib/ai/tools/create-document';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.GROQ_API_KEY) {
      return new Response('GROQ_API_KEY not configured', { status: 500 });
    }

    // Parse request body
    const { messages, agent, useRAG = false } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // Fetch RAG context if enabled
    let ragChunks: RAGChunk[] = [];
    if (useRAG && messages.length > 0) {
      try {
        const query = extractLastUserMessage(messages);

        if (query) {
          const ragResponse = await fetch(`${req.nextUrl.origin}/api/rag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
          });

          if (ragResponse.ok) {
            const data = await ragResponse.json();
            if (data.chunks && Array.isArray(data.chunks)) {
              ragChunks = validateRAGChunks(data.chunks);
            }
          }
        }
      } catch (error) {
        console.error('RAG retrieval failed:', error);
        // Continue without RAG context if retrieval fails
      }
    }

    // Build complete system prompt with agent context and RAG
    const finalSystemPrompt = buildSystemPrompt({
      agentId: agent as AgentType,
      ragChunks,
      includeMetadata: true,
    });

    // Enhanced system prompt with artifact capabilities
    const artifactSystemPrompt = `${finalSystemPrompt}

## Artifact Capabilities

You can create interactive artifacts for the user using these tools:

1. **createDocument** - Create spreadsheets (CSV tables) or data visualizations
   - Use "sheet" kind for: data tables, crop records, harvest logs, irrigation schedules
   - Use "chart" kind for: graphs, trend analysis, data visualization

2. **When to use artifacts:**
   - User asks to "create a table", "make a spreadsheet", "show data in a table"
   - User asks to "create a chart", "visualize", "show a graph"
   - Data would be better presented visually than as markdown

3. **Important:**
   - ALWAYS use createDocument tool when user requests tables, spreadsheets, or charts
   - Don't create markdown tables when user asks for a table - use the sheet artifact instead
   - Title should be brief and descriptive in Spanish

Examples:
- "Crea una tabla de riego" → createDocument(kind: "sheet", title: "Tabla de Riego Semanal")
- "Muestra un gráfico de rendimiento" → createDocument(kind: "chart", title: "Rendimiento de Cultivos")`;

    // Stream response from Groq with artifact tools using createUIMessageStream
    const { streamText: streamTextFn, createUIMessageStream } = await import('ai');

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        const result = streamTextFn({
          model: groq('llama-3.3-70b-versatile'),
          messages,
          system: artifactSystemPrompt,
          temperature: 0.7,
          maxSteps: 5,
          tools: {
            createDocument: createDocument({ dataStream }),
          },
        });

        result.consumeStream();

        dataStream.merge(result.toUIMessageStream());
      },
    });

    return new Response(stream.pipeThrough(new (await import('ai')).JsonToSseTransformStream()));
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Chat error: ${errorMessage}`, { status: 500 });
  }
}
