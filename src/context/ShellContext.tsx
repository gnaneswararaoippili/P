import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ShellContextType {
  username: string;
  hostname: string;
  cwd: string;
  setCwd: (path: string) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export const ShellProvider = ({ children }: { children: ReactNode }) => {
  const [username] = useState('guest');
  const [hostname] = useState('webos');
  const [cwd, setCwd] = useState('/home/guest');

  return (
    <ShellContext.Provider value={{ username, hostname, cwd, setCwd }}>
      {children}
    </ShellContext.Provider>
  );
};

export const useShell = () => {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used within a ShellProvider');
  return context;
};
