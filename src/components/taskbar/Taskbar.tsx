import React, { useState, useEffect } from 'react';
import { useProcesses } from '../../context/ProcessContext';
import { LayoutGrid, Wifi, Battery, Volume2, X } from 'lucide-react';
import { cn } from '../../utils/cn';

import { AppRegistry } from '../../core/registry/AppRegistry';
import { StartMenu } from './StartMenu';
import { WorkspaceManager, type Workspace } from '../../core/workspace/WorkspaceManager';
import { osEvents } from '../../core/events/EventBus';

const getAppIcon = (id: string) => {
  const app = AppRegistry.getApp(id);
  if (app && app.icon) {
    // Clone the icon element to override size classes for the taskbar
    const iconElement = app.icon as React.ReactElement<{ className?: string }>;
    return React.cloneElement(iconElement, { className: "w-4 h-4" });
  }
  return null;
};

export const Taskbar = () => {
  const { processes, focusProcess, minimizeProcess, restoreProcess } = useProcesses();
  const [time, setTime] = useState(new Date());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>(WorkspaceManager.getWorkspaces());
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(WorkspaceManager.getActiveWorkspaceId());

  useEffect(() => {
    const handleWorkspaceChanged = (payload: { workspaces: Workspace[] }) => {
      setWorkspaces(payload.workspaces);
    };
    const handleWorkspaceActiveChanged = (payload: { id: string }) => {
      setActiveWorkspaceId(payload.id);
    };

    osEvents.on('workspace:changed', handleWorkspaceChanged);
    osEvents.on('workspace:activeChanged', handleWorkspaceActiveChanged);

    return () => {
      osEvents.off('workspace:changed', handleWorkspaceChanged);
      osEvents.off('workspace:activeChanged', handleWorkspaceActiveChanged);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTaskbarClick = (processId: string) => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return;
    if (proc.isMinimized) {
      restoreProcess(processId);       // un-minimize + focus
    } else if (proc.isFocused) {
      minimizeProcess(processId);      // click focused window → minimize
    } else {
      focusProcess(processId);         // bring to front
    }
  };

  return (
    <>
      {isStartMenuOpen && <StartMenu onClose={() => setIsStartMenuOpen(false)} />}
      <div className="h-12 w-full bg-black/70 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-2 z-50 text-white select-none relative">
      {/* Start Button & App Icons */}
      <div className="flex items-center h-full gap-1 relative">
        <div 
          onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}
          className={cn(
            "h-10 w-10 flex items-center justify-center rounded-md cursor-pointer transition-colors group mx-1",
            isStartMenuOpen ? "bg-white/20" : "hover:bg-white/10"
          )}
        >
          <LayoutGrid className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
        </div>
        
        <div className="w-px h-6 bg-white/20 mx-1"></div>

        {/* Workspace Switcher */}
        <div className="flex gap-1 h-full items-center mr-2">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => WorkspaceManager.switchWorkspace(ws.id)}
              className={cn(
                "group relative h-6 px-3 text-xs flex items-center justify-center rounded-sm cursor-pointer transition-colors border",
                activeWorkspaceId === ws.id 
                  ? "bg-white/20 border-white/30 text-white" 
                  : "bg-transparent border-transparent hover:bg-white/10 text-slate-300"
              )}
              title={ws.name}
            >
              <span className={cn("transition-transform duration-200", ws.id !== 'default' && "group-hover:-translate-x-2")}>
                {ws.name}
              </span>
              
              {ws.id !== 'default' && (
                <div 
                  className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-sm hover:bg-red-500 hover:text-white text-slate-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    WorkspaceManager.removeWorkspace(ws.id);
                  }}
                  title="Close Desktop"
                >
                  <X className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
          <div 
            onClick={() => WorkspaceManager.createWorkspace()}
            className="h-6 w-6 flex items-center justify-center rounded-sm cursor-pointer hover:bg-white/10 text-slate-300 transition-colors"
            title="New Desktop"
          >
            +
          </div>
        </div>

        <div className="w-px h-6 bg-white/20 mx-1"></div>

        {/* Running Apps */}
        <div className="flex gap-1 h-full items-center">
          {processes.filter(p => p.workspaceId === activeWorkspaceId).map((process) => (
            <div
              key={process.id}
              onClick={() => handleTaskbarClick(process.id)}
              className={cn(
                "h-10 px-3 flex items-center gap-2 cursor-pointer transition-all rounded-md max-w-[150px] group relative overflow-hidden",
                process.isFocused ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              {process.isFocused && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-400 rounded-t-md" />
              )}
              {getAppIcon(process.appId || process.id)}
              <span className="text-sm truncate font-medium">{process.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Tray */}
      <div className="flex items-center h-full gap-2 px-2 text-xs">
        <div className="flex items-center gap-3 hover:bg-white/10 px-3 py-2 rounded-md cursor-pointer transition-colors">
          <Wifi className="w-4 h-4" />
          <Volume2 className="w-4 h-4" />
          <Battery className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-end justify-center hover:bg-white/10 px-3 h-10 rounded-md cursor-pointer transition-colors">
          <span className="font-medium">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-[10px] text-slate-300">{time.toLocaleDateString()}</span>
        </div>
      </div>
      </div>
    </>
  );
};
