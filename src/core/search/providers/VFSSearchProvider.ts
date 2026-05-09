import { calculateScore } from '../SearchManager';
import type { SearchProvider, SearchResult } from '../SearchManager';
import { vfs } from '../../fs/FileSystem';
import { osEvents } from '../../events/EventBus';
import type { VFSNode } from '../../fs/types';

interface IndexEntry {
  path: string;
  name: string;
  type: 'file' | 'directory';
}

class VFSProviderImpl implements SearchProvider {
  name = 'vfs';
  private index: IndexEntry[] = [];
  private isIndexing = false;

  async init() {
    await this.rebuildIndex();
    
    osEvents.on('vfs:changed', () => {
      this.rebuildIndex();
    });
  }

  private async walk(node: VFSNode, currentPath: string) {
    const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
    
    if (node.name !== '/') {
      this.index.push({
        path: fullPath,
        name: node.name,
        type: node.type,
      });
    }

    if (node.type === 'directory') {
      for (const child of node.children.values()) {
        await this.walk(child, fullPath);
      }
    }
  }

  private async rebuildIndex() {
    if (this.isIndexing) return;
    this.isIndexing = true;
    
    try {
      this.index = [];
      const root = await vfs.resolvePath('/', '/');
      await this.walk(root, '');
    } catch (err) {
      console.warn("VFSSearchProvider failed to rebuild index:", err);
    } finally {
      this.isIndexing = false;
    }
  }

  async query(term: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const entry of this.index) {
      const score = calculateScore(entry.name, term);
      if (score > 0) {
        results.push({
          id: `vfs-${entry.path}`,
          title: entry.name,
          subtitle: entry.path,
          type: 'file',
          score: score - 10,
          launchConfig: entry.type === 'directory' 
            ? { appId: 'explorer', appName: 'File Explorer', args: { targetPath: entry.path } }
            : { appId: 'editor', appName: `Editor - ${entry.name}`, args: { filePath: entry.path } }
        });
      }
    }

    return results;
  }
}

export const VFSSearchProvider = new VFSProviderImpl();
