import type { TerminalCommand, CommandResult, TerminalContext } from '../types';
import { registry } from '../registry';

export const helpCommand: TerminalCommand = {
  name: 'help',
  description: 'Displays a list of available commands and their descriptions.',
  execute: async (_args: string[], _context: TerminalContext): Promise<CommandResult> => {
    const commands = registry.getAllCommands();
    
    let output = 'Available commands:\n\n';
    
    // Sort commands alphabetically
    const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const cmd of sortedCommands) {
      // Pad the command name to align descriptions
      const paddedName = cmd.name.padEnd(15, ' ');
      output += `${paddedName} - ${cmd.description}\n`;
    }
    
    output += '\nType any command and press Enter to execute it.';

    return {
      output,
    };
  },
};
