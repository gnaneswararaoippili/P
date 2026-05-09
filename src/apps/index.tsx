import { AppRegistry } from '../core/registry/AppRegistry';
import { Terminal, FolderOpen, Settings, Activity, FileText } from 'lucide-react';

export const registerApps = () => {
  AppRegistry.register({
    id: 'terminal',
    name: 'Terminal',
    description: 'System command line interface',
    category: 'system',
    icon: <Terminal className="w-10 h-10 text-white" />,
    showOnDesktop: true,
  });

  AppRegistry.register({
    id: 'explorer',
    name: 'File Explorer',
    description: 'Manage virtual file system',
    category: 'system',
    icon: <FolderOpen className="w-10 h-10 text-yellow-400" />,
    showOnDesktop: true,
  });

  AppRegistry.register({
    id: 'taskmanager',
    name: 'Task Manager',
    description: 'Monitor and orchestrate processes',
    category: 'system',
    icon: <Activity className="w-10 h-10 text-green-400" />,
    showOnDesktop: true,
  });

  AppRegistry.register({
    id: 'settings',
    name: 'Settings',
    description: 'System configuration and personalization',
    category: 'utilities',
    icon: <Settings className="w-10 h-10 text-slate-300" />,
    showOnDesktop: true,
  });

  // Editor is a utility but not normally launched from desktop without a file
  AppRegistry.register({
    id: 'editor', // base id
    name: 'Text Editor',
    description: 'View and edit text files',
    category: 'utilities',
    icon: <FileText className="w-10 h-10 text-blue-400" />,
    showOnDesktop: false,
  });
};

