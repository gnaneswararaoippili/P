import { osEvents } from '../events/EventBus';

export interface Workspace {
  id: string;
  name: string;
  wallpaper?: string;
}

class WorkspaceManagerImpl {
  private workspaces: Workspace[] = [];
  private activeWorkspaceId: string = 'default';

  constructor() {
    this.loadState();
  }

  private saveState() {
    try {
      localStorage.setItem('webos_workspaces', JSON.stringify(this.workspaces));
      localStorage.setItem('webos_active_workspace', this.activeWorkspaceId);
    } catch (e) {
      console.error('Failed to save workspaces', e);
    }
  }

  private loadState() {
    try {
      const savedWorkspaces = localStorage.getItem('webos_workspaces');
      const savedActiveId = localStorage.getItem('webos_active_workspace');
      
      if (savedWorkspaces) {
        this.workspaces = JSON.parse(savedWorkspaces);
      } else {
        this.workspaces = [{ id: 'default', name: 'Desktop 1' }];
      }
      
      if (savedActiveId && this.workspaces.find(w => w.id === savedActiveId)) {
        this.activeWorkspaceId = savedActiveId;
      } else {
        this.activeWorkspaceId = 'default';
      }
    } catch (e) {
      this.workspaces = [{ id: 'default', name: 'Desktop 1' }];
      this.activeWorkspaceId = 'default';
    }
  }

  public getWorkspaces(): Workspace[] {
    return [...this.workspaces];
  }

  public getActiveWorkspaceId(): string {
    return this.activeWorkspaceId;
  }

  public getActiveWorkspace(): Workspace | undefined {
    return this.workspaces.find(w => w.id === this.activeWorkspaceId);
  }

  public getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.find(w => w.id === id);
  }

  public createWorkspace(name?: string): Workspace {
    const id = `workspace-${Date.now()}`;
    const newWorkspace: Workspace = {
      id,
      name: name || `Desktop ${this.workspaces.length + 1}`
    };
    this.workspaces.push(newWorkspace);
    this.saveState();
    osEvents.emit('workspace:created', newWorkspace);
    osEvents.emit('workspace:changed', { workspaces: this.getWorkspaces() });
    return newWorkspace;
  }

  public removeWorkspace(id: string) {
    if (id === 'default') {
      console.warn("Cannot remove default workspace.");
      return;
    }
    
    this.workspaces = this.workspaces.filter(w => w.id !== id);
    
    if (this.activeWorkspaceId === id) {
      this.switchWorkspace('default');
    }
    
    this.saveState();
    osEvents.emit('workspace:removed', { id });
    osEvents.emit('workspace:changed', { workspaces: this.getWorkspaces() });
  }

  public switchWorkspace(id: string) {
    const workspace = this.workspaces.find(w => w.id === id);
    if (!workspace) return;
    
    const prevId = this.activeWorkspaceId;
    if (prevId === id) return;

    this.activeWorkspaceId = id;
    this.saveState();
    osEvents.emit('workspace:activeChanged', { id, prevId });
  }
}

export const WorkspaceManager = new WorkspaceManagerImpl();
