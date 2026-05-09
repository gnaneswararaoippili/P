import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const dateCommand: TerminalCommand = {
  name: 'date',
  description: 'Prints the current system date and time.',
  execute: async (_args: string[], _context: TerminalContext): Promise<CommandResult> => {
    const now = new Date();
    return {
      output: now.toString(),
    };
  },
};
