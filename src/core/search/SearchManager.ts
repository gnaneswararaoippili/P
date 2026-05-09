import React from 'react';

export interface LaunchConfig {
  appId: string;
  appName: string;
  args?: Record<string, any>;
  isCommand?: boolean;
  commandString?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'app' | 'file' | 'command' | 'setting';
  icon?: React.ReactNode;
  score?: number;
  launchConfig: LaunchConfig;
}

export interface SearchProvider {
  name: string;
  query: (term: string) => Promise<SearchResult[]>;
  init?: () => Promise<void>;
}

class SearchManagerImpl {
  private providers: SearchProvider[] = [];

  registerProvider(provider: SearchProvider) {
    this.providers.push(provider);
  }

  async initAll() {
    await Promise.all(
      this.providers
        .filter((p) => typeof p.init === 'function')
        .map((p) => p.init!())
    );
  }

  async query(term: string): Promise<SearchResult[]> {
    if (!term.trim()) return [];

    const normalizedTerm = term.toLowerCase().trim();

    const results = await Promise.all(
      this.providers.map(p => p.query(normalizedTerm))
    );

    const flatResults = results.flat();
    
    // Sort by score
    flatResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    return flatResults;
  }
}

export const SearchManager = new SearchManagerImpl();

// Lightweight ranking utility
export const calculateScore = (target: string, term: string): number => {
  const t = target.toLowerCase();
  const q = term.toLowerCase();

  if (t === q) return 100; // Exact match
  if (t.startsWith(q)) return 50 + (q.length / t.length) * 10; // Prefix match
  if (t.includes(q)) return 10 + (q.length / t.length) * 10; // Substring match

  return 0; // No match
};
