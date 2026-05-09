import { useState, useEffect } from 'react';
import { ProcessProvider } from './context/ProcessContext';
import { ShellProvider } from './context/ShellContext';
import { Desktop } from './components/desktop/Desktop';
import { Taskbar } from './components/taskbar/Taskbar';
import { Spotlight } from './components/spotlight/Spotlight';
import { ContextMenuOverlay } from './components/contextmenu/ContextMenuOverlay';
import { NotificationOverlay } from './components/notifications/NotificationOverlay';
import { vfs } from './core/fs/FileSystem';
import { SettingsManager } from './core/settings/SettingsManager';
import { DesktopLayoutManager } from './core/desktop/DesktopLayoutManager';
import { useSettings } from './core/settings/useSettings';
import { SearchManager, registerSearchProviders } from './core/search';
import { Loader2 } from 'lucide-react';
import { registerApps } from './apps';

// Initialize the application registry and search providers
registerApps();
registerSearchProviders();

const OSRuntime = () => {
  const { settings } = useSettings();
  const theme = settings['system.theme'] || 'dark';

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans selection:bg-blue-500/30 ${theme === 'dark' ? 'dark bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      <ShellProvider>
        <ProcessProvider>
          <Desktop />
          <Taskbar />
          <Spotlight />
          <ContextMenuOverlay />
          <NotificationOverlay />
        </ProcessProvider>
      </ShellProvider>
    </div>
  );
};

function App() {
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const bootOS = async () => {
      // Slight artificial delay for OS boot feel
      await new Promise(resolve => setTimeout(resolve, 800));
      await vfs.init();
      await SettingsManager.init();
      DesktopLayoutManager.init();
      await SearchManager.initAll();
      setIsBooting(false);
    };
    bootOS();
  }, []);

  if (isBooting) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white font-sans select-none">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h1 className="text-3xl font-light tracking-widest text-slate-200">WebOS</h1>
        <p className="text-sm text-slate-500 mt-2">Loading Virtual File System...</p>
      </div>
    );
  }

  return <OSRuntime />;
}

export default App;

