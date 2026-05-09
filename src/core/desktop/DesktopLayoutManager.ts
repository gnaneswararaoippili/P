import { SettingsManager } from '../settings/SettingsManager';
import { osEvents } from '../events/EventBus';
import { AppRegistry } from '../registry/AppRegistry';
import { vfs } from '../fs/FileSystem';
export type DesktopAppNode = { id: string; type: 'app'; col: number; row: number; };
export type DesktopVfsNode = { id: string; type: 'vfs'; path: string; isDirectory: boolean; col: number; row: number; };

export type DesktopNode = DesktopAppNode | DesktopVfsNode;

class DesktopLayoutManagerImpl {
  private layout: Record<string, DesktopNode> = {};

  // Default desktop grid: 100px cells
  public readonly GRID_SIZE = 100;

  public async init() {
    this.loadLayout();
    
    // Subscribe to settings changes in case multiple tabs or instances update it
    osEvents.on('settings:changed', (key) => {
      if (key === 'desktop.layout') {
        this.loadLayout();
        osEvents.emit('desktop:layout:changed');
      }
    });

    // Subscribe to VFS changes to sync /home/desktop
    osEvents.on('vfs:changed', async (payload) => {
      if (payload.path === '/home/desktop' || payload.path.startsWith('/home/desktop/')) {
        await this.syncVfs();
      }
    });

    await this.syncVfs();
  }

  private async syncVfs() {
    if (!vfs.isInitialized) return;
    try {
      const nodes = await vfs.readDir('/home/desktop', '/');
      let changed = false;

      // Map current VFS nodes by path
      const vfsPaths = new Set(nodes.map(n => `/home/desktop/${n.name}`));

      // 1. Remove dead links (files in layout that no longer exist in VFS)
      for (const id in this.layout) {
        const node = this.layout[id];
        if (node.type === 'vfs' && !vfsPaths.has(node.path)) {
          delete this.layout[id];
          changed = true;
        }
      }

      // 2. Add orphans (new files in VFS without layout coordinates)
      let nextCol = 0;
      let nextRow = 0;

      // helper to find an empty slot
      const findEmptySlot = () => {
        const MAX_ROWS = 6;
        while (Object.values(this.layout).some(n => n.col === nextCol && n.row === nextRow)) {
          nextRow++;
          if (nextRow >= MAX_ROWS) {
            nextRow = 0;
            nextCol++;
          }
        }
        return { col: nextCol, row: nextRow };
      };

      for (const node of nodes) {
        const path = `/home/desktop/${node.name}`;
        const existingId = Object.keys(this.layout).find(id => this.layout[id].type === 'vfs' && (this.layout[id] as DesktopVfsNode).path === path);
        
        if (!existingId) {
          const slot = findEmptySlot();
          const newId = `vfs-${path}`;
          this.layout[newId] = {
            id: newId,
            type: 'vfs',
            path,
            isDirectory: node.type === 'directory',
            col: slot.col,
            row: slot.row
          };
          changed = true;
        }
      }

      if (changed) {
        SettingsManager.set('desktop.layout', this.layout);
        osEvents.emit('desktop:layout:changed');
      }
    } catch (e) {
      console.warn("Failed to sync /home/desktop layout", e);
    }
  }

  private loadLayout() {
    const savedLayout = SettingsManager.get('desktop.layout');
    
    if (savedLayout && typeof savedLayout === 'object' && Object.keys(savedLayout).length > 0) {
      this.layout = savedLayout as Record<string, DesktopNode>;
    } else {
      // Generate default layout from AppRegistry
      this.generateDefaultLayout();
    }
  }

  private generateDefaultLayout() {
    const desktopApps = AppRegistry.getAllApps().filter(app => app.showOnDesktop !== false);
    this.layout = {};

    let col = 0;
    let row = 0;
    const MAX_ROWS = 6; // Rough estimate, we just stack them down then right

    for (const app of desktopApps) {
      this.layout[app.id] = {
        id: app.id,
        type: 'app',
        col,
        row
      };
      row++;
      if (row >= MAX_ROWS) {
        row = 0;
        col++;
      }
    }

    // Save default layout immediately
    SettingsManager.set('desktop.layout', this.layout);
  }

  public getLayout(): DesktopNode[] {
    return Object.values(this.layout);
  }

  public updatePosition(id: string, col: number, row: number) {
    if (this.layout[id]) {
      this.layout[id].col = Math.max(0, col);
      this.layout[id].row = Math.max(0, row);
      
      // Persist to SettingsManager
      SettingsManager.set('desktop.layout', this.layout);
      osEvents.emit('desktop:layout:changed');
    }
  }
}

export const DesktopLayoutManager = new DesktopLayoutManagerImpl();
