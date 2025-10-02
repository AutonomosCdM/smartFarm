'use client';

import { ArtifactsRenderer } from '@/components/artifacts';
import { parseArtifacts } from '@/lib/ai/artifact-parser';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TestArtifactsPage() {
  // Test message with multiple artifact types
  const testMessage = `
Here are some examples of different artifact types:

## React Component Example

\`\`\`tsx title="Counter Component"
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h2>Count: {count}</h2>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
\`\`\`

## Python Code Example

\`\`\`python title="Fibonacci Generator"
def fibonacci(n):
    """Generate fibonacci sequence up to n terms"""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# Usage
for num in fibonacci(10):
    print(num)
\`\`\`

## Markdown Document Example

\`\`\`markdown title="API Documentation"
# API Reference

## Authentication

Use Bearer tokens for authentication:

\`\`\`http
GET /api/data
Authorization: Bearer YOUR_TOKEN
\`\`\`

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | /api/users | List users |
| POST   | /api/users | Create user |

### Rate Limiting

- 100 requests per minute
- 1000 requests per hour
\`\`\`

## TypeScript Example

\`\`\`typescript title="Type Definitions"
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

type UserRole = User['role'];

function getUser(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json());
}
\`\`\`
`;

  const { text, artifacts } = parseArtifacts(testMessage);

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Artifacts System Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>This page tests the Artifacts rendering system.</p>
            <p>
              <strong>Parsed Message:</strong> {artifacts.length} artifacts found
            </p>
            <p>
              <strong>Types:</strong>{' '}
              {artifacts.map((a) => a.type).join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="prose dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{text}</div>
        </div>

        <ArtifactsRenderer artifacts={artifacts} />
      </div>

      {/* Individual artifact type tests */}
      <div className="mt-12 space-y-8">
        <h2 className="text-2xl font-bold">Individual Artifact Tests</h2>

        {artifacts.map((artifact, index) => (
          <Card key={artifact.id}>
            <CardHeader>
              <CardTitle>
                Artifact {index + 1}: {artifact.type}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <strong>ID:</strong> {artifact.id}
                </div>
                <div>
                  <strong>Type:</strong> {artifact.type}
                </div>
                <div>
                  <strong>Title:</strong> {artifact.title || 'N/A'}
                </div>
                <div>
                  <strong>Language:</strong> {artifact.language || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
