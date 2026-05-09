import type { TerminalCommand, TerminalContext } from '../types';

export const mvCommand: TerminalCommand = {
  name: 'mv',
  description: 'Move (rename) files.',
  execute: async (args: string[], context: TerminalContext) => {
    const targets = args.filter((arg) => !arg.startsWith('-'));

    if (targets.length < 2) {
      return { output: 'mv: missing file operand', isError: true };
    }

    const dest = targets.pop()!;
    let errorOutput = '';

    for (const src of targets) {
      try {
        await context.fs.mv(src, dest, context.cwd);
      } catch (err: any) {
        errorOutput += `mv: cannot move '${src}' to '${dest}': ${err.message}\n`;
      }
    }

    if (errorOutput) {
      return { output: errorOutput.trimEnd(), isError: true };
    }

    return { output: '' };
  },
};
