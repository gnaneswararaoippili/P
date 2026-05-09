import type { TerminalCommand, TerminalContext } from '../types';
import { AppRegistry } from '../../registry/AppRegistry';

function resolvePathString(path: string, cwd: string): string {
  if (path.startsWith('/')) {
    return path;
  }
  const parts = cwd.split('/').filter(Boolean);
  const newParts = path.split('/').filter(Boolean);
  for (const part of newParts) {
    if (part === '.') continue;
    if (part === '..') {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return '/' + parts.join('/');
}

export const openCommand: TerminalCommand = {
  name: 'open',
  description: 'Launch an application by its App ID.',
  usage: 'open <appId> [args...]',
  execute: async (args: string[], ctx: TerminalContext) => {
    if (args.length === 0) {
      return { output: 'open: missing operand\nusage: open <appId> [args...]', error: true };
    }

    const appId = args[0];
    const app = AppRegistry.getApp(appId);

    if (!app) {
      return { output: `open: application not found in registry: ${appId}`, error: true };
    }

    // Parse subsequent arguments (if any) as a payload. 
    // In the future, this can be expanded to parse flags.
    let payloadArgs: Record<string, any> = { ...app.defaultArgs };
    
    // For now, if there are additional string args, we can pass them as a raw array 
    // or string to the process, depending on how the application expects it.
    // e.g., open editor /path/to/file.txt
    if (args.length > 1) {
      payloadArgs.cliArgs = args.slice(1);
      
      // Specifically for the editor, map the first cli arg to the filePath and resolve it
      if (appId === 'editor') {
        payloadArgs.filePath = resolvePathString(args[1], ctx.cwd);
      }
    }

    // Spawn the process
    ctx.openProcess(app.id, app.name, payloadArgs);

    return { output: `[Process spawned: ${app.name}]` };
  },
};
