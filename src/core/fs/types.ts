export type NodeType = 'file' | 'directory';

export interface BaseNode {
  id: string;
  name: string;
  type: NodeType;
  size: number;
  createdAt: number;
  updatedAt: number;
  parent: DirectoryNode | null;
}

export interface FileNode extends BaseNode {
  type: 'file';
  content: string;
}

export interface DirectoryNode extends BaseNode {
  type: 'directory';
  children: Map<string, VFSNode>;
}

export type VFSNode = FileNode | DirectoryNode;
