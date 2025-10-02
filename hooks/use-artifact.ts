'use client';

import useSWR from 'swr';
import { UIArtifact } from '@/lib/artifacts/types';

/**
 * Initial artifact state
 */
const initialArtifactData: UIArtifact = {
  id: '',
  kind: 'sheet',
  title: '',
  content: '',
  isVisible: false,
  status: 'idle',
  metadata: undefined,
};

/**
 * Hook for managing artifact state with SWR
 * Based on Vercel AI Chatbot pattern
 */
export function useArtifact() {
  const {
    data: artifact,
    mutate: setArtifact,
    isLoading,
  } = useSWR<UIArtifact>('artifact', null, {
    fallbackData: initialArtifactData,
  });

  // Metadata stored separately per document
  const { data: metadata, mutate: setMetadata } = useSWR<
    Record<string, unknown>
  >(artifact?.id ? `artifact-metadata-${artifact.id}` : null, null, {
    fallbackData: artifact?.metadata || {},
  });

  return {
    artifact,
    setArtifact,
    metadata,
    setMetadata,
    isLoading,
  };
}
