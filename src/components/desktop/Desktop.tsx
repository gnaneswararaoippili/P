import React, { useState, useEffect } from 'react';
import { useProcesses } from '../../context/ProcessContext';
import { Window } from '../window/Window';
import { AppRegistry } from '../../core/registry/AppRegistry';
import { useSettings } from '../../core/settings/useSettings';
import { osEvents } from '../../core/events/EventBus';
import { Terminal, Settings, FileText, Folder, Copy, Trash2, Edit } from 'lucide-react';
import { DesktopLayoutManager, type DesktopNode, type DesktopVfsNode } from '../../core/desktop/DesktopLayoutManager';
import { DraggableIcon } from './DraggableIcon';
import { vfs } from '../../core/fs/FileSystem';
import type { MenuItem } from '../../core/contextmenu/types';
import { type DragPayload, DRAG_MIME_TYPE } from '../../core/events/DragPayload';

export const Desktop = () => {
  const { processes, openProcess } = useProcesses();
  const { settings } = useSettings();
  const [layoutNodes, setLayoutNodes] = useState<DesktopNode[]>([]);

  useEffect(() => {
    const handleLayoutChange = () => {
      setLayoutNodes(DesktopLayoutManager.getLayout());
    };

    handleLayoutChange();
    osEvents.on('desktop:layout:changed', handleLayoutChange);
    return () => osEvents.off('desktop:layout:changed', handleLayoutChange);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the desktop background
    if (e.target === e.currentTarget) {
      e.preventDefault();
      osEvents.emit('contextmenu:open', {
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            id: 'desktop-terminal',
            label: 'Open Terminal Here',
            icon: <Terminal className="w-4 h-4" />,
            action: () => openProcess('terminal', 'Terminal')
          },
          {
            id: 'desktop-sep-1',
            separator: true
          },
          {
            id: 'desktop-settings',
            label: 'Personalize',
            icon: <Settings className="w-4 h-4" />,
            action: () => openProcess('settings', 'Settings')
          }
        ]
      });
    }
  };
  const handleVfsContextMenu = (e: React.MouseEvent, node: DesktopVfsNode) => {
    e.preventDefault();
    const items: MenuItem[] = [];
    
    if (!node.isDirectory) {
      items.push({
        id: `desktop-edit-${node.id}`,
        label: 'Edit File',
        icon: <Edit className="w-4 h-4" />,
        action: () => {
          const app = AppRegistry.getAppForFile(node.path);
          if (app) {
            const processId = `${app.id}-${node.id}`;
            openProcess(processId, `${app.name} - ${node.path.split('/').pop()}`, { filePath: node.path });
          }
        }
      });
      items.push({ id: `desktop-sep-1-${node.id}`, separator: true });
    } else {
      items.push({
        id: `desktop-open-${node.id}`,
        label: 'Open Folder',
        icon: <Folder className="w-4 h-4" />,
        action: () => {
          openProcess('explorer', 'File Explorer', { targetPath: node.path });
        }
      });
      items.push({ id: `desktop-sep-1-${node.id}`, separator: true });
    }

    items.push({
      id: `desktop-copy-${node.id}`,
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      action: async () => {
        try {
          const fileName = node.path.split('/').pop() || '';
          const nameParts = fileName.split('.');
          let newName = '';
          if (nameParts.length > 1 && !node.isDirectory) {
            const ext = nameParts.pop();
            newName = `${nameParts.join('.')}_copy.${ext}`;
          } else {
            newName = `${fileName}_copy`;
          }
          await vfs.cp(node.path, `/home/desktop/${newName}`, '/');
        } catch (err) {
          console.error(err);
        }
      }
    });

    items.push({
      id: `desktop-delete-${node.id}`,
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: async () => {
        try {
          await vfs.rm(node.path, '/');
        } catch (err) {
          console.error(err);
        }
      }
    });

    osEvents.emit('contextmenu:open', { x: e.clientX, y: e.clientY, items });
  };
  return (
    <div 
      className="relative h-[calc(100vh-3rem)] w-full bg-cover bg-center overflow-hidden transition-all duration-700 ease-in-out"
      style={{ backgroundImage: `url('${settings['system.wallpaper']}')` }}
      onContextMenu={handleContextMenu}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={async (e) => {
        try {
          const raw = e.dataTransfer.getData(DRAG_MIME_TYPE);
          if (!raw) return;
          const payload: DragPayload = JSON.parse(raw);
          
          const iconX = e.clientX - (payload.offsetX || DesktopLayoutManager.GRID_SIZE / 2);
          const iconY = e.clientY - (payload.offsetY || DesktopLayoutManager.GRID_SIZE / 2);

          const col = Math.round(iconX / DesktopLayoutManager.GRID_SIZE);
          const row = Math.round(iconY / DesktopLayoutManager.GRID_SIZE);

          if (payload.type === 'vfs' && payload.sourcePath) {
            const fileName = payload.sourcePath.split('/').pop() || '';
            const destPath = `/home/desktop/${fileName}`;
            
            if (payload.sourcePath === destPath) {
              // Local desktop move
              const newId = `vfs-${destPath}`;
              DesktopLayoutManager.updatePosition(newId, col, row);
            } else {
              // Move from somewhere else
              await vfs.mv(payload.sourcePath, destPath, '/');
              // We need to wait for VFS sync before updating position
              // A simple timeout hack works because EventBus is sync in browser
              setTimeout(() => {
                const newId = `vfs-${destPath}`;
                DesktopLayoutManager.updatePosition(newId, col, row);
              }, 100);
            }
          } else if (payload.type === 'app' && payload.appId) {
            // Local desktop app move
            DesktopLayoutManager.updatePosition(payload.appId, col, row);
          }
        } catch (err) {
          console.error('Desktop drop failed:', err);
        }
      }}
    >
      {/* Desktop Icons */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-2">
        <div className="relative w-full h-full pointer-events-auto">
          {layoutNodes.map((node) => {
            if (node.type === 'app') {
              const app = AppRegistry.getApp(node.id);
              if (!app || app.showOnDesktop === false) return null;
              
              return (
                <DraggableIcon
                  key={node.id}
                  node={node}
                  icon={app.icon}
                  name={app.name}
                  onDoubleClick={() => openProcess(app.id, app.name)}
                />
              );
            } else if (node.type === 'vfs') {
              const fileName = node.path.split('/').pop() || '';
              return (
                <DraggableIcon
                  key={node.id}
                  node={node}
                  icon={node.isDirectory ? <Folder className="w-10 h-10 text-blue-400 drop-shadow-md" /> : <FileText className="w-10 h-10 text-slate-300 drop-shadow-md" />}
                  name={fileName}
                  onDoubleClick={() => {
                    if (node.isDirectory) {
                      openProcess('explorer', 'File Explorer', { targetPath: node.path });
                    } else {
                      const app = AppRegistry.getAppForFile(node.path);
                      if (app) {
                        const processId = `${app.id}-${node.id}`;
                        openProcess(processId, `${app.name} - ${fileName}`, { filePath: node.path });
                      }
                    }
                  }}
                  onContextMenu={(e) => handleVfsContextMenu(e, node)}
                />
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Render Windows */}
      {processes.map((process) => (
        <Window key={process.id} process={process} />
      ))}
    </div>
  );
};
