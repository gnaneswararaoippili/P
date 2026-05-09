import type { TerminalCommand, TerminalContext } from '../types';

export const killCommand: TerminalCommand = {
  name: 'kill',
  description: 'Send a signal to a process, terminating it.',
  usage: 'kill <pid>',
  execute: async (args: string[], ctx: TerminalContext) => {
    if (args.length === 0) {
      return { output: 'kill: usage: kill <pid>', error: true };
    }

    const targetPid = args[0];

    // Prevent killing the terminal itself to avoid weird UX issues
    if (ctx.terminalPid && targetPid === ctx.terminalPid) {
      return { output: `kill: cannot kill the active terminal session (PID: ${targetPid})`, error: true };
    }

    const processExists = ctx.processes.some(p => p.id === targetPid);
    if (!processExists) {
      return { output: `kill: no such process: ${targetPid}`, error: true };
    }

    ctx.killProcess(targetPid);

    return { output: `[${targetPid}] Terminated` };
  },
};
