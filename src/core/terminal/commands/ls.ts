import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const lsCommand: TerminalCommand = {
  name: 'ls',
  description: 'List directory contents.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    const targetPath = args[0] || context.cwd;
    
    const nodes = await context.fs.readDir(targetPath, context.cwd);
    
    if (nodes.length === 0) {
      return { output: '' };
    }

    // Simple formatting: directories in blue, files in default color
    // Since React can render HTML or we just use strings with classes,
    // we'll return a formatted string. For this basic terminal, we return a string
    // but we can return React elements later if needed.
    // For now, let's just return a space separated list.
    // If we want color per item, we might need React nodes.
    // Let's stick to string for simplicity, or simple text.
    
    const output = nodes.map(n => {
      if (n.type === 'directory') {
        return `[DIR]  ${n.name}`;
      }
      return `[FILE] ${n.name}`;
    }).join('\n');

    return { output };
  },
};
