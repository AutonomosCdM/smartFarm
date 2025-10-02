/**
 * Prompt Injection Utilities for smartFARM v3
 *
 * Handles dynamic system prompt construction with agent context and RAG integration.
 */

import { getAgent, type AgentType } from "./agents"

/**
 * RAG context chunk interface
 */
export interface RAGChunk {
  content: string
  filename?: string
  score?: number
}

/**
 * Options for building system prompts
 */
export interface PromptBuilderOptions {
  agentId?: AgentType
  ragChunks?: RAGChunk[]
  includeMetadata?: boolean
}

/**
 * Build a complete system prompt with agent context and optional RAG context
 *
 * @param options - Configuration for prompt building
 * @returns Complete system prompt string
 */
export function buildSystemPrompt(options: PromptBuilderOptions = {}): string {
  const { agentId, ragChunks = [], includeMetadata = false } = options

  // Get agent and base system prompt
  const agent = getAgent(agentId)
  let systemPrompt = agent.systemPrompt

  // Add RAG context if chunks are provided
  if (ragChunks.length > 0) {
    const ragContext = formatRAGContext(ragChunks, includeMetadata)
    systemPrompt = `${systemPrompt}\n\n${ragContext}`
  }

  return systemPrompt
}

/**
 * Format RAG chunks into a context block for injection
 *
 * @param chunks - Array of RAG chunks to format
 * @param includeMetadata - Whether to include source filenames
 * @returns Formatted context string
 */
export function formatRAGContext(
  chunks: RAGChunk[],
  includeMetadata = false
): string {
  if (chunks.length === 0) {
    return ""
  }

  const formattedChunks = chunks.map((chunk, index) => {
    let entry = `${index + 1}. ${chunk.content}`

    if (includeMetadata && chunk.filename) {
      entry += `\n   Source: ${chunk.filename}`
    }

    if (includeMetadata && chunk.score !== undefined) {
      entry += `\n   Relevance: ${(chunk.score * 100).toFixed(1)}%`
    }

    return entry
  })

  return `RELEVANT INFORMATION FROM FARM DOCUMENTS:

The following information has been retrieved from your farm's knowledge base and may be relevant to answering the user's question:

${formattedChunks.join("\n\n")}

---

Use this information to provide more specific and accurate answers. If the retrieved information is relevant, reference it in your response. If it's not relevant or conflicts with your knowledge, prioritize standard agricultural best practices.`
}

/**
 * Inject RAG context into an existing system prompt
 *
 * @param basePrompt - The base system prompt
 * @param chunks - RAG chunks to inject
 * @param includeMetadata - Whether to include chunk metadata
 * @returns Combined prompt with RAG context
 */
export function injectRAGContext(
  basePrompt: string,
  chunks: RAGChunk[],
  includeMetadata = false
): string {
  if (chunks.length === 0) {
    return basePrompt
  }

  const ragContext = formatRAGContext(chunks, includeMetadata)
  return `${basePrompt}\n\n${ragContext}`
}

/**
 * Extract the last user message from a messages array
 * Useful for RAG query generation
 *
 * @param messages - Array of chat messages
 * @returns The last user message content or empty string
 */
export function extractLastUserMessage(
  messages: Array<{ role: string; content: string }>
): string {
  if (!messages || messages.length === 0) {
    return ""
  }

  // Find the last message with role "user"
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content
    }
  }

  return ""
}

/**
 * Validate RAG chunks before injection
 * Filters out empty or invalid chunks
 *
 * @param chunks - RAG chunks to validate
 * @returns Validated and filtered chunks
 */
export function validateRAGChunks(chunks: RAGChunk[]): RAGChunk[] {
  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks.filter(chunk => {
    return (
      chunk &&
      typeof chunk === "object" &&
      typeof chunk.content === "string" &&
      chunk.content.trim().length > 0
    )
  })
}
