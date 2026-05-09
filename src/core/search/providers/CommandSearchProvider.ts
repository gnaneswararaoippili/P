import { calculateScore } from '../SearchManager';
import type { SearchProvider, SearchResult } from '../SearchManager';
import { registry } from '../../terminal/registry';

export const CommandSearchProvider: SearchProvider = {
  name: 'commands',
  query: async (term: string): Promise<SearchResult[]> => {
    const commands = registry.getAllCommands();
    const results: SearchResult[] = [];

    for (const cmd of commands) {
      const score = calculateScore(cmd.name, term);

      if (score > 0) {
        results.push({
          id: `cmd-${cmd.name}`,
          title: cmd.name,
          subtitle: `Command: ${cmd.description}`,
          type: 'command',
          score: score - 5,
          launchConfig: {
            appId: 'terminal',
            appName: 'Terminal',
            args: { initialCommand: cmd.name }
          }
        });
      }
    }

    return results;
  }
};
