import React, { useState, useEffect } from 'react';
import { useProcesses } from '../../context/ProcessContext';
import { LayoutGrid, Wifi, Battery, Volume2 } from 'lucide-react';
import { cn } from '../../utils/cn';

import { AppRegistry } from '../../core/registry/AppRegistry';
import { StartMenu } from './StartMenu';

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

        {/* Running Apps */}
        <div className="flex gap-1 h-full items-center">
          {processes.map((process) => (
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
              {getAppIcon(process.id)}
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
