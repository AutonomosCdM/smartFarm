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
    inputSchema: z.object({
      title: z.string().describe('Brief descriptive title for the document in Spanish'),
      kind: z.enum(artifactKinds).describe('Type of artifact: sheet for tables/spreadsheets, chart for visualizations'),
    }),
    execute: async ({ title, kind }) => {
      const id = `artifact_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      dataStream.writeData({
        type: 'artifact-kind',
        content: kind,
      });

      dataStream.writeData({
        type: 'artifact-id',
        content: id,
      });

      dataStream.writeData({
        type: 'artifact-title',
        content: title,
      });

      dataStream.writeData({
        type: 'artifact-clear',
        content: null,
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

      dataStream.writeData({
        type: 'artifact-finish',
        content: null,
      });

      return {
        id,
        title,
        kind,
        content: 'Document created and visible to user',
      };
    },
  });
