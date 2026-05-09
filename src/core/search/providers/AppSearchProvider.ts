import { calculateScore } from '../SearchManager';
import type { SearchProvider, SearchResult } from '../SearchManager';
import { AppRegistry } from '../../registry/AppRegistry';

export const AppSearchProvider: SearchProvider = {
  name: 'apps',
  query: async (term: string): Promise<SearchResult[]> => {
    const apps = AppRegistry.getAllApps();
    const results: SearchResult[] = [];

    for (const app of apps) {
      const scoreName = calculateScore(app.name, term);
      const scoreId = calculateScore(app.id, term);
      const score = Math.max(scoreName, scoreId);

      if (score > 0) {
        results.push({
          id: `app-${app.id}`,
          title: app.name,
          subtitle: 'Application',
          type: 'app',
          icon: app.icon,
          score,
          launchConfig: {
            appId: app.id,
            appName: app.name,
          }
        });
      }
    }

    return results;
  }
};
