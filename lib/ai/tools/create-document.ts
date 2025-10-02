import { tool } from 'ai';
import { z } from 'zod';
import { artifactKinds, type ArtifactKind } from '@/lib/artifacts/types';
import { getDocumentHandler } from '@/lib/artifacts/server';

type CreateDocumentProps = {
  dataStream: any;
};

export const createDocument = ({ dataStream }: CreateDocumentProps) =>
  tool({
    description: 'Create a document or artifact (spreadsheet, chart, etc.) for the user',
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }: { title: string; kind: ArtifactKind }) => {
      const id = `artifact_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      dataStream.write({
        type: 'artifact-kind',
        data: kind,
      });

      dataStream.write({
        type: 'artifact-id',
        data: id,
      });

      dataStream.write({
        type: 'artifact-title',
        data: title,
      });

      dataStream.write({
        type: 'artifact-clear',
        data: null,
      });

      const handler = getDocumentHandler(kind);
      if (!handler) {
        throw new Error(`No handler found for kind: ${kind}`);
      }

      await handler.onCreateDocument({
        id,
        title,
        dataStream,
      });

      dataStream.write({
        type: 'artifact-finish',
        data: null,
      });

      return {
        id,
        title,
        kind,
        content: 'Document created and visible to user',
      };
    },
  });
