import type { DirectoryNode, FileNode, VFSNode } from './types';
import { resolveNode, resolveParentNode } from './pathUtils';
import type { StorageAdapter } from './storage/types';
import { IndexedDBAdapter } from './storage/IndexedDBAdapter';
import { serializeVFS, deserializeVFS } from './storage/serializer';
import { osEvents } from '../events/EventBus';
import { NotificationManager } from '../notifications/NotificationManager';
import { OperationJournal } from './OperationJournal';

// Helper to generate IDs. In a real app, this might be a more robust UUID generator.
const generateId = () => crypto.randomUUID();

export class FileSystem {
  private root: DirectoryNode;
  private adapter: StorageAdapter;
  private saveTimeout: number | null = null;
  public isInitialized = false;

  constructor(adapter: StorageAdapter = new IndexedDBAdapter()) {
    this.adapter = adapter;
    
    const now = Date.now();
    this.root = {
      id: generateId(),
      name: '/',
      type: 'directory',
      size: 0,
      createdAt: now,
      updatedAt: now,
      parent: null,
      children: new Map(),
    };
  }

  /**
   * Initializes the FileSystem by loading from storage.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const data = await this.adapter.load();
      if (data && data.nodes && data.nodes.length > 0) {
        this.root = deserializeVFS(data);
        
        // Ensure .trash exists for legacy users
        if (!this.root.children.has('.trash')) {
          this._mkdirSync('.trash', this.root);
        }
      } else {
        // Seed default filesystem on first run
        this._mkdirSync('home', this.root);
        this._mkdirSync('.trash', this.root);
        const homeDir = this._resolveSync('/home', '/');
        if (homeDir.type === 'directory') {
          this._mkdirSync('guest', homeDir);
          this._mkdirSync('desktop', homeDir);
          
          const guestDir = this._resolveSync('/home/guest', '/');
          if (guestDir.type === 'directory') {
            this._mkdirSync('documents', guestDir);
            this._mkdirSync('pictures', guestDir);
          }
        }
      }
      
      // Ensure /home/desktop always exists even if loaded from older IDB state
      try {
        this._resolveSync('/home/desktop', '/');
      } catch (e) {
        let homeDir;
        try {
          homeDir = this._resolveSync('/home', '/');
        } catch {
          this._mkdirSync('home', this.root);
          homeDir = this._resolveSync('/home', '/');
        }
        if (homeDir.type === 'directory') {
          this._mkdirSync('desktop', homeDir);
        }
      }

      // Ensure /.trash exists
      try {
        this._resolveSync('/.trash', '/');
      } catch {
        this._mkdirSync('.trash', this.root);
      }

      // Ensure /home/guest/documents and pictures exist
      try {
        const guestDir = this._resolveSync('/home/guest', '/');
        if (guestDir.type === 'directory') {
          if (!guestDir.children.has('documents')) this._mkdirSync('documents', guestDir);
          if (!guestDir.children.has('pictures')) this._mkdirSync('pictures', guestDir);
        }
      } catch {
        // guest doesn't exist? should be fine
      }
      
      await this._triggerSave();
    } catch (err) {
      console.error("Failed to load VFS from storage, falling back to empty state.", err);
      // Seed default on failure
      this._mkdirSync('home', this.root);
      const homeDir = this._resolveSync('/home', '/');
      if (homeDir.type === 'directory') {
        this._mkdirSync('guest', homeDir);
        this._mkdirSync('desktop', homeDir);
        
        const guestDir = this._resolveSync('/home/guest', '/');
        if (guestDir.type === 'directory') {
          this._mkdirSync('documents', guestDir);
          this._mkdirSync('pictures', guestDir);
        }
      }
      await this._triggerSave();
    }
    
    this.isInitialized = true;
  }

  /**
   * Helper to reconstruct the absolute string path of a given node
   */
  private _getNodePath(node: VFSNode): string {
    if (!node.parent) return '/';
    const parts: string[] = [];
    let current: VFSNode | null = node;
    while (current && current.parent) {
      parts.unshift(current.name);
      current = current.parent;
    }
    return '/' + parts.join('/');
  }

  /**
   * Debounces serialization and saving to IndexedDB to avoid excessive disk I/O.
   */
  private async _triggerSave() {
    if (this.saveTimeout !== null) {
      window.clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(async () => {
      try {
        const serialized = serializeVFS(this.root);
        await this.adapter.save(serialized);
      } catch (err) {
        console.error("Failed to save VFS state:", err);
      }
    }, 500); // 500ms debounce
  }

  // --- Internal synchronous helpers for initial seeding ---
  private _resolveSync(path: string, cwd: string): VFSNode {
    return resolveNode(path, cwd, this.root);
  }

  private _mkdirSync(name: string, parent: DirectoryNode) {
    const cleanName = name.replace(/^\//, '');
    if (parent.children.has(cleanName)) return;
    
    const now = Date.now();
    const newDir: DirectoryNode = {
      id: generateId(),
      name: cleanName,
      type: 'directory',
      size: 0,
      createdAt: now,
      updatedAt: now,
      parent,
      children: new Map(),
    };
    parent.children.set(cleanName, newDir);
  }

  // --- Public Async API (Prepared for future persistence) ---
  
  async resolvePath(path: string, cwd: string): Promise<VFSNode> {
    return resolveNode(path, cwd, this.root);
  }

  async readDir(path: string, cwd: string): Promise<VFSNode[]> {
    const node = await this.resolvePath(path, cwd);
    if (node.type !== 'directory') {
      throw new Error(`Not a directory: ${path}`);
    }
    return Array.from(node.children.values());
  }

  async readFile(path: string, cwd: string): Promise<string> {
    const node = await this.resolvePath(path, cwd);
    if (node.type !== 'file') {
      throw new Error(`Not a file: ${path}`);
    }
    return node.content;
  }

  async mkdir(path: string, cwd: string): Promise<void> {
    const { parent, targetName } = resolveParentNode(path, cwd, this.root);
    
    if (parent.children.has(targetName)) {
      throw new Error(`File or directory already exists: ${targetName}`);
    }

    const now = Date.now();
    const newDir: DirectoryNode = {
      id: generateId(),
      name: targetName,
      type: 'directory',
      size: 0,
      createdAt: now,
      updatedAt: now,
      parent,
      children: new Map(),
    };

    parent.children.set(targetName, newDir);
    parent.updatedAt = now;
    
    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(parent) });
    
    OperationJournal.log({
      type: 'create',
      targetPaths: [this._getNodePath(newDir)]
    });
  }

  async touch(path: string, cwd: string): Promise<void> {
    const { parent, targetName } = resolveParentNode(path, cwd, this.root);

    if (parent.children.has(targetName)) {
      const existing = parent.children.get(targetName)!;
      existing.updatedAt = Date.now();
      this._triggerSave();
      osEvents.emit('vfs:changed', { path: this._getNodePath(parent) });
      return;
    }

    const now = Date.now();
    const newFile: FileNode = {
      id: generateId(),
      name: targetName,
      type: 'file',
      size: 0,
      content: '',
      createdAt: now,
      updatedAt: now,
      parent,
    };

    parent.children.set(targetName, newFile);
    parent.updatedAt = now;
    
    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(parent) });
  }

  async writeFile(path: string, content: string, cwd: string): Promise<void> {
    const { parent, targetName } = resolveParentNode(path, cwd, this.root);

    let fileNode = parent.children.get(targetName);

    if (fileNode) {
      if (fileNode.type !== 'file') {
        throw new Error(`Cannot write to a directory: ${targetName}`);
      }
      fileNode.content = content;
      fileNode.size = content.length; // Basic size simulation
      fileNode.updatedAt = Date.now();
    } else {
      const now = Date.now();
      const newFile: FileNode = {
        id: generateId(),
        name: targetName,
        type: 'file',
        size: content.length,
        content,
        createdAt: now,
        updatedAt: now,
        parent,
      };
      parent.children.set(targetName, newFile);
    }
    
    parent.updatedAt = Date.now();
    
    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(parent) });
    
    if (!fileNode) {
      OperationJournal.log({
        type: 'create',
        targetPaths: [this._getNodePath(parent.children.get(targetName)!)]
      });
    }
  }

  async rm(path: string, cwd: string, recursive: boolean = false, hardDelete: boolean = false, skipJournal: boolean = false): Promise<void> {
    const { parent, targetName } = resolveParentNode(path, cwd, this.root);
    
    if (targetName === '' || targetName === '/') {
      const err = new Error("Cannot remove root directory");
      NotificationManager.error('FileSystem Error', err.message);
      throw err;
    }

    const targetNode = parent.children.get(targetName);
    if (!targetNode) {
      const err = new Error(`No such file or directory: ${targetName}`);
      NotificationManager.error('FileSystem Error', err.message);
      throw err;
    }

    if (targetNode.type === 'directory') {
      if (!recursive) {
        const err = new Error(`Is a directory: ${targetName}`);
        NotificationManager.error('FileSystem Error', err.message);
        throw err;
      }
    }

    const sourcePath = this._getNodePath(targetNode);

    if (!hardDelete && !sourcePath.startsWith('/.trash')) {
      // Soft Delete: Move to /.trash
      const trashName = `${targetNode.id}-${targetName}`;
      await this.mv(sourcePath, `/.trash/${trashName}`, '/', true);
      
      if (!skipJournal) {
        OperationJournal.log({
          type: 'delete',
          sourcePaths: [sourcePath],
          destPaths: [`/.trash/${trashName}`]
        });
      }
      return;
    }

    // Hard Delete
    parent.children.delete(targetName);
    parent.updatedAt = Date.now();

    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(parent) });
    
    if (!skipJournal && hardDelete) {
      OperationJournal.log({
        type: 'delete',
        sourcePaths: [sourcePath]
      });
    }
  }

  private _cloneNode(node: VFSNode, newParent: DirectoryNode | null, newName: string): VFSNode {
    const now = Date.now();
    if (node.type === 'file') {
      return {
        ...node,
        id: generateId(),
        name: newName,
        parent: newParent,
        createdAt: now,
        updatedAt: now,
      } as FileNode;
    } else {
      const clonedDir: DirectoryNode = {
        ...node,
        id: generateId(),
        name: newName,
        parent: newParent,
        createdAt: now,
        updatedAt: now,
        children: new Map(),
      };
      
      for (const [childName, childNode] of node.children.entries()) {
        clonedDir.children.set(childName, this._cloneNode(childNode, clonedDir, childName));
      }
      return clonedDir;
    }
  }

  async cp(srcPath: string, destPath: string, cwd: string, recursive: boolean = false, skipJournal: boolean = false, autoRename: boolean = false): Promise<void> {
    const srcNode = await this.resolvePath(srcPath, cwd);
    
    if (srcNode.type === 'directory' && !recursive) {
      throw new Error(`omitting directory: ${srcNode.name}`);
    }

    const destParentInfo = resolveParentNode(destPath, cwd, this.root);
    let targetParent = destParentInfo.parent;
    let targetName = destParentInfo.targetName;

    // If destination exists and is a directory, copy INTO it
    const existingDest = targetParent.children.get(targetName);
    if (existingDest) {
      if (existingDest.type === 'directory') {
        targetParent = existingDest;
        targetName = srcNode.name;
      } else {
        // We will overwrite the file unless autoRename is true
      }
    }

    if (autoRename) {
      let counter = 1;
      const parts = targetName.split('.');
      const ext = srcNode.type === 'file' && parts.length > 1 ? `.${parts.pop()}` : '';
      const base = parts.join('.');
      
      while (targetParent.children.has(targetName)) {
        targetName = `${base} (${counter})${ext}`;
        counter++;
      }
    }

    if (!autoRename && targetParent.children.has(targetName) && targetParent.children.get(targetName)?.type === 'directory') {
       throw new Error(`Cannot overwrite directory: ${targetName}`);
    }

    const cloned = this._cloneNode(srcNode, targetParent, targetName);
    targetParent.children.set(targetName, cloned);
    targetParent.updatedAt = Date.now();

    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(targetParent) });
    
    if (!skipJournal) {
      OperationJournal.log({
        type: 'copy',
        sourcePaths: [this._getNodePath(srcNode)],
        destPaths: [this._getNodePath(cloned)]
      });
    }
    
    NotificationManager.success('Copy Successful', `Copied to ${destPath}`);
  }

  async mv(srcPath: string, destPath: string, cwd: string, skipJournal: boolean = false, autoRename: boolean = false): Promise<void> {
    const srcParentInfo = resolveParentNode(srcPath, cwd, this.root);
    const destParentInfo = resolveParentNode(destPath, cwd, this.root);
    
    const srcNode = srcParentInfo.parent.children.get(srcParentInfo.targetName);
    if (!srcNode) {
      throw new Error(`No such file or directory: ${srcParentInfo.targetName}`);
    }

    let targetParent = destParentInfo.parent;
    let targetName = destParentInfo.targetName;

    const existingDest = targetParent.children.get(targetName);
    if (existingDest) {
      if (existingDest.type === 'directory') {
        targetParent = existingDest;
        targetName = srcNode.name;
      } else if (srcNode.type === 'directory') {
        throw new Error(`Cannot overwrite non-directory with directory: ${targetName}`);
      }
    }

    // Detach
    srcParentInfo.parent.children.delete(srcParentInfo.targetName);
    srcParentInfo.parent.updatedAt = Date.now();

    if (autoRename) {
      let counter = 1;
      const parts = targetName.split('.');
      const ext = srcNode.type === 'file' && parts.length > 1 ? `.${parts.pop()}` : '';
      const base = parts.join('.');
      
      while (targetParent.children.has(targetName)) {
        targetName = `${base} (${counter})${ext}`;
        counter++;
      }
    }

    // Reattach
    srcNode.name = targetName;
    srcNode.parent = targetParent;
    targetParent.children.set(targetName, srcNode);
    targetParent.updatedAt = Date.now();

    this._triggerSave();
    osEvents.emit('vfs:changed', { path: this._getNodePath(srcParentInfo.parent) });
    if (srcParentInfo.parent !== targetParent) {
      osEvents.emit('vfs:changed', { path: this._getNodePath(targetParent) });
    }
    
    if (!skipJournal) {
      OperationJournal.log({
        type: 'move',
        sourcePaths: [this._getNodePath({ ...srcNode, name: srcParentInfo.targetName, parent: srcParentInfo.parent })],
        destPaths: [this._getNodePath(srcNode)]
      });
    }
  }
}

// Export singleton instance
export const vfs = new FileSystem();
