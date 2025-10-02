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
      // Handle generic artifact updates
      if (streamPart.type === 'artifact-id') {
        setArtifact((draft) => ({
          ...draft,
          id: streamPart.data,
        }));
      } else if (streamPart.type === 'artifact-title') {
        setArtifact((draft) => ({
          ...draft,
          title: streamPart.data,
        }));
      } else if (streamPart.type === 'artifact-kind') {
        setArtifact((draft) => ({
          ...draft,
          kind: streamPart.data,
          isVisible: true,
        }));

        // Get artifact definition and call onStreamPart
        const definition = getArtifactDefinition(streamPart.data);
        if (definition?.onStreamPart) {
          definition.onStreamPart({
            streamPart,
            setArtifact,
          });
        }
      } else {
        // For all other stream parts, delegate to artifact-specific handler
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
