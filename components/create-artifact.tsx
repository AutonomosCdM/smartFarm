import { ComponentType } from 'react';
import {
  ArtifactKind,
  ArtifactAction,
  ArtifactToolbarItem,
  ArtifactContentProps,
  StreamPartContext,
} from '@/lib/artifacts/types';

/**
 * Artifact class for defining artifact types
 * Based on Vercel AI Chatbot pattern
 */
export class Artifact<K extends ArtifactKind = ArtifactKind> {
  kind: K;
  description: string;
  content: ComponentType<ArtifactContentProps>;
  actions: ArtifactAction[];
  toolbar: ArtifactToolbarItem[];
  initialize?: () => Record<string, unknown> | null;
  onStreamPart: (context: StreamPartContext) => void;

  constructor(config: {
    kind: K;
    description: string;
    content: ComponentType<ArtifactContentProps>;
    actions?: ArtifactAction[];
    toolbar?: ArtifactToolbarItem[];
    initialize?: () => Record<string, unknown> | null;
    onStreamPart: (context: StreamPartContext) => void;
  }) {
    this.kind = config.kind;
    this.description = config.description;
    this.content = config.content;
    this.actions = config.actions || [];
    this.toolbar = config.toolbar || [];
    this.initialize = config.initialize;
    this.onStreamPart = config.onStreamPart;
  }
}
