/**
 * Parses a raw command string into a command name and an array of arguments.
 * It handles quoted strings so that text with spaces inside quotes is treated as a single argument.
 */
export const parseCommandString = (input: string): { command: string; args: string[] } => {
  const trimmed = input.trim();
  if (!trimmed) return { command: '', args: [] };

  const args: string[] = [];
  let currentArg = '';
  let inQuotes = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (char === '"') {
      // Toggle quote state, but don't add the quote character itself to the argument
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      // If we hit a space and are not inside quotes, finalize the current argument
      if (currentArg.length > 0) {
        args.push(currentArg);
        currentArg = '';
      }
    } else {
      currentArg += char;
    }
  }

  // Push the final argument if there is one
  if (currentArg.length > 0) {
    args.push(currentArg);
  }

  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  return { command, args: commandArgs };
};
