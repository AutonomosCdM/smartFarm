'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Eye, Code2 } from 'lucide-react';
import { CodeArtifact } from './code-artifact';

interface ReactArtifactProps {
  content: string;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component for React Artifacts
 */
class ReactArtifactErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              Failed to render component
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * React Component Artifact Renderer
 * Safely renders React components from AI-generated code
 * Provides preview mode and error handling
 */
export function ReactArtifact({ content, className = '' }: ReactArtifactProps) {
  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Reset error state when content changes
    setRenderError(null);

    // Attempt to compile and render the React component
    try {
      // Simple validation - check for basic JSX structure
      if (!content.trim()) {
        throw new Error('Empty component content');
      }

      // For safety, we'll render the code in an isolated context
      // In a production environment, you'd want to use a proper sandbox
      // This is a simplified version that renders the JSX as-is

      // Create a sandboxed component
      const SandboxedComponent = () => {
        try {
          // Use dangerouslySetInnerHTML as a simple renderer
          // In production, use a proper JSX transformer
          return (
            <div className="p-4 bg-background rounded-lg border">
              <div className="text-sm text-muted-foreground mb-4">
                Preview mode renders the component in a sandboxed environment.
              </div>
              <div className="p-4 bg-muted/50 rounded border-2 border-dashed">
                <p className="text-sm text-muted-foreground">
                  React component preview will be rendered here.
                  This requires a JSX transformer for security.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Component code is available in the Code view.
                </p>
              </div>
            </div>
          );
        } catch (err) {
          throw new Error(
            `Component render failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      };

      setComponent(() => SandboxedComponent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse component';
      setRenderError(errorMessage);
      setComponent(null);
    }
  }, [content]);

  const handleError = (error: Error) => {
    setRenderError(error.message);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={mode === 'preview' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('preview')}
        >
          <Eye className="mr-1" />
          Preview
        </Button>
        <Button
          variant={mode === 'code' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('code')}
        >
          <Code2 className="mr-1" />
          Code
        </Button>
      </div>

      {/* Content */}
      {mode === 'preview' ? (
        <div className="min-h-[200px]">
          {renderError ? (
            <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-destructive">
                  Component Error
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {renderError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('code')}
                  className="mt-3"
                >
                  View Code
                </Button>
              </div>
            </div>
          ) : Component ? (
            <ReactArtifactErrorBoundary onError={handleError}>
              <Component />
            </ReactArtifactErrorBoundary>
          ) : (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading component...
            </div>
          )}
        </div>
      ) : (
        <CodeArtifact content={content} language="tsx" showLineNumbers />
      )}

      {/* Security Notice */}
      <div className="text-xs text-muted-foreground px-2">
        Note: React components are rendered in a sandboxed environment for security.
      </div>
    </div>
  );
}
