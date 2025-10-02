'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import rehypeHighlight from 'rehype-highlight';
import ReactMarkdown from 'react-markdown';
import 'highlight.js/styles/github-dark.css';

interface CodeArtifactProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Code Block Artifact Renderer
 * Renders code with syntax highlighting, line numbers, and copy functionality
 */
export function CodeArtifact({
  content,
  language = 'text',
  showLineNumbers = true,
  className = '',
}: CodeArtifactProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Split content into lines for line numbering
  const lines = content.split('\n');
  const maxLineNumberWidth = String(lines.length).length;

  // Supported languages map for display
  const languageDisplayNames: Record<string, string> = {
    js: 'JavaScript',
    jsx: 'JavaScript (JSX)',
    ts: 'TypeScript',
    tsx: 'TypeScript (TSX)',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    rb: 'Ruby',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    xml: 'XML',
    sql: 'SQL',
    sh: 'Shell',
    bash: 'Bash',
    shell: 'Shell',
    text: 'Plain Text',
  };

  const displayLanguage = languageDisplayNames[language.toLowerCase()] || language;

  return (
    <div className={`relative group ${className}`}>
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {displayLanguage}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="relative overflow-x-auto bg-background border">
        {showLineNumbers ? (
          <div className="flex">
            {/* Line numbers */}
            <div className="select-none bg-muted/50 border-r px-2 py-4">
              {lines.map((_, index) => (
                <div
                  key={index}
                  className="text-xs text-muted-foreground text-right leading-6 font-mono"
                  style={{ minWidth: `${maxLineNumberWidth}ch` }}
                >
                  {index + 1}
                </div>
              ))}
            </div>

            {/* Code with syntax highlighting */}
            <div className="flex-1 overflow-x-auto">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: ({ children }) => (
                    <code className={`language-${language} hljs`}>
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="!m-0 !p-4 !bg-transparent">
                      {children}
                    </pre>
                  ),
                }}
              >
                {`\`\`\`${language}\n${content}\n\`\`\``}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <ReactMarkdown
              rehypePlugins={[rehypeHighlight]}
              components={{
                code: ({ children }) => (
                  <code className={`language-${language} hljs`}>
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="!m-0 !p-4 !bg-transparent">
                    {children}
                  </pre>
                ),
              }}
            >
              {`\`\`\`${language}\n${content}\n\`\`\``}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
