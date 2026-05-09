import type { DirectoryNode, FileNode, VFSNode } from '../types';
import type { SerializedFileSystem, SerializedNode } from './types';

export const CURRENT_VFS_VERSION = 1;

export const serializeVFS = (root: DirectoryNode): SerializedFileSystem => {
  const nodes: SerializedNode[] = [];

  const traverse = (node: VFSNode, parentId: string | null) => {
    const serialized: SerializedNode = {
      id: node.id,
      name: node.name,
      type: node.type,
      size: node.size,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      parentId,
    };

    if (node.type === 'file') {
      serialized.content = node.content;
    }

    nodes.push(serialized);

    if (node.type === 'directory') {
      for (const child of node.children.values()) {
        traverse(child, node.id);
      }
    }
  };

  traverse(root, null);

  return {
    version: CURRENT_VFS_VERSION,
    timestamp: Date.now(),
    nodes,
  };
};

export const deserializeVFS = (data: SerializedFileSystem): DirectoryNode => {
  // Map to quickly look up reconstructed nodes by ID
  const nodeMap = new Map<string, VFSNode>();
  let root: DirectoryNode | null = null;

  // First pass: instantiate all nodes without linking parents/children
  for (const serialized of data.nodes) {
    if (serialized.type === 'directory') {
      const dir: DirectoryNode = {
        id: serialized.id,
        name: serialized.name,
        type: 'directory',
        size: serialized.size,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt,
        parent: null, // Will be linked in second pass
        children: new Map(),
      };
      nodeMap.set(dir.id, dir);
      if (serialized.parentId === null && serialized.name === '/') {
        root = dir;
      }
    } else {
      const file: FileNode = {
        id: serialized.id,
        name: serialized.name,
        type: 'file',
        size: serialized.size,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt,
        parent: null, // Will be linked in second pass
        content: serialized.content || '',
      };
      nodeMap.set(file.id, file);
    }
  }

  if (!root) {
    throw new Error('Failed to deserialize VFS: No root directory found.');
  }

  // Second pass: link parents and children based on parentId
  for (const serialized of data.nodes) {
    if (serialized.parentId === null) continue; // Skip root

    const child = nodeMap.get(serialized.id);
    const parent = nodeMap.get(serialized.parentId);

    if (child && parent && parent.type === 'directory') {
      child.parent = parent;
      parent.children.set(child.name, child);
    }
  }

  return root;
};
