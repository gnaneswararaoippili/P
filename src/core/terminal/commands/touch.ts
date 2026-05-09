import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const touchCommand: TerminalCommand = {
  name: 'touch',
  description: 'Change file timestamps or create empty files.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    if (args.length === 0) {
      throw new Error('missing file operand');
    }

    const targetPath = args[0];
    await context.fs.touch(targetPath, context.cwd);
    
    return { output: '' };
  },
};
