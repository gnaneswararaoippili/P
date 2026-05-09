import React from 'react';

export type AppCategory = 'system' | 'utilities' | 'development' | 'other';

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  icon: React.ReactNode;
  defaultArgs?: Record<string, any>;
  showOnDesktop?: boolean;
}

class Registry {
  private apps: Map<string, AppDefinition> = new Map();

  public register(app: AppDefinition) {
    if (this.apps.has(app.id)) {
      console.warn(`App with ID ${app.id} is already registered. Overwriting.`);
    }
    this.apps.set(app.id, app);
  }

  public getApp(id: string): AppDefinition | undefined {
    return this.apps.get(id);
  }

  public getAllApps(): AppDefinition[] {
    return Array.from(this.apps.values());
  }

  public getAppsByCategory(category: AppCategory): AppDefinition[] {
    return this.getAllApps().filter(app => app.category === category);
  }

  public getAppForFile(filename: string): AppDefinition | undefined {
    // Basic file association logic
    let appId = 'editor'; // Default fallback
    if (filename.endsWith('.txt') || filename.endsWith('.md') || filename.endsWith('.json')) {
      appId = 'editor';
    }
    return this.getApp(appId);
  }
}

export const AppRegistry = new Registry();
