import type { NodeType } from '../types';

export interface SerializedNode {
  id: string;
  name: string;
  type: NodeType;
  size: number;
  createdAt: number;
  updatedAt: number;
  parentId: string | null; // Replaces the circular parent pointer
  content?: string; // Only present for files
}

export interface SerializedFileSystem {
  version: number;
  timestamp: number;
  nodes: SerializedNode[];
}

export interface StorageAdapter {
  load(): Promise<SerializedFileSystem | null>;
  save(data: SerializedFileSystem): Promise<void>;
}
