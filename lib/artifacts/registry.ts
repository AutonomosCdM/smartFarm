import { ArtifactDefinition } from './types';
import { sheetArtifact } from '@/artifacts/sheet/client';
import { chartArtifact } from '@/artifacts/chart/client';

/**
 * Registry of all artifact definitions
 * Used by client components to render artifacts
 */
export const artifactDefinitions: ArtifactDefinition[] = [
  sheetArtifact,
  chartArtifact,
];

/**
 * Get artifact definition by kind
 */
export function getArtifactDefinition(kind: string): ArtifactDefinition | undefined {
  return artifactDefinitions.find((def) => def.kind === kind);
}
