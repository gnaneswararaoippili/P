import { osEvents } from '../events/EventBus';

export interface SystemSettings {
  'system.theme': 'light' | 'dark';
  'system.wallpaper': string;
  [key: string]: any;
}

const DEFAULT_SETTINGS: SystemSettings = {
  'system.theme': 'dark',
  'system.wallpaper': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
};

class SettingsManagerImpl {
  private settings: SystemSettings;
  private isInitialized = false;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      const stored = localStorage.getItem('webos-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn("Failed to load settings synchronously:", err);
    }
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      const stored = localStorage.getItem('webos-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (err) {
      console.warn("Failed to load settings from localStorage:", err);
    }
    
    this.isInitialized = true;
    osEvents.emit('settings:loaded', this.settings);
  }

  get<K extends keyof SystemSettings>(key: K): SystemSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    this.settings[key] = value;
    this._persist();
    osEvents.emit('settings:changed', { key, value });
  }

  getAll() {
    return { ...this.settings };
  }

  private _persist() {
    try {
      localStorage.setItem('webos-settings', JSON.stringify(this.settings));
    } catch (err) {
      console.warn("Failed to persist settings:", err);
    }
  }
}

export const SettingsManager = new SettingsManagerImpl();
