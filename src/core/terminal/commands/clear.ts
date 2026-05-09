import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const clearCommand: TerminalCommand = {
  name: 'clear',
  description: 'Clears the terminal output buffer.',
  execute: async (_args: string[], _context: TerminalContext): Promise<CommandResult> => {
    return {
      output: '',
      clear: true, // Special flag that the Terminal UI will intercept
    };
  },
};
