import { osEvents } from '../events/EventBus';
import { SettingsManager } from '../settings/SettingsManager';
import { Home, Monitor, Trash2, Star, Clock, HardDrive, LayoutGrid } from 'lucide-react';
import React from 'react';

export type SidebarItemType = 'favorite' | 'mount' | 'recent' | 'system';

export interface SidebarItem {
  id: string;
  label: string;
  iconName: string; // Since we can't easily serialize React nodes, we store string identifiers
  targetPath: string;
  type: SidebarItemType;
  isVirtual?: boolean;
}

class SidebarManagerImpl {
  private favorites: SidebarItem[] = [];
  private recents: string[] = []; // Store paths
  
  // Hardcoded Mounts & System Paths for now
  private mounts: SidebarItem[] = [
    { id: 'mount-root', label: 'Local Disk', iconName: 'harddrive', targetPath: '/', type: 'mount' }
  ];
  
  private system: SidebarItem[] = [
    { id: 'sys-home', label: 'Home', iconName: 'home', targetPath: '/home/guest', type: 'system' },
    { id: 'sys-desktop', label: 'Desktop', iconName: 'desktop', targetPath: '/home/desktop', type: 'system' },
    { id: 'sys-trash', label: 'Trash', iconName: 'trash', targetPath: '/.trash', type: 'system' }
  ];

  constructor() {
    osEvents.on('settings:loaded', () => {
      this.loadState();
    });
    this.loadState();
  }

  private loadState() {
    const savedFavs = SettingsManager.get('sidebar.favorites');
    if (savedFavs && Array.isArray(savedFavs)) {
      this.favorites = savedFavs;
    } else {
      // Default favorites
      this.favorites = [
        { id: 'fav-docs', label: 'Documents', iconName: 'folder-star', targetPath: '/home/guest/documents', type: 'favorite' },
        { id: 'fav-pics', label: 'Pictures', iconName: 'folder-star', targetPath: '/home/guest/pictures', type: 'favorite' }
      ];
      this.saveState();
    }

    const savedRecents = SettingsManager.get('sidebar.recents');
    if (savedRecents && Array.isArray(savedRecents)) {
      this.recents = savedRecents;
    }
    
    this.emitUpdate();
  }

  private saveState() {
    SettingsManager.set('sidebar.favorites', this.favorites);
    SettingsManager.set('sidebar.recents', this.recents);
  }

  private emitUpdate() {
    osEvents.emit('sidebar:updated', {
      favorites: this.favorites,
      mounts: this.mounts,
      system: this.system,
      recents: this.getRecentItems()
    });
  }

  // --- Favorites API ---
  
  public addFavorite(label: string, targetPath: string, iconName: string = 'folder-star') {
    // Avoid duplicates
    if (this.favorites.find(f => f.targetPath === targetPath)) return;
    
    this.favorites.push({
      id: `fav-${crypto.randomUUID()}`,
      label,
      iconName,
      targetPath,
      type: 'favorite'
    });
    this.saveState();
    this.emitUpdate();
  }

  public removeFavorite(id: string) {
    this.favorites = this.favorites.filter(f => f.id !== id);
    this.saveState();
    this.emitUpdate();
  }
  
  public reorderFavorites(newFavorites: SidebarItem[]) {
    this.favorites = newFavorites;
    this.saveState();
    this.emitUpdate();
  }

  // --- Recents API ---

  public logVisit(path: string) {
    if (path === '/' || path.startsWith('/.trash')) return; // Ignore root and trash
    
    // Remove if exists to move to top
    this.recents = this.recents.filter(p => p !== path);
    this.recents.unshift(path);
    
    if (this.recents.length > 10) {
      this.recents = this.recents.slice(0, 10);
    }
    
    this.saveState();
    this.emitUpdate();
  }

  public removeRecent(path: string) {
    this.recents = this.recents.filter(p => p !== path);
    this.saveState();
    this.emitUpdate();
  }

  public clearRecents() {
    this.recents = [];
    this.saveState();
    this.emitUpdate();
  }

  public getRecentItems(): SidebarItem[] {
    return this.recents.map((path, idx) => {
      const name = path.split('/').pop() || path;
      return {
        id: `recent-${idx}`,
        label: name,
        iconName: 'clock',
        targetPath: path,
        type: 'recent'
      };
    });
  }

  // --- Getters ---
  
  public getFavorites() { return this.favorites; }
  public getMounts() { return this.mounts; }
  public getSystem() { return this.system; }
}

export const SidebarManager = new SidebarManagerImpl();

// Helper to map string identifiers to Lucide React icons
export const getSidebarIcon = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'home': return <Home className="w-4 h-4" />;
    case 'desktop': return <Monitor className="w-4 h-4" />;
    case 'trash': return <Trash2 className="w-4 h-4" />;
    case 'folder-star': return <Star className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'harddrive': return <HardDrive className="w-4 h-4" />;
    case 'layout-grid': return <LayoutGrid className="w-4 h-4" />;
    default: return <Star className="w-4 h-4" />;
  }
};
