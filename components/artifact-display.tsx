'use client';

import { useArtifact } from '@/hooks/use-artifact';
import { getArtifactDefinition } from '@/lib/artifacts/registry';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Main artifact display component
 * Shows artifacts in a split-pane layout
 */
export function ArtifactDisplay() {
  const { artifact, setArtifact } = useArtifact();

  if (!artifact || !artifact.isVisible) {
    return null;
  }

  const definition = getArtifactDefinition(artifact.kind);
  if (!definition) {
    return null;
  }

  const ContentComponent = definition.content;

  const handleClose = () => {
    setArtifact((draft) => ({
      ...draft,
      isVisible: false,
    }));
  };

  const handleSaveContent = async (content: string, debounce?: boolean) => {
    setArtifact((draft) => ({
      ...draft,
      content,
    }));

    // TODO: Save to database
    if (!debounce) {
      console.log('Saving artifact content immediately');
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-1/2 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {artifact.title || 'Artifact'}
          </h2>
          <p className="text-sm text-gray-500 capitalize">{artifact.kind}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {definition.actions.map((action, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() =>
                action.onClick({
                  content: artifact.content,
                  metadata: artifact.metadata,
                })
              }
              title={action.description}
            >
              {action.icon}
            </Button>
          ))}

          <div className="w-px h-6 bg-gray-300 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {definition.toolbar.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
          {definition.toolbar.map((item, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() =>
                item.onClick({
                  content: artifact.content,
                  metadata: artifact.metadata,
                  sendMessage: (message) => {
                    // TODO: Integrate with chat
                    console.log('Send message:', message);
                  },
                })
              }
              title={item.description}
            >
              {item.icon}
              <span className="ml-2 text-sm">{item.description}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ContentComponent
          content={artifact.content}
          metadata={artifact.metadata}
          onSaveContent={handleSaveContent}
          status={artifact.status}
        />
      </div>
    </div>
  );
}
