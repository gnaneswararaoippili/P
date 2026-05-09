import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const echoCommand: TerminalCommand = {
  name: 'echo',
  description: 'Prints the given arguments to the terminal.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    // Basic file redirection support hack
    const redirectIndex = args.indexOf('>');
    
    if (redirectIndex !== -1 && redirectIndex < args.length - 1) {
      const content = args.slice(0, redirectIndex).join(' ');
      const filename = args[redirectIndex + 1];
      await context.fs.writeFile(filename, content, context.cwd);
      return { output: '' };
    }

    return {
      output: args.join(' '),
    };
  },
};
