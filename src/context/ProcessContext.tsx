import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { osEvents } from '../core/events/EventBus';
import { WorkspaceManager } from '../core/workspace/WorkspaceManager';

export type WindowState = 'normal' | 'maximized' | 'snapped-left' | 'snapped-right' | 'fullscreen';

export interface Process {
  id: string;
  appId: string;
  name: string;
  isOpen: boolean;
  isFocused: boolean;
  isMinimized: boolean;
  args?: Record<string, any>;
  
  // Compositor State
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  workspaceId: string;
  windowState: WindowState;
}

interface ProcessContextType {
  processes: Process[];
  openProcess: (id: string, name: string, args?: Record<string, any>) => void;
  closeProcess: (id: string) => void;
  focusProcess: (id: string) => void;
  minimizeProcess: (id: string) => void;
  restoreProcess: (id: string) => void;
  updateProcessBounds: (id: string, bounds: Partial<{x: number, y: number, width: number, height: number, windowState: WindowState, zIndex: number}>) => void;
  activeWorkspaceId: string;
  moveProcessToWorkspace: (id: string, workspaceId: string) => void;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider = ({ children }: { children: ReactNode }) => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>(WorkspaceManager.getActiveWorkspaceId());

  // Listen for workspace changes
  useEffect(() => {
    const handleWorkspaceChange = (payload: { id: string }) => {
      setActiveWorkspaceId(payload.id);
    };
    osEvents.on('workspace:activeChanged', handleWorkspaceChange);
    return () => {
      osEvents.off('workspace:activeChanged', handleWorkspaceChange);
    };
  }, []);

  const openProcess = (id: string, name: string, args?: Record<string, any>) => {
    const appId = id.split('-')[0];
    const isMultiInstance = ['terminal', 'explorer', 'editor'].includes(appId);
    let processId = id;
    if (isMultiInstance && !id.includes('-')) {
      processId = `${appId}-${Date.now()}`;
    }

    setProcesses((prev) => {
      // Find max zIndex to place on top
      const maxZIndex = prev.length > 0 ? Math.max(...prev.map(p => p.zIndex)) : 10;
      
      // If already open, just focus it and update args if provided
      const existing = prev.find((p) => p.id === processId);
      if (existing) {
        // If it's on a different workspace, automatically switch to it!
        if (existing.workspaceId !== WorkspaceManager.getActiveWorkspaceId()) {
          setTimeout(() => {
            WorkspaceManager.switchWorkspace(existing.workspaceId);
          }, 0);
        }

        return prev.map((p) => ({ 
          ...p, 
          isFocused: p.id === processId, 
          isMinimized: p.id === processId ? false : p.isMinimized,
          zIndex: p.id === processId ? maxZIndex + 1 : p.zIndex,
          args: p.id === processId && args !== undefined ? args : p.args
        }));
      }
      // Otherwise open a new process and focus it
      setTimeout(() => {
        osEvents.emit('process:spawned', { id: processId, name });
      }, 0);
      
      // Default bounds
      const defaultWidth = 640;
      const defaultHeight = 480;
      // Stagger new windows
      const staggerOffset = (prev.length * 20) % 200;
      
      return [
        ...prev.map(p => ({ ...p, isFocused: false })), 
        { 
          id: processId, 
          appId,
          name, 
          isOpen: true, 
          isFocused: true, 
          isMinimized: false, 
          args,
          x: 100 + staggerOffset,
          y: 100 + staggerOffset,
          width: defaultWidth,
          height: defaultHeight,
          zIndex: maxZIndex + 1,
          workspaceId: WorkspaceManager.getActiveWorkspaceId(),
          windowState: 'normal'
        }
      ];
    });
  };

  const closeProcess = (id: string) => {
    setProcesses((prev) => prev.filter((p) => p.id !== id));
    osEvents.emit('process:killed', { id });
  };

  const focusProcess = (id: string) => {
    setProcesses((prev) => {
      // Only bump zIndex if it's not already the focused one
      const target = prev.find(p => p.id === id);
      if (target?.isFocused) return prev;
      
      const maxZIndex = prev.length > 0 ? Math.max(...prev.map(p => p.zIndex)) : 10;
      
      return prev.map((p) => ({
        ...p,
        isFocused: p.id === id,
        zIndex: p.id === id ? maxZIndex + 1 : p.zIndex
      }));
    });
  };

  const minimizeProcess = (id: string) => {
    setProcesses((prev) =>
      prev.map((p) => ({
        ...p,
        isMinimized: p.id === id ? true : p.isMinimized,
        isFocused: p.id === id ? false : p.isFocused,
      }))
    );
  };

  const updateProcessBounds = (id: string, bounds: Partial<{x: number, y: number, width: number, height: number, windowState: WindowState, zIndex: number}>) => {
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...bounds };
          return updated;
        }
        return p;
      })
    );
  };

  // Restore a minimized window: unminimize + focus + elevate zIndex
  const restoreProcess = (id: string) => {
    setProcesses((prev) => {
      const maxZIndex = prev.length > 0 ? Math.max(...prev.map(p => p.zIndex)) : 10;
      return prev.map((p) => ({
        ...p,
        isMinimized: p.id === id ? false : p.isMinimized,
        isFocused: p.id === id,
        zIndex: p.id === id ? maxZIndex + 1 : p.zIndex,
      }));
    });
  };

  const moveProcessToWorkspace = (id: string, workspaceId: string) => {
    setProcesses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, workspaceId } : p))
    );
  };

  return (
    <ProcessContext.Provider value={{ processes, openProcess, closeProcess, focusProcess, minimizeProcess, restoreProcess, updateProcessBounds, activeWorkspaceId, moveProcessToWorkspace }}>
      {children}
    </ProcessContext.Provider>
  );
};

export const useProcesses = () => {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcesses must be used within a ProcessProvider');
  }
  return context;
};
