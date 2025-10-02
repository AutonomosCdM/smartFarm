# Artifacts System

The Artifacts system provides a complete solution for rendering AI-generated content including React components, code blocks, and markdown documents.

## Components

### 1. ArtifactRenderer
**Location:** `/components/artifacts/artifact-renderer.tsx`

Main renderer component that routes artifacts to appropriate renderers based on type.

**Features:**
- Automatic type detection and routing
- Copy to clipboard functionality
- Download as file functionality
- Error boundaries for safe rendering
- Responsive card layout with shadcn/ui

**Usage:**
```tsx
import { ArtifactRenderer } from '@/components/artifacts';
import { parseArtifacts } from '@/lib/ai/artifact-parser';

// Parse AI response
const { text, artifacts } = parseArtifacts(aiResponse);

// Render artifacts
{artifacts.map(artifact => (
  <ArtifactRenderer key={artifact.id} artifact={artifact} />
))}
```

### 2. ReactArtifact
**Location:** `/components/artifacts/react-artifact.tsx`

Renders React/JSX components with preview and code view modes.

**Features:**
- Preview/Code toggle
- Error boundary for runtime errors
- Sandboxed execution (placeholder for production sandbox)
- Security notices
- Safe component rendering

**Props:**
- `content` (string): React/JSX code
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
import { ReactArtifact } from '@/components/artifacts';

<ReactArtifact content={jsxCode} />
```

### 3. CodeArtifact
**Location:** `/components/artifacts/code-artifact.tsx`

Renders code blocks with syntax highlighting and line numbers.

**Features:**
- Syntax highlighting via rehype-highlight and highlight.js
- Line numbers (toggleable)
- Copy to clipboard
- Language detection and display
- Support for 20+ programming languages

**Props:**
- `content` (string): Code content
- `language` (string, optional): Programming language (default: 'text')
- `showLineNumbers` (boolean, optional): Show line numbers (default: true)
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
import { CodeArtifact } from '@/components/artifacts';

<CodeArtifact
  content={code}
  language="typescript"
  showLineNumbers={true}
/>
```

### 4. MarkdownArtifact
**Location:** `/components/artifacts/markdown-artifact.tsx`

Renders GitHub Flavored Markdown with custom styling.

**Features:**
- GitHub Flavored Markdown (GFM) support via remark-gfm
- Syntax highlighting for code blocks
- Custom styled components (headings, lists, tables, etc.)
- Responsive tables
- External link handling
- Inline code styling

**Props:**
- `content` (string): Markdown content
- `className` (string, optional): Additional CSS classes

**Usage:**
```tsx
import { MarkdownArtifact } from '@/components/artifacts';

<MarkdownArtifact content={markdownText} />
```

## Artifact Parser

### parseArtifacts()
**Location:** `/lib/ai/artifact-parser.ts`

Parses AI responses to extract and structure artifacts.

**Features:**
- Detects code blocks with language identifiers
- Extracts optional titles from metadata
- Generates unique IDs
- Validates artifact structure
- Replaces artifacts with placeholders in text

**Usage:**
```tsx
import { parseArtifacts } from '@/lib/ai/artifact-parser';

const aiResponse = `
Here's a React component:

\`\`\`tsx title="Button Component"
export function Button({ children }) {
  return <button>{children}</button>
}
\`\`\`
`;

const { text, artifacts } = parseArtifacts(aiResponse);
// text: "Here's a React component:\n\n[Artifact: Button Component]"
// artifacts: [{ id: "...", type: "react", content: "...", ... }]
```

### Helper Functions

**hasArtifacts(message: string): boolean**
- Quick check if message contains code blocks

**parseSingleArtifact(code, language, title?): Artifact | null**
- Parse a single code block into an artifact

**getSupportedTypes(): ArtifactType[]**
- Returns array of supported artifact types: ['react', 'code', 'markdown']

## Type Definitions

**Location:** `/types/artifacts.ts`

### Core Types

```typescript
type ArtifactType = 'react' | 'code' | 'markdown';

interface Artifact {
  id: string;
  type: ArtifactType;
  title?: string;
  language?: string;
  content: string;
  raw: string;
  metadata?: ArtifactMetadata;
}

interface ParsedMessage {
  text: string;
  artifacts: Artifact[];
}
```

### Type Guards

```typescript
import { isArtifact, isParsedMessage } from '@/types/artifacts';

if (isArtifact(data)) {
  // data is Artifact
}
```

## Supported Languages

### React Artifacts
- `jsx`, `tsx`, `react`

### Markdown Artifacts
- `md`, `markdown`

### Code Artifacts
All other languages including:
- JavaScript: `js`, `javascript`
- TypeScript: `ts`, `typescript`
- Python: `py`, `python`
- Java: `java`
- C/C++: `c`, `cpp`
- Go: `go`
- Rust: `rust`
- PHP: `php`
- HTML/CSS: `html`, `css`, `scss`
- Shell: `sh`, `bash`, `shell`
- And 10+ more...

## AI Response Format

For AI models to generate artifacts, use this format:

```
Your explanation here...

\`\`\`language title="Optional Title"
code content here
\`\`\`

More explanation...
```

**Examples:**

React Component:
```
\`\`\`tsx title="Counter Component"
export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
\`\`\`
```

Python Code:
```
\`\`\`python title="Fibonacci Generator"
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
\`\`\`
```

Markdown Document:
```
\`\`\`markdown title="API Documentation"
# API Reference

## Authentication
Use Bearer tokens...
\`\`\`
```

## Error Handling

All components include comprehensive error handling:

1. **Parsing Errors**: Validation during artifact extraction
2. **Rendering Errors**: Error boundaries catch runtime errors
3. **User Feedback**: Clear error messages with context
4. **Graceful Degradation**: Failed artifacts don't break the UI

## Security Considerations

### React Artifacts
- Currently shows placeholder in preview mode
- Production implementation should use:
  - Proper JSX transformer (Babel/SWC)
  - Sandboxed iframe execution
  - Content Security Policy (CSP)
  - Code sanitization

### Code Artifacts
- Read-only display
- No code execution
- Safe syntax highlighting

### Markdown Artifacts
- Uses react-markdown (XSS-safe)
- External links open in new tab
- No inline HTML execution

## Styling

Uses Tailwind CSS with shadcn/ui design system:
- Dark mode support via `dark:` variants
- Responsive design
- Consistent spacing and typography
- Accessible color contrasts

## Dependencies

```json
{
  "ai": "^5.0.59",
  "react-markdown": "^10.1.0",
  "rehype-highlight": "^7.0.2",
  "remark-gfm": "^4.0.1",
  "highlight.js": "^11.11.1",
  "lucide-react": "^0.544.0"
}
```

## Integration Example

Full integration with chat interface:

```tsx
'use client';

import { useState } from 'react';
import { ArtifactsRenderer } from '@/components/artifacts';
import { parseArtifacts } from '@/lib/ai/artifact-parser';

export function ChatMessage({ content }) {
  const { text, artifacts } = parseArtifacts(content);

  return (
    <div className="space-y-4">
      {/* Regular message text */}
      <div className="prose">{text}</div>

      {/* Rendered artifacts */}
      {artifacts.length > 0 && (
        <ArtifactsRenderer artifacts={artifacts} />
      )}
    </div>
  );
}
```

## Performance

- Parsing: O(n) where n is message length
- Rendering: Lazy evaluation of code blocks
- Memory: Artifacts cached in component state
- Target metrics (from CLAUDE.md):
  - Artifact render: < 100ms (instant)
  - No blocking UI operations
  - Smooth scrolling with syntax highlighting

## Testing

Test with various artifact types:

```typescript
import { parseArtifacts } from '@/lib/ai/artifact-parser';

describe('Artifact Parser', () => {
  it('parses React artifacts', () => {
    const message = '```tsx\nexport default () => <div>Hi</div>\n```';
    const { artifacts } = parseArtifacts(message);

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('react');
  });

  it('handles multiple artifacts', () => {
    const message = '```js\ncode1\n```\n\n```py\ncode2\n```';
    const { artifacts } = parseArtifacts(message);

    expect(artifacts).toHaveLength(2);
  });

  it('extracts titles', () => {
    const message = '```js title="Example"\ncode\n```';
    const { artifacts } = parseArtifacts(message);

    expect(artifacts[0].title).toBe('Example');
  });
});
```

## Future Enhancements

1. **React Sandbox**: Implement proper JSX transformer and iframe sandbox
2. **Live Editing**: Allow inline editing of artifacts
3. **Version History**: Track artifact modifications
4. **Export Options**: PDF, image, multiple formats
5. **Collaborative Features**: Share and fork artifacts
6. **Performance**: Virtual scrolling for large code blocks
