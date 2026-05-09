import type { TerminalCommand, TerminalContext } from '../types';
import { AppRegistry } from '../../registry/AppRegistry';

export const appsCommand: TerminalCommand = {
  name: 'apps',
  description: 'List all installed applications available in the AppRegistry.',
  execute: async (_args: string[], _ctx: TerminalContext) => {
    const apps = AppRegistry.getAllApps();

    if (apps.length === 0) {
      return { output: 'No applications installed.' };
    }

    // Header
    let output = 'APP ID'.padEnd(15) + 'CATEGORY'.padEnd(15) + 'NAME\n';
    output += '------'.padEnd(15) + '--------'.padEnd(15) + '----\n';

    // Rows
    apps.forEach((app) => {
      output += app.id.padEnd(15) + app.category.padEnd(15) + app.name + '\n';
    });

    return { output: output.trimEnd() };
  },
};
