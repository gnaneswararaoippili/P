import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const mkdirCommand: TerminalCommand = {
  name: 'mkdir',
  description: 'Make directories.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    if (args.length === 0) {
      throw new Error('missing operand');
    }

    const targetPath = args[0];
    await context.fs.mkdir(targetPath, context.cwd);
    
    return { output: '' };
  },
};
