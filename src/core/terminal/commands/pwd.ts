import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const pwdCommand: TerminalCommand = {
  name: 'pwd',
  description: 'Print working directory.',
  execute: async (_args: string[], context: TerminalContext): Promise<CommandResult> => {
    return {
      output: context.cwd,
    };
  },
};
