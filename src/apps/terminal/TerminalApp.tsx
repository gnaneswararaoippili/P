import React, { useState, useRef, useEffect } from 'react';
import { useShell } from '../../context/ShellContext';
import { useHistory } from './useHistory';
import { registry } from '../../core/terminal/registry';
import { registerBuiltInCommands } from '../../core/terminal/commands';
import { vfs } from '../../core/fs/FileSystem';
import { useProcesses } from '../../context/ProcessContext';

// Register built-in commands when the app loads
registerBuiltInCommands();

interface HistoryItem {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string | React.ReactNode;
  prompt?: string;
  color?: string;
}

export const TerminalApp = ({ pid, args }: { pid?: string, args?: Record<string, any> }) => {
  const { username, hostname, cwd, setCwd } = useShell();
  const { addHistory, navigateHistory } = useHistory();
  const { processes, closeProcess, openProcess } = useProcesses();
  const [buffer, setBuffer] = useState<HistoryItem[]>([]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const promptString = `${username}@${hostname}:${cwd} $`;

  // Welcome message
  useEffect(() => {
    setBuffer([
      { id: 'welcome1', type: 'output', content: 'Welcome to WebOS Terminal v1.0.0', color: 'text-blue-400 font-bold' },
      { id: 'welcome2', type: 'output', content: 'Type "help" to see available commands.', color: 'text-slate-400' },
    ]);
  }, []);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [buffer]);

  const lastExecutedCommandRef = useRef<string | null>(null);

  const executeCommand = async (commandToRun: string) => {
    // Add input echo to buffer
    setBuffer((prev) => [
      ...prev,
      { id: Date.now().toString() + Math.random(), type: 'input', content: commandToRun, prompt: promptString },
    ]);

    if (commandToRun.trim() === '') return;

    // Execute command
    const context = { 
      username, 
      hostname, 
      cwd, 
      setCwd, 
      fs: vfs, 
      processes, 
      openProcess,
      killProcess: closeProcess, 
      terminalPid: pid 
    };
    const result = await registry.execute(commandToRun, context);

    if (result.clear) {
      setBuffer([]);
    } else if (result.output) {
      setBuffer((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString() + Math.random(),
          type: result.isError ? 'error' : 'output',
          content: result.output,
          color: result.color,
        },
      ]);
    }
  };

  // Run initial command if provided
  useEffect(() => {
    if (args?.initialCommand && args.initialCommand !== lastExecutedCommandRef.current) {
      lastExecutedCommandRef.current = args.initialCommand;
      executeCommand(args.initialCommand);
    }
  }, [args?.initialCommand]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const commandToRun = input;
      setInput('');
      addHistory(commandToRun);
      await executeCommand(commandToRun);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setInput(navigateHistory('up', input));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setInput(navigateHistory('down', input));
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="w-full h-full bg-slate-950 text-slate-200 font-mono text-sm p-4 overflow-y-auto cursor-text select-text"
      onClick={focusInput}
      ref={containerRef}
    >
      <div className="flex flex-col gap-1 min-h-full pb-4">
        {buffer.map((item) => (
          <div key={item.id} className="whitespace-pre-wrap break-words">
            {item.type === 'input' && item.prompt && (
              <div className="flex gap-2">
                <span className="text-green-400 font-bold">{item.prompt.split(':')[0]}:</span>
                <span className="text-blue-400 font-bold">{item.prompt.split(':')[1]?.split(' ')[0]}</span>
                <span className="text-white">$</span>
                <span className="text-slate-200">{item.content}</span>
              </div>
            )}
            {item.type !== 'input' && (
              <div className={`${item.color || (item.type === 'error' ? 'text-red-400' : 'text-slate-300')}`}>
                {item.content}
              </div>
            )}
          </div>
        ))}
        
        {/* Active Input Line */}
        <div className="flex gap-2 mt-1 items-center">
          <span className="text-green-400 font-bold">{username}@{hostname}:</span>
          <span className="text-blue-400 font-bold">{cwd}</span>
          <span className="text-white">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-slate-200 font-mono focus:ring-0 p-0 m-0 leading-tight"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
};
