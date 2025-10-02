/**
 * Artifact Types
 * Type definitions for the Artifacts system
 */

/**
 * Supported artifact types
 */
export type ArtifactType = 'react' | 'code' | 'markdown';

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  /** Optional title for the artifact */
  title?: string;
  /** Programming language for code artifacts */
  language?: string;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last modified timestamp */
  updatedAt?: Date;
  /** Additional custom metadata */
  [key: string]: unknown;
}

/**
 * Core artifact interface
 */
export interface Artifact {
  /** Unique identifier */
  id: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Optional title */
  title?: string;
  /** Language for code/react artifacts */
  language?: string;
  /** Artifact content */
  content: string;
  /** Raw markdown/code block string */
  raw: string;
  /** Optional metadata */
  metadata?: ArtifactMetadata;
}

/**
 * Parsed message with extracted artifacts
 */
export interface ParsedMessage {
  /** Message text with artifacts removed/replaced */
  text: string;
  /** Array of extracted artifacts */
  artifacts: Artifact[];
}

/**
 * Artifact rendering options
 */
export interface ArtifactRenderOptions {
  /** Show line numbers for code */
  showLineNumbers?: boolean;
  /** Enable copy functionality */
  enableCopy?: boolean;
  /** Enable download functionality */
  enableDownload?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Code block extraction result
 */
export interface CodeBlock {
  /** The full matched string */
  match: string;
  /** Detected language */
  language: string;
  /** Optional title from metadata */
  title?: string;
  /** Code content */
  content: string;
  /** Index in original string */
  index: number;
}

/**
 * Artifact validation result
 */
export interface ArtifactValidation {
  /** Whether artifact is valid */
  valid: boolean;
  /** Validation errors if any */
  errors?: string[];
}

/**
 * Type guard for Artifact
 */
export function isArtifact(obj: unknown): obj is Artifact {
  if (!obj || typeof obj !== 'object') return false;

  const artifact = obj as Partial<Artifact>;

  return (
    typeof artifact.id === 'string' &&
    typeof artifact.type === 'string' &&
    ['react', 'code', 'markdown'].includes(artifact.type) &&
    typeof artifact.content === 'string' &&
    typeof artifact.raw === 'string'
  );
}

/**
 * Type guard for ParsedMessage
 */
export function isParsedMessage(obj: unknown): obj is ParsedMessage {
  if (!obj || typeof obj !== 'object') return false;

  const parsed = obj as Partial<ParsedMessage>;

  return (
    typeof parsed.text === 'string' &&
    Array.isArray(parsed.artifacts) &&
    parsed.artifacts.every(isArtifact)
  );
}
