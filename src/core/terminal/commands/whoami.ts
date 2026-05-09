import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const whoamiCommand: TerminalCommand = {
  name: 'whoami',
  description: 'Prints the effective username of the current user.',
  execute: async (_args: string[], context: TerminalContext): Promise<CommandResult> => {
    return {
      output: context.username,
    };
  },
};
