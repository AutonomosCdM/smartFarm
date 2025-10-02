'use client';

import { useEffect } from 'react';
import { useArtifact } from '@/hooks/use-artifact';
import { getArtifactDefinition } from '@/lib/artifacts/registry';
import { ArtifactStreamPart } from '@/lib/artifacts/types';

interface DataStreamHandlerProps {
  streamParts: ArtifactStreamPart[];
}

/**
 * Handles data stream parts and updates artifact state
 * Based on Vercel AI Chatbot pattern
 */
export function DataStreamHandler({ streamParts }: DataStreamHandlerProps) {
  const { setArtifact } = useArtifact();

  useEffect(() => {
    if (!streamParts || streamParts.length === 0) return;

    // Process each stream part
    streamParts.forEach((streamPart) => {
      // Handle artifact-specific stream parts
      if (streamPart.type === 'artifact-id') {
        setArtifact((draft) => ({
          ...draft,
          id: streamPart.id,
        }));
      } else if (streamPart.type === 'artifact-title') {
        setArtifact((draft) => ({
          ...draft,
          title: streamPart.title,
        }));
      } else if (streamPart.type === 'artifact-kind') {
        setArtifact((draft) => ({
          ...draft,
          kind: streamPart.kind,
          isVisible: true,
        }));

        // Get artifact definition and call onStreamPart
        const definition = getArtifactDefinition(streamPart.kind);
        if (definition?.onStreamPart) {
          definition.onStreamPart({
            streamPart,
            setArtifact,
          });
        }
      } else if (streamPart.type === 'artifact-clear') {
        setArtifact((draft) => ({
          ...draft,
          content: '',
        }));
      } else if (streamPart.type === 'artifact-finish') {
        setArtifact((draft) => ({
          ...draft,
          status: 'idle',
        }));
      } else if (streamPart.type === 'artifact-delta' || streamPart.type === 'artifact-metadata') {
        // For delta and metadata, delegate to artifact-specific handler
        setArtifact((draft) => {
          const definition = getArtifactDefinition(draft.kind);
          if (definition?.onStreamPart) {
            definition.onStreamPart({
              streamPart,
              setArtifact,
            });
          }
          return draft;
        });
      }
    });
  }, [streamParts, setArtifact]);

  return null; // This component doesn't render anything
}
