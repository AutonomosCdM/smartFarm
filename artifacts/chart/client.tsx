'use client';

import { Artifact } from '@/components/create-artifact';
import { ChartViewer } from '@/components/chart-viewer';
import { Download, Table2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Chart artifact for data visualization
 */
export const chartArtifact = new Artifact({
  kind: 'chart',
  description: 'Create interactive data visualizations and charts for agricultural data',

  initialize: () => null,

  onStreamPart: ({ streamPart, setArtifact }) => {
    // Handle chart-specific delta updates
    if (streamPart.type === 'data' && streamPart.content) {
      const content = streamPart.content as any;
      if (content.type === 'chartDelta') {
        setArtifact((draft) => ({
          ...draft,
          content: content.content,
          isVisible: true,
          status: 'streaming',
        }));
      }
    }
    // Note: artifact-kind, artifact-id, artifact-title, artifact-clear, artifact-finish
    // are handled by the DataStreamHandler, not here
  },

  content: ({ content, status }) => (
    <ChartViewer content={content} status={status} />
  ),

  actions: [
    {
      icon: <Download className="w-4 h-4" />,
      description: 'Descargar como imagen',
      onClick: async () => {
        // TODO: Implement chart to image export
        toast.info('Funcionalidad próximamente');
      },
    },
  ],

  toolbar: [
    {
      icon: <Table2 className="w-4 h-4" />,
      description: 'Ver como tabla',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          content: 'Muestra estos datos como una tabla',
        });
      },
    },
  ],
});
