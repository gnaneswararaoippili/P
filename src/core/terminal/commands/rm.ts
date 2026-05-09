import type { TerminalCommand, TerminalContext } from '../types';

export const rmCommand: TerminalCommand = {
  name: 'rm',
  description: 'Remove files or directories.',
  execute: async (args: string[], context: TerminalContext) => {
    if (args.length === 0) {
      return { output: 'rm: missing operand', isError: true };
    }

    const recursive = args.includes('-r') || args.includes('-R');
    const targets = args.filter((arg) => !arg.startsWith('-'));

    if (targets.length === 0) {
      return { output: 'rm: missing operand', isError: true };
    }

    let errorOutput = '';

    for (const target of targets) {
      try {
        await context.fs.rm(target, context.cwd, recursive);
      } catch (err: any) {
        errorOutput += `rm: cannot remove '${target}': ${err.message}\n`;
      }
    }

    if (errorOutput) {
      return { output: errorOutput.trimEnd(), isError: true };
    }

    return { output: '' };
  },
};
