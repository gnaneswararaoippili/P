import { osEvents } from '../events/EventBus';

import { SettingsManager } from '../settings/SettingsManager';

export type ClipboardAction = 'copy' | 'cut';

export interface ClipboardState {
  id: string;
  action: ClipboardAction;
  paths: string[];
  timestamp: number;
}

class ClipboardManagerImpl {
  private history: ClipboardState[] = [];
  
  constructor() {
    osEvents.on('settings:loaded', () => {
      this.loadHistory();
    });
    // Try immediate load if settings are already loaded
    this.loadHistory();
  }

  private loadHistory() {
    const saved = SettingsManager.get('clipboard.history');
    if (saved && Array.isArray(saved)) {
      this.history = saved;
      if (this.history.length > 0) {
        osEvents.emit('clipboard:changed', this.history[0]);
      }
    }
  }

  private saveHistory() {
    SettingsManager.set('clipboard.history', this.history);
  }

  public setClipboard(action: ClipboardAction, paths: string[]) {
    const entry: ClipboardState = {
      id: crypto.randomUUID(),
      action,
      paths,
      timestamp: Date.now()
    };
    
    // Add to top of history
    this.history.unshift(entry);
    
    // Keep max 20 entries
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }
    
    this.saveHistory();
    osEvents.emit('clipboard:changed', entry);
  }

  public getClipboard(): ClipboardState | null {
    return this.history.length > 0 ? this.history[0] : null;
  }
  
  public getHistory(): ClipboardState[] {
    return [...this.history];
  }

  public clear() {
    this.history = [];
    this.saveHistory();
    osEvents.emit('clipboard:changed', null);
  }
}

export const ClipboardManager = new ClipboardManagerImpl();
