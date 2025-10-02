import { ArtifactKind } from './types';

/**
 * Document handler for server-side artifact generation
 */
export interface DocumentHandler<K extends ArtifactKind = ArtifactKind> {
  kind: K;
  onCreateDocument: (args: {
    id: string;
    title: string;
    dataStream: DataStreamWriter;
  }) => Promise<void>;
  onUpdateDocument: (args: {
    id: string;
    description: string;
    currentContent: string;
    dataStream: DataStreamWriter;
  }) => Promise<void>;
}

/**
 * Data stream writer interface (from AI SDK)
 */
export interface DataStreamWriter {
  write: (data: any) => void;
}

import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { chartDocumentHandler } from '@/artifacts/chart/server';

/**
 * Registry of document handlers by kind
 * Import and add handlers here as they're created
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  sheetDocumentHandler,
  chartDocumentHandler,
];

/**
 * Get handler for a specific artifact kind
 */
export function getDocumentHandler(
  kind: ArtifactKind
): DocumentHandler | undefined {
  return documentHandlersByArtifactKind.find((h) => h.kind === kind);
}
