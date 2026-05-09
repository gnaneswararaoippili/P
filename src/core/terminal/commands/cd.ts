import type { TerminalCommand, CommandResult, TerminalContext } from '../types';

export const cdCommand: TerminalCommand = {
  name: 'cd',
  description: 'Change the shell working directory.',
  execute: async (args: string[], context: TerminalContext): Promise<CommandResult> => {
    const targetPath = args[0];
    
    if (!targetPath) {
      // cd with no args goes to home
      context.setCwd(`/home/${context.username}`);
      return { output: '' };
    }

    // Resolve path to verify it exists and is a directory
    const node = await context.fs.resolvePath(targetPath, context.cwd);
    
    if (node.type !== 'directory') {
      throw new Error(`Not a directory: ${targetPath}`);
    }

    // To cleanly update CWD, we'd ideally store absolute paths. 
    // We can reconstruct the absolute path by resolving from root manually, 
    // but for now we'll just reconstruct the path by walking back to root from the node.
    let absolutePath = '';
    let curr = node;
    while (curr.parent) {
      absolutePath = '/' + curr.name + absolutePath;
      curr = curr.parent;
    }
    if (absolutePath === '') absolutePath = '/';

    context.setCwd(absolutePath);

    return { output: '' };
  },
};
