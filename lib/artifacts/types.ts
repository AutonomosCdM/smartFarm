import { ComponentType } from 'react';

/**
 * Artifact kinds supported by smartFARM
 */
export const artifactKinds = ['sheet', 'chart'] as const;
export type ArtifactKind = (typeof artifactKinds)[number];

/**
 * Artifact status during lifecycle
 */
export type ArtifactStatus = 'idle' | 'streaming' | 'complete' | 'error';

/**
 * Base artifact data structure
 */
export interface UIArtifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  content: string;
  isVisible: boolean;
  status: ArtifactStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Artifact action (toolbar button)
 */
export interface ArtifactAction {
  icon: React.ReactNode;
  description: string;
  onClick: (context: ArtifactActionContext) => void | Promise<void>;
}

/**
 * Artifact toolbar item (context-specific actions)
 */
export interface ArtifactToolbarItem {
  icon: React.ReactNode;
  description: string;
  onClick: (context: ArtifactToolbarContext) => void | Promise<void>;
}

/**
 * Context passed to artifact actions
 */
export interface ArtifactActionContext {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context passed to artifact toolbar items
 */
export interface ArtifactToolbarContext {
  content: string;
  metadata?: Record<string, unknown>;
  sendMessage: (message: { role: string; content: string }) => void;
}

/**
 * Props passed to artifact content components
 */
export interface ArtifactContentProps {
  content: string;
  metadata?: Record<string, unknown>;
  onSaveContent: (content: string, debounce?: boolean) => void;
  status: ArtifactStatus;
}

/**
 * Stream part types for artifact updates
 */
export type ArtifactStreamPart =
  | { type: 'artifact-id'; data: string }
  | { type: 'artifact-title'; data: string }
  | { type: 'artifact-kind'; data: ArtifactKind }
  | { type: 'artifact-clear' }
  | { type: 'artifact-delta'; data: string; transient?: boolean }
  | { type: 'artifact-finish' }
  | { type: 'artifact-metadata'; data: Record<string, unknown> };

/**
 * Context for stream part handlers
 */
export interface StreamPartContext {
  streamPart: ArtifactStreamPart;
  setArtifact: (updater: (draft: UIArtifact) => UIArtifact) => void;
}

/**
 * Artifact definition
 */
export interface ArtifactDefinition {
  kind: ArtifactKind;
  description: string;
  content: ComponentType<ArtifactContentProps>;
  actions: ArtifactAction[];
  toolbar: ArtifactToolbarItem[];
  initialize?: () => Record<string, unknown> | null;
  onStreamPart: (context: StreamPartContext) => void;
}
