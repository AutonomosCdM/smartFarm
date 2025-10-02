'use client';

import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, Code2, FileText, Component } from 'lucide-react';
import { Artifact } from '@/lib/ai/artifact-parser';
import { ReactArtifact } from './react-artifact';
import { CodeArtifact } from './code-artifact';
import { MarkdownArtifact } from './markdown-artifact';

interface ArtifactRendererProps {
  artifact: Artifact;
  className?: string;
}

/**
 * Main Artifact Renderer
 * Routes to appropriate renderer based on artifact type
 * Provides container with title and actions (copy, download)
 */
export function ArtifactRenderer({ artifact, className = '' }: ArtifactRendererProps) {
  const [copied, setCopied] = useState(false);

  // Get icon based on artifact type
  const getIcon = () => {
    switch (artifact.type) {
      case 'react':
        return <Component className="size-4" />;
      case 'code':
        return <Code2 className="size-4" />;
      case 'markdown':
        return <FileText className="size-4" />;
      default:
        return <FileText className="size-4" />;
    }
  };

  // Get title with fallback
  const getTitle = () => {
    if (artifact.title) return artifact.title;

    switch (artifact.type) {
      case 'react':
        return 'React Component';
      case 'code':
        return artifact.language
          ? `${artifact.language.toUpperCase()} Code`
          : 'Code Block';
      case 'markdown':
        return 'Markdown Document';
      default:
        return 'Artifact';
    }
  };

  // Get description based on artifact type
  const getDescription = () => {
    switch (artifact.type) {
      case 'react':
        return 'Interactive React component';
      case 'code':
        return artifact.language
          ? `${artifact.language} code snippet`
          : 'Code snippet';
      case 'markdown':
        return 'Formatted markdown document';
      default:
        return 'Generated artifact';
    }
  };

  // Copy artifact content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy artifact:', error);
    }
  };

  // Download artifact as file
  const handleDownload = () => {
    try {
      // Determine file extension
      let extension = 'txt';
      if (artifact.type === 'react') {
        extension = 'tsx';
      } else if (artifact.type === 'markdown') {
        extension = 'md';
      } else if (artifact.language) {
        // Map common languages to extensions
        const extensionMap: Record<string, string> = {
          javascript: 'js',
          typescript: 'ts',
          jsx: 'jsx',
          tsx: 'tsx',
          python: 'py',
          java: 'java',
          cpp: 'cpp',
          c: 'c',
          csharp: 'cs',
          ruby: 'rb',
          go: 'go',
          rust: 'rs',
          php: 'php',
          html: 'html',
          css: 'css',
          scss: 'scss',
          json: 'json',
          yaml: 'yaml',
          yml: 'yml',
          xml: 'xml',
          sql: 'sql',
          bash: 'sh',
          shell: 'sh',
          sh: 'sh',
        };
        extension = extensionMap[artifact.language.toLowerCase()] || artifact.language;
      }

      // Create filename
      const filename = artifact.title
        ? `${artifact.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`
        : `artifact-${artifact.id}.${extension}`;

      // Create blob and download
      const blob = new Blob([artifact.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download artifact:', error);
    }
  };

  // Render appropriate artifact component
  const renderArtifactContent = () => {
    try {
      switch (artifact.type) {
        case 'react':
          return <ReactArtifact content={artifact.content} />;

        case 'code':
          return (
            <CodeArtifact
              content={artifact.content}
              language={artifact.language || 'text'}
              showLineNumbers
            />
          );

        case 'markdown':
          return <MarkdownArtifact content={artifact.content} />;

        default:
          return (
            <div className="p-4 text-muted-foreground">
              Unsupported artifact type: {artifact.type}
            </div>
          );
      }
    } catch (error) {
      console.error('Error rendering artifact:', error);
      return (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <p className="font-medium">Failed to render artifact</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      );
    }
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {getIcon()}
          <CardTitle>{getTitle()}</CardTitle>
        </div>
        <CardDescription>{getDescription()}</CardDescription>

        <CardAction>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              title="Download artifact"
            >
              <Download className="size-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>{renderArtifactContent()}</CardContent>
    </Card>
  );
}

/**
 * Multiple Artifacts Renderer
 * Renders a list of artifacts with proper spacing
 */
export function ArtifactsRenderer({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {artifacts.map((artifact) => (
        <ArtifactRenderer key={artifact.id} artifact={artifact} />
      ))}
    </div>
  );
}
