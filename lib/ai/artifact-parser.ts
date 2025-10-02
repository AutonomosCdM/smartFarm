/**
 * Artifact Parser - Detects and parses artifacts from AI responses
 * Supports React components, code blocks, and markdown
 */

export type ArtifactType = 'react' | 'code' | 'markdown';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title?: string;
  language?: string;
  content: string;
  raw: string;
}

export interface ParsedMessage {
  text: string;
  artifacts: Artifact[];
}

/**
 * Artifact markers used by AI to denote different artifact types
 */
const ARTIFACT_PATTERNS = {
  react: /```(?:jsx|tsx|react)\s*(?:title="([^"]+)")?\s*\n([\s\S]*?)```/gi,
  code: /```(\w+)(?:\s+title="([^"]+)")?\s*\n([\s\S]*?)```/gi,
  markdown: /```(?:md|markdown)\s*(?:title="([^"]+)")?\s*\n([\s\S]*?)```/gi,
} as const;

/**
 * Languages that should be rendered as React artifacts
 */
const REACT_LANGUAGES = new Set(['jsx', 'tsx', 'react']);

/**
 * Languages that should be rendered as Markdown artifacts
 */
const MARKDOWN_LANGUAGES = new Set(['md', 'markdown']);

/**
 * Generate a unique ID for an artifact
 */
function generateArtifactId(): string {
  return `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Detect artifact type from language identifier
 */
function detectArtifactType(language: string): ArtifactType {
  const lang = language.toLowerCase();

  if (REACT_LANGUAGES.has(lang)) {
    return 'react';
  }

  if (MARKDOWN_LANGUAGES.has(lang)) {
    return 'markdown';
  }

  return 'code';
}

/**
 * Validate artifact structure
 */
function validateArtifact(artifact: Partial<Artifact>): artifact is Artifact {
  return (
    typeof artifact.id === 'string' &&
    typeof artifact.type === 'string' &&
    typeof artifact.content === 'string' &&
    typeof artifact.raw === 'string' &&
    ['react', 'code', 'markdown'].includes(artifact.type)
  );
}

/**
 * Extract all code blocks from message
 */
function extractCodeBlocks(message: string): Array<{
  match: string;
  language: string;
  title?: string;
  content: string;
  index: number;
}> {
  const blocks: Array<{
    match: string;
    language: string;
    title?: string;
    content: string;
    index: number;
  }> = [];

  // Match all code blocks with optional title
  const codeBlockRegex = /```(\w+)(?:\s+title="([^"]+)")?\s*\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(message)) !== null) {
    blocks.push({
      match: match[0],
      language: match[1],
      title: match[2],
      content: match[3].trim(),
      index: match.index,
    });
  }

  return blocks;
}

/**
 * Parse AI message for artifacts
 * Returns the message with artifacts removed and a list of parsed artifacts
 */
export function parseArtifacts(message: string): ParsedMessage {
  const artifacts: Artifact[] = [];
  let processedMessage = message;

  // Extract all code blocks
  const codeBlocks = extractCodeBlocks(message);

  // Process each code block
  for (const block of codeBlocks) {
    const type = detectArtifactType(block.language);

    const artifact: Partial<Artifact> = {
      id: generateArtifactId(),
      type,
      title: block.title,
      language: block.language,
      content: block.content,
      raw: block.match,
    };

    if (validateArtifact(artifact)) {
      artifacts.push(artifact);

      // Replace the artifact in the message with a placeholder
      processedMessage = processedMessage.replace(
        block.match,
        `[Artifact: ${artifact.title || artifact.type}]`
      );
    }
  }

  return {
    text: processedMessage.trim(),
    artifacts,
  };
}

/**
 * Parse a single artifact from a code block string
 */
export function parseSingleArtifact(
  codeBlock: string,
  language: string,
  title?: string
): Artifact | null {
  const type = detectArtifactType(language);

  const artifact: Partial<Artifact> = {
    id: generateArtifactId(),
    type,
    title,
    language,
    content: codeBlock.trim(),
    raw: `\`\`\`${language}${title ? ` title="${title}"` : ''}\n${codeBlock}\n\`\`\``,
  };

  return validateArtifact(artifact) ? artifact : null;
}

/**
 * Check if a message contains any artifacts
 */
export function hasArtifacts(message: string): boolean {
  return /```\w+/.test(message);
}

/**
 * Get supported artifact types
 */
export function getSupportedTypes(): ArtifactType[] {
  return ['react', 'code', 'markdown'];
}
