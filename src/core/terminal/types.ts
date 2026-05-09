import type { FileSystem } from '../fs/FileSystem';
import type { Process } from '../../context/ProcessContext';

export interface CommandResult {
  output: string | React.ReactNode;
  isError?: boolean;
  color?: string; // Optional Tailwind color class
  clear?: boolean; // Signal to the UI to clear the screen
}

export interface TerminalContext {
  username: string;
  hostname: string;
  cwd: string;
  setCwd: (path: string) => void;
  fs: FileSystem;
  processes: Process[];
  openProcess: (id: string, name: string, args?: Record<string, any>) => void;
  killProcess: (id: string) => void;
  terminalPid?: string;
}

export interface TerminalCommand {
  name: string;
  description: string;
  usage?: string;
  execute: (args: string[], context: TerminalContext) => Promise<CommandResult>;
}
