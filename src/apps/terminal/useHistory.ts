import { useState } from 'react';

export const useHistory = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const addHistory = (command: string) => {
    if (command.trim() === '') return;
    setHistory((prev) => [...prev, command]);
    setHistoryIndex(-1); // Reset index when a new command is added
  };

  const navigateHistory = (direction: 'up' | 'down', currentInput: string): string => {
    if (history.length === 0) return currentInput;

    let newIndex = historyIndex;

    if (direction === 'up') {
      if (newIndex === -1) {
        newIndex = history.length - 1; // Start from the most recent
      } else if (newIndex > 0) {
        newIndex -= 1;
      }
    } else if (direction === 'down') {
      if (newIndex !== -1 && newIndex < history.length - 1) {
        newIndex += 1;
      } else {
        newIndex = -1; // Go back to empty input
      }
    }

    setHistoryIndex(newIndex);
    return newIndex === -1 ? '' : history[newIndex];
  };

  return { addHistory, navigateHistory };
};
