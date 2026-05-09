import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const catCommand: TerminalCommand = {
  name: 'cat',
  description: 'Concatenate files and print on the standard output.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    if (args.length === 0) {
      throw new Error('missing file operand');
    }

    const targetPath = args[0];
    const content = await context.fs.readFile(targetPath, context.cwd);
    
    return { output: content };
  },
};
