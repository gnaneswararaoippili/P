import type { TerminalCommand, TerminalContext } from '../types';

export const cpCommand: TerminalCommand = {
  name: 'cp',
  description: 'Copy files and directories.',
  execute: async (args: string[], context: TerminalContext) => {
    if (args.length < 2) {
      return { output: 'cp: missing file operand', isError: true };
    }

    const recursive = args.includes('-r') || args.includes('-R');
    const targets = args.filter((arg) => !arg.startsWith('-'));

    if (targets.length < 2) {
      return { output: 'cp: missing destination file operand', isError: true };
    }

    const dest = targets.pop()!;
    let errorOutput = '';

    for (const src of targets) {
      try {
        await context.fs.cp(src, dest, context.cwd, recursive);
      } catch (err: any) {
        errorOutput += `cp: cannot copy '${src}' to '${dest}': ${err.message}\n`;
      }
    }

    if (errorOutput) {
      return { output: errorOutput.trimEnd(), isError: true };
    }

    return { output: '' };
  },
};
