import type { TerminalCommand, TerminalContext } from '../types';

export const psCommand: TerminalCommand = {
  name: 'ps',
  description: 'Report a snapshot of the current processes.',
  execute: async (_args: string[], ctx: TerminalContext) => {
    const processes = ctx.processes || [];

    if (processes.length === 0) {
      return { output: 'No processes running.' };
    }

    // Header
    let output = 'PID'.padEnd(15) + 'NAME'.padEnd(20) + 'STATUS\n';
    output += '---'.padEnd(15) + '----'.padEnd(20) + '------\n';

    // Rows
    processes.forEach((p) => {
      const status = p.isFocused ? 'focused' : p.isMinimized ? 'minimized' : 'running';
      output += p.id.padEnd(15) + p.name.padEnd(20) + status + '\n';
    });

    return { output: output.trimEnd() };
  },
};
