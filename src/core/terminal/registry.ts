import type { TerminalCommand, CommandResult, TerminalContext } from './types';
import { parseCommandString } from './parser';

class CommandRegistry {
  private commands: Map<string, TerminalCommand> = new Map();

  register(command: TerminalCommand) {
    this.commands.set(command.name.toLowerCase(), command);
  }

  getCommand(name: string): TerminalCommand | undefined {
    return this.commands.get(name.toLowerCase());
  }

  getAllCommands(): TerminalCommand[] {
    return Array.from(this.commands.values());
  }

  async execute(input: string, context: TerminalContext): Promise<CommandResult> {
    const { command, args } = parseCommandString(input);

    if (!command) {
      return { output: '' };
    }

    const cmd = this.getCommand(command);
    if (!cmd) {
      return { 
        output: `Command not found: ${command}. Type 'help' for a list of commands.`, 
        isError: true,
        color: 'text-red-400' 
      };
    }

    try {
      return await cmd.execute(args, context);
    } catch (error: any) {
      return {
        output: `Error executing ${command}: ${error.message}`,
        isError: true,
        color: 'text-red-500'
      };
    }
  }
}

// Export a singleton instance of the registry
export const registry = new CommandRegistry();
