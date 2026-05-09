import type { DirectoryNode, VFSNode } from './types';

/**
 * Splits a path string into normalized segments.
 * Resolves '.' and '..' segments.
 */
export const normalizePath = (path: string): string[] => {
  const parts = path.split('/').filter((p) => p.length > 0 && p !== '.');
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      if (resolved.length > 0) {
        resolved.pop();
      }
    } else {
      resolved.push(part);
    }
  }

  return resolved;
};

/**
 * Resolves a path string into an actual VFSNode.
 * @param path The path to resolve (e.g., '/home/guest' or '../docs')
 * @param cwd The current working directory path (used if path is relative)
 * @param root The root DirectoryNode of the filesystem
 */
export const resolveNode = (path: string, cwd: string, root: DirectoryNode): VFSNode => {
  // Determine if absolute or relative
  const isAbsolute = path.startsWith('/');
  const targetPath = isAbsolute ? path : `${cwd}/${path}`;
  
  const segments = normalizePath(targetPath);
  
  let currentNode: VFSNode = root;

  for (const segment of segments) {
    if (currentNode.type !== 'directory') {
      throw new Error(`Not a directory: ${currentNode.name}`);
    }

    const nextNode = (currentNode as DirectoryNode).children.get(segment);
    if (!nextNode) {
      throw new Error(`No such file or directory: ${segment}`);
    }

    currentNode = nextNode;
  }

  return currentNode;
};

/**
 * Returns the parent directory and the final target name for a path.
 * Useful for operations like mkdir or touch where the last segment is the new item.
 */
export const resolveParentNode = (
  path: string, 
  cwd: string, 
  root: DirectoryNode
): { parent: DirectoryNode; targetName: string } => {
  const isAbsolute = path.startsWith('/');
  const targetPath = isAbsolute ? path : `${cwd}/${path}`;
  
  const segments = normalizePath(targetPath);
  
  if (segments.length === 0) {
    throw new Error('Cannot perform this operation on the root directory');
  }

  const targetName = segments.pop()!;
  
  // Reconstruct the parent path and resolve it
  // If segments is empty, the parent is the root
  const parentPath = '/' + segments.join('/');
  const parentNode = resolveNode(parentPath, cwd, root);

  if (parentNode.type !== 'directory') {
    throw new Error(`Not a directory: ${parentNode.name}`);
  }

  return { parent: parentNode as DirectoryNode, targetName };
};
