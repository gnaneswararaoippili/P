import React, { useState, useEffect, useRef } from 'react';
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
import { ClipboardManager } from '../../core/clipboard/ClipboardManager';
import { OperationJournal } from '../../core/fs/OperationJournal';

export const Desktop = () => {
  const { processes, openProcess } = useProcesses();
  const { settings } = useSettings();
  const [layoutNodes, setLayoutNodes] = useState<DesktopNode[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLayoutChange = () => {
      setLayoutNodes(DesktopLayoutManager.getLayout());
    };

    handleLayoutChange();
    osEvents.on('desktop:layout:changed', handleLayoutChange);
    return () => osEvents.off('desktop:layout:changed', handleLayoutChange);
  }, []);

  const handlePaste = async () => {
    const clipboard = ClipboardManager.getClipboard();
    if (!clipboard || clipboard.paths.length === 0) return;
    
    try {
      for (const src of clipboard.paths) {
        const fileName = src.split('/').pop() || '';
        const destPath = `/home/desktop/${fileName}`;
        
        if (clipboard.action === 'copy') {
          // autoRename = true
          await vfs.cp(src, destPath, '/', true, false, true);
        } else if (clipboard.action === 'cut') {
          if (src !== destPath) {
            // autoRename = true
            await vfs.mv(src, destPath, '/', false, true);
          }
        }
      }
      if (clipboard.action === 'cut') {
        ClipboardManager.clear();
      }
    } catch (err) {
      console.error('Failed to paste to desktop', err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the desktop background
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('desktop-grid')) {
      e.preventDefault();
      
      const clipboard = ClipboardManager.getClipboard();
      
      osEvents.emit('contextmenu:open', {
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            id: 'desktop-paste',
            label: `Paste ${clipboard ? `(${clipboard.paths.length})` : ''}`,
            icon: <Copy className="w-4 h-4" />,
            action: handlePaste,
            disabled: !clipboard || clipboard.paths.length === 0
          },
          { separator: true, id: 'desktop-sep-0' },
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
    let targetPaths: string[];
    const isSingle = !selectedIds.has(node.id) || selectedIds.size <= 1;

    if (selectedIds.has(node.id)) {
      targetPaths = Array.from(selectedIds)
        .map(id => layoutNodes.find(n => n.id === id))
        .filter((n): n is DesktopVfsNode => n?.type === 'vfs')
        .map(n => n.path);
    } else {
      targetPaths = [node.path];
    }

    const items: MenuItem[] = [];
    
    if (isSingle && !node.isDirectory) {
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
    } else if (isSingle && node.isDirectory) {
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
      label: isSingle ? 'Copy' : `Copy ${targetPaths.length} items`,
      icon: <Copy className="w-4 h-4" />,
      action: () => {
        ClipboardManager.setClipboard('copy', targetPaths);
      }
    });

    items.push({
      id: `desktop-cut-${node.id}`,
      label: isSingle ? 'Cut' : `Cut ${targetPaths.length} items`,
      icon: <Edit className="w-4 h-4" />,
      action: () => {
        ClipboardManager.setClipboard('cut', targetPaths);
      }
    });

    items.push({
      id: `desktop-delete-${node.id}`,
      label: isSingle ? 'Delete' : `Delete ${targetPaths.length} items`,
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: async () => {
        try {
          for (const p of targetPaths) {
            await vfs.rm(p, '/');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    items.push({
      id: `desktop-hard-delete-${node.id}`,
      label: isSingle ? 'Permanently Delete' : `Permanently Delete ${targetPaths.length} items`,
      icon: <Trash2 className="w-4 h-4 text-red-700" />,
      action: async () => {
        try {
          for (const p of targetPaths) {
            await vfs.rm(p, '/', true, true);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });

    osEvents.emit('contextmenu:open', { x: e.clientX, y: e.clientY, items });
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    setSelectedIds(prev => {
      let next = new Set(prev);
      
      if (isShift && anchorId) {
        // Find index of anchor and current
        const nodes = layoutNodes.map(n => n.id);
        const anchorIdx = nodes.indexOf(anchorId);
        const currentIdx = nodes.indexOf(id);
        
        if (anchorIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(anchorIdx, currentIdx);
          const end = Math.max(anchorIdx, currentIdx);
          
          if (!isCtrl) next.clear();
          
          for (let i = start; i <= end; i++) {
            next.add(nodes[i]);
          }
        }
      } else if (isCtrl) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setAnchorId(id);
      } else {
        if (!next.has(id)) {
          next.clear();
          next.add(id);
        }
        setAnchorId(id);
      }
      return next;
    });
  };

  const handleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
       if (selectedIds.has(id) && selectedIds.size > 1) {
          setSelectedIds(new Set([id]));
       }
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      setSelectedIds(new Set(layoutNodes.map(n => n.id)));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const hardDelete = e.shiftKey;
      for (const id of Array.from(selectedIds)) {
        const node = layoutNodes.find(n => n.id === id);
        if (node && node.type === 'vfs') {
           await vfs.rm((node as DesktopVfsNode).path, '/', true, hardDelete);
        }
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const paths = Array.from(selectedIds)
        .map(id => layoutNodes.find(n => n.id === id))
        .filter((n): n is DesktopVfsNode => n?.type === 'vfs')
        .map(n => n.path);
      if (paths.length > 0) ClipboardManager.setClipboard('copy', paths);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      e.preventDefault();
      const paths = Array.from(selectedIds)
        .map(id => layoutNodes.find(n => n.id === id))
        .filter((n): n is DesktopVfsNode => n?.type === 'vfs')
        .map(n => n.path);
      if (paths.length > 0) ClipboardManager.setClipboard('cut', paths);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handlePaste();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        await OperationJournal.redo();
      } else {
        await OperationJournal.undo();
      }
    }
  };

  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('desktop-grid')) return;
    if (e.button !== 0) return;
    
    setSelectedIds(new Set());
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.clientX - rect.left + container.scrollLeft;
      const currentY = moveEvent.clientY - rect.top + container.scrollTop;
      
      setMarquee(prev => prev ? { ...prev, currentX, currentY } : null);
      
      const selectionRect = {
        left: Math.min(x, currentX),
        top: Math.min(y, currentY),
        right: Math.max(x, currentX),
        bottom: Math.max(y, currentY)
      };

      const newSelection = new Set<string>();
      const nodeElements = container.querySelectorAll('.desktop-icon');
      
      nodeElements.forEach((el) => {
        const id = el.getAttribute('data-id');
        if (!id) return;
        
        const elRect = el.getBoundingClientRect();
        const elLeft = elRect.left - rect.left + container.scrollLeft;
        const elTop = elRect.top - rect.top + container.scrollTop;
        const elRight = elLeft + elRect.width;
        const elBottom = elTop + elRect.height;
        
        const intersects = !(
          selectionRect.right < elLeft ||
          selectionRect.left > elRight ||
          selectionRect.bottom < elTop ||
          selectionRect.top > elBottom
        );
        
        if (intersects) {
          newSelection.add(id);
        }
      });
      
      setSelectedIds(newSelection);
    };

    const handlePointerUp = () => {
      setMarquee(null);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };
  return (
    <div 
      ref={containerRef}
      className="relative h-[calc(100vh-3rem)] w-full bg-cover bg-center overflow-hidden transition-all duration-700 ease-in-out focus:outline-none"
      style={{ backgroundImage: `url('${settings['system.wallpaper']}')` }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onPointerDown={handleBackgroundPointerDown}
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

          const vfsPaths = payload.sourcePaths || (payload.sourcePath ? [payload.sourcePath] : []);
          const appIds = payload.appIds || (payload.appId ? [payload.appId] : []);
          
          let currentIndex = 0;

          // Process VFS items
          for (const src of vfsPaths) {
            const fileName = src.split('/').pop() || '';
            const destPath = `/home/desktop/${fileName}`;
            
            const offsetCol = col + (currentIndex % 3);
            const offsetRow = row + Math.floor(currentIndex / 3);
            currentIndex++;
            
            if (src === destPath) {
              const newId = `vfs-${destPath}`;
              DesktopLayoutManager.updatePosition(newId, offsetCol, offsetRow);
            } else {
              try {
                await vfs.mv(src, destPath, '/');
                setTimeout(() => {
                  const newId = `vfs-${destPath}`;
                  DesktopLayoutManager.updatePosition(newId, offsetCol, offsetRow);
                }, 100);
              } catch (err) {
                console.error('Failed to move item to desktop', err);
              }
            }
          }

          // Process App items
          for (const appId of appIds) {
            const offsetCol = col + (currentIndex % 3);
            const offsetRow = row + Math.floor(currentIndex / 3);
            currentIndex++;
            DesktopLayoutManager.updatePosition(appId, offsetCol, offsetRow);
          }
        } catch (err) {
          console.error('Desktop drop failed:', err);
        }
      }}
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-2 z-0">
        <div className="desktop-grid relative w-full h-full pointer-events-auto">
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
                  isSelected={selectedIds.has(node.id)}
                  selectedAppIds={Array.from(selectedIds).filter(id => layoutNodes.find(n => n.id === id)?.type === 'app')}
                  onPointerDown={(e) => handlePointerDown(e, node.id)}
                  onClick={(e) => handleClick(e, node.id)}
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
                  isSelected={selectedIds.has(node.id)}
                  selectedVfsPaths={Array.from(selectedIds).map(id => layoutNodes.find(n => n.id === id)).filter((n): n is DesktopVfsNode => n?.type === 'vfs').map(n => n.path)}
                  onPointerDown={(e) => handlePointerDown(e, node.id)}
                  onClick={(e) => handleClick(e, node.id)}
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
          
          {/* Marquee Overlay */}
          {marquee && (
            <div
              className="absolute bg-blue-500/20 border border-blue-400/50 pointer-events-none z-50"
              style={{
                left: Math.min(marquee.startX, marquee.currentX),
                top: Math.min(marquee.startY, marquee.currentY),
                width: Math.abs(marquee.currentX - marquee.startX),
                height: Math.abs(marquee.currentY - marquee.startY),
              }}
            />
          )}
        </div>
      </div>

      {/* Render Windows */}
      {processes.map((process) => (
        <Window key={process.id} process={process} />
      ))}
    </div>
  );
};
