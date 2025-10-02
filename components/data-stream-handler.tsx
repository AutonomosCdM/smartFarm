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
      // Handle data stream parts with custom types
      if (streamPart.type === 'data' && streamPart.content) {
        const content = streamPart.content as any;

        // Handle generic artifact updates
        if (content.type === 'artifact-id') {
          setArtifact((draft) => ({
            ...draft,
            id: content.content,
          }));
        } else if (content.type === 'artifact-title') {
          setArtifact((draft) => ({
            ...draft,
            title: content.content,
          }));
        } else if (content.type === 'artifact-kind') {
          setArtifact((draft) => ({
            ...draft,
            kind: content.content,
            isVisible: true,
          }));

          // Get artifact definition and call onStreamPart
          const definition = getArtifactDefinition(content.content);
          if (definition?.onStreamPart) {
            definition.onStreamPart({
              streamPart,
              setArtifact,
            });
          }
        } else if (content.type === 'artifact-clear') {
          setArtifact((draft) => ({
            ...draft,
            content: '',
          }));
        } else if (content.type === 'artifact-finish') {
          setArtifact((draft) => ({
            ...draft,
            status: 'idle',
          }));
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
      }
    });
  }, [streamParts, setArtifact]);

  return null; // This component doesn't render anything
}
