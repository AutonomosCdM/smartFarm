/**
 * Central export point for AI utilities and agent system
 */

// Agent definitions and utilities
export {
  agents,
  DEFAULT_AGENT,
  getAgent,
  getAllAgents,
  isValidAgentType,
  type Agent,
  type AgentType,
} from "./agents"

// Prompt injection utilities
export {
  buildSystemPrompt,
  formatRAGContext,
  injectRAGContext,
  extractLastUserMessage,
  validateRAGChunks,
  type RAGChunk,
  type PromptBuilderOptions,
} from "./prompt-injection"

// Artifact parser (existing)
export { parseArtifacts, type Artifact } from "./artifact-parser"
