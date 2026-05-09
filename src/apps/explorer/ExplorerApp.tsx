import React, { useState, useEffect, useRef } from 'react';
import { useExplorerNavigation } from './useExplorerNavigation';
import { useSelectionEngine } from './useSelectionEngine';
import { vfs } from '../../core/fs/FileSystem';
import type { VFSNode } from '../../core/fs/types';
import { useProcesses } from '../../context/ProcessContext';
import { osEvents } from '../../core/events/EventBus';
import { ArrowLeft, ArrowRight, ArrowUp, Folder, File, FileText, ImageIcon, HardDrive, Trash2, Edit2, ExternalLink, PlusSquare, FolderPlus, Copy } from 'lucide-react';
import type { MenuItem } from '../../core/contextmenu/types';
import { type DragPayload, DRAG_MIME_TYPE } from '../../core/events/DragPayload';
import { AppRegistry } from '../../core/registry/AppRegistry';
import { ClipboardManager } from '../../core/clipboard/ClipboardManager';

const getIconForFile = (name: string) => {
  if (name.endsWith('.txt')) return <FileText className="w-12 h-12 text-slate-300" />;
  if (name.endsWith('.png') || name.endsWith('.jpg')) return <ImageIcon className="w-12 h-12 text-blue-300" />;
  return <File className="w-12 h-12 text-slate-400" />;
};

export const ExplorerApp = () => {
  const { openProcess } = useProcesses();
  const { 
    currentPath, 
    navigateTo, 
    goBack,  
    goForward, 
    goUp, 
    canGoBack, 
    canGoForward, 
    canGoUp 
  } = useExplorerNavigation('/home/guest');

  const [nodes, setNodes] = useState<VFSNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const { selectedPaths, handlePointerDown, clearSelection, selectAll, setSelectedPaths } = useSelectionEngine(nodes, currentPath);

  // Marquee Selection State
  const containerRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  // Sync VFS nodes when path changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchDir = async () => {
      try {
        setError(null);
        // We use '/' as cwd for absolute path resolution
        const children = await vfs.readDir(currentPath, '/');
        
        if (!isMounted) return;
        
        // Sort: Directories first, then files, alphabetically
        const sorted = children.sort((a, b) => {
          if (a.type === 'directory' && b.type !== 'directory') return -1;
          if (a.type !== 'directory' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });
        
        setNodes(sorted);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      }
    };

    fetchDir();

    const handleVfsChange = (payload: any) => {
      if (payload && payload.path === currentPath) {
        fetchDir();
      }
    };

    osEvents.on('vfs:changed', handleVfsChange);

    return () => { 
      isMounted = false; 
      osEvents.off('vfs:changed', handleVfsChange);
    };
  }, [currentPath]);

  const handleDoubleClick = (node: VFSNode) => {
    const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
    
    if (node.type === 'directory') {
      navigateTo(fullPath);
    } else {
      const app = AppRegistry.getAppForFile(node.name);
      if (app) {
        // Generate a unique process ID for this file so multiple files can be opened
        const processId = `${app.id}-${node.id}`;
        openProcess(processId, `${app.name} - ${node.name}`, { filePath: fullPath });
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: VFSNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
    
    let targetPaths: string[];
    if (selectedPaths.has(fullPath)) {
      targetPaths = Array.from(selectedPaths);
    } else {
      setSelectedPaths(new Set([fullPath]));
      targetPaths = [fullPath];
    }
    
    const isSingle = targetPaths.length === 1;

    const handleBatchCopy = (paths: string[]) => {
      ClipboardManager.setClipboard('copy', paths);
    };

    const handleBatchCut = (paths: string[]) => {
      ClipboardManager.setClipboard('cut', paths);
    };

    const handleBatchDelete = async (paths: string[]) => {
      try {
        for (const path of paths) {
          await vfs.rm(path, '/');
        }
      } catch (err) {
        console.error('Failed to delete', err);
      }
    };

    const items: MenuItem[] = [];

    // Open Action
    items.push({
      id: `explorer-open-${node.id}`,
      label: isSingle ? 'Open' : `Open ${targetPaths.length} items`,
      icon: <ExternalLink className="w-4 h-4" />,
      action: () => {
        if (isSingle) {
          handleDoubleClick(node);
        } else {
          // Open all selected items
          targetPaths.forEach(path => {
            const fileName = path.split('/').pop() || '';
            const matchingNode = nodes.find(n => n.name === fileName);
            if (matchingNode) handleDoubleClick(matchingNode);
          });
        }
      }
    });

    items.push({ separator: true, id: `sep-1-${node.id}` });

    // File-specific actions
    if (isSingle && node.type !== 'directory') {
      items.push({
        id: `explorer-edit-${node.id}`,
        label: 'Edit with Text Editor',
        icon: <Edit2 className="w-4 h-4" />,
        action: () => openProcess(`editor-${node.id}`, `Editor - ${node.name}`, { filePath: fullPath })
      });
    }

    // Copy Action
    items.push({
      id: `explorer-copy-${node.id}`,
      label: isSingle ? 'Copy' : `Copy ${targetPaths.length} items`,
      icon: <Copy className="w-4 h-4" />,
      action: () => handleBatchCopy(targetPaths)
    });

    // Cut Action
    items.push({
      id: `explorer-cut-${node.id}`,
      label: isSingle ? 'Cut' : `Cut ${targetPaths.length} items`,
      icon: <Edit2 className="w-4 h-4" />,
      action: () => handleBatchCut(targetPaths)
    });

    // Delete Action
    items.push({
      id: `explorer-delete-${node.id}`,
      label: isSingle ? 'Delete' : `Delete ${targetPaths.length} items`,
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: () => handleBatchDelete(targetPaths)
    });

    osEvents.emit('contextmenu:open', {
      x: e.clientX,
      y: e.clientY,
      items
    });
  };

  const handlePaste = async () => {
    const clipboard = ClipboardManager.getClipboard();
    if (!clipboard || clipboard.paths.length === 0) return;
    
    try {
      for (const src of clipboard.paths) {
        const fileName = src.split('/').pop() || '';
        const destPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
        
        if (clipboard.action === 'copy') {
          if (src === destPath) {
            // Copying to same directory -> append _copy
            const nameParts = fileName.split('.');
            let newName = '';
            if (nameParts.length > 1 && !src.endsWith('/')) {
              const ext = nameParts.pop();
              newName = `${nameParts.join('.')}_copy.${ext}`;
            } else {
              newName = `${fileName}_copy`;
            }
            const newDestPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
            await vfs.cp(src, newDestPath, '/');
          } else {
            await vfs.cp(src, destPath, '/');
          }
        } else if (clipboard.action === 'cut') {
          if (src !== destPath && !destPath.startsWith(src + '/')) {
            await vfs.mv(src, destPath, '/');
          }
        }
      }
      if (clipboard.action === 'cut') {
        ClipboardManager.clear();
      }
    } catch (err) {
      console.error('Failed to paste', err);
    }
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the background container, not a file node
    if (e.target === e.currentTarget) {
      e.preventDefault();
      
      const clipboard = ClipboardManager.getClipboard();
      
      const items: MenuItem[] = [
        {
          id: 'explorer-paste',
          label: `Paste ${clipboard ? `(${clipboard.paths.length})` : ''}`,
          icon: <Copy className="w-4 h-4" />,
          action: handlePaste,
          disabled: !clipboard || clipboard.paths.length === 0
        },
        { separator: true, id: 'bg-sep-1' },
        {
          id: 'explorer-new-folder',
          label: 'New Folder',
          icon: <FolderPlus className="w-4 h-4" />,
          action: async () => {
            try {
              const name = prompt('Enter folder name:');
              if (name) {
                const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                await vfs.mkdir(path, '/');
              }
            } catch (err) {
              console.error('Failed to create folder', err);
            }
          }
        },
        {
          id: 'explorer-new-file',
          label: 'New File',
          icon: <PlusSquare className="w-4 h-4" />,
          action: async () => {
            try {
              const name = prompt('Enter file name:');
              if (name) {
                const path = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                await vfs.writeFile(path, '', '/');
                openProcess(`editor-${Date.now()}`, `Editor - ${name}`, { filePath: path });
              }
            } catch (err) {
              console.error('Failed to create file', err);
            }
          }
        }
      ];

      osEvents.emit('contextmenu:open', {
        x: e.clientX,
        y: e.clientY,
        items
      });
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      selectAll();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (selectedPaths.size > 0) {
        try {
          for (const path of Array.from(selectedPaths)) {
            await vfs.rm(path, '/');
          }
        } catch (err) {
          console.error('Failed to delete', err);
        }
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      if (selectedPaths.size > 0) {
        ClipboardManager.setClipboard('copy', Array.from(selectedPaths));
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
      e.preventDefault();
      if (selectedPaths.size > 0) {
        ClipboardManager.setClipboard('cut', Array.from(selectedPaths));
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
    }
  };

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  // Marquee Engine Handlers
  const handleBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.target !== e.currentTarget) {
      // If clicking on an empty area inside the container but not a file
      if ((e.target as HTMLElement).closest('.explorer-node')) return;
    }
    
    // Left click only
    if (e.button !== 0) return;
    
    clearSelection();
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left + container.scrollLeft;
    const y = e.clientY - rect.top + container.scrollTop;
    
    setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
    
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const containerRect = container.getBoundingClientRect();
      const currentX = moveEvent.clientX - containerRect.left + container.scrollLeft;
      const currentY = moveEvent.clientY - containerRect.top + container.scrollTop;
      
      setMarquee(prev => prev ? { ...prev, currentX, currentY } : null);
      
      // Calculate bounding box collisions
      const selectionRect = {
        left: Math.min(x, currentX),
        top: Math.min(y, currentY),
        right: Math.max(x, currentX),
        bottom: Math.max(y, currentY)
      };

      const newSelection = new Set<string>();
      const nodeElements = container.querySelectorAll('.explorer-node');
      
      nodeElements.forEach((el) => {
        const path = el.getAttribute('data-path');
        if (!path) return;
        
        // get element rect relative to container
        const elRect = el.getBoundingClientRect();
        const elLeft = elRect.left - containerRect.left + container.scrollLeft;
        const elTop = elRect.top - containerRect.top + container.scrollTop;
        const elRight = elLeft + elRect.width;
        const elBottom = elTop + elRect.height;
        
        // Check intersection
        const intersects = !(
          selectionRect.right < elLeft ||
          selectionRect.left > elRight ||
          selectionRect.bottom < elTop ||
          selectionRect.top > elBottom
        );
        
        if (intersects) {
          newSelection.add(path);
        }
      });
      
      setSelectedPaths(newSelection);
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
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200 text-sm focus:outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
      
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-white/10 bg-slate-800">
        <div className="flex items-center gap-1">
          <button 
            onClick={goBack} disabled={!canGoBack}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={goForward} disabled={!canGoForward}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={goUp} disabled={!canGoUp}
            className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>

        {/* Path Input / Breadcrumbs */}
        <div className="flex-1 flex items-center bg-slate-950 border border-white/10 rounded px-3 py-1.5 ml-2">
          <HardDrive className="w-4 h-4 text-slate-400 mr-2" />
          <div className="flex items-center text-slate-300">
            <span className="cursor-pointer hover:text-white" onClick={() => navigateTo('/')}>
              root
            </span>
            {breadcrumbs.map((crumb, idx) => {
              const pathSoFar = '/' + breadcrumbs.slice(0, idx + 1).join('/');
              return (
                <React.Fragment key={pathSoFar}>
                  <span className="mx-1 text-slate-500">/</span>
                  <span 
                    className="cursor-pointer hover:text-white"
                    onClick={() => navigateTo(pathSoFar)}
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className={`relative flex-1 overflow-auto p-4 transition-colors ${isDragOver ? 'bg-blue-500/10' : ''}`}
        onContextMenu={handleBackgroundContextMenu}
        onPointerDown={handleBackgroundPointerDown}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DRAG_MIME_TYPE)) {
            e.preventDefault(); // allow drop
            e.dataTransfer.dropEffect = 'move';
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={async (e) => {
          setIsDragOver(false);
          try {
            const raw = e.dataTransfer.getData(DRAG_MIME_TYPE);
            if (!raw) return;
            const payload: DragPayload = JSON.parse(raw);
            
            if (payload.type === 'vfs') {
              const paths = payload.sourcePaths || (payload.sourcePath ? [payload.sourcePath] : []);
              for (const src of paths) {
                const fileName = src.split('/').pop() || '';
                const destPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
                
                // Only move if it's changing directories
                if (src !== destPath && !destPath.startsWith(src + '/')) {
                  await vfs.mv(src, destPath, '/');
                }
              }
            }
          } catch (err) {
            console.error('Drop failed:', err);
          }
        }}
      >
        {error ? (
          <div className="text-red-400 p-4 bg-red-400/10 rounded-lg">
            Error: {error}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 auto-rows-min">
            {nodes.length === 0 ? (
              <div className="col-span-full text-center text-slate-500 mt-10">
                This folder is empty.
              </div>
            ) : (
              nodes.map((node) => {
                const fullPath = currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;
                const isSelected = selectedPaths.has(fullPath);
                
                return (
                <div 
                  key={node.id}
                  data-path={fullPath}
                  draggable
                  onDragStart={(e) => {
                    const isNodeSelected = selectedPaths.has(fullPath);
                    const dragPaths = isNodeSelected ? Array.from(selectedPaths) : [fullPath];

                    const payload: DragPayload = {
                      type: 'vfs',
                      sourcePath: fullPath,
                      sourcePaths: dragPaths,
                      sourceContext: 'explorer'
                    };
                    
                    if (dragPaths.length > 1) {
                      const badge = document.createElement('div');
                      badge.className = 'bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold fixed top-[-1000px] left-[-1000px] z-50';
                      badge.textContent = `${dragPaths.length} items`;
                      document.body.appendChild(badge);
                      e.dataTransfer.setDragImage(badge, 0, 0);
                      setTimeout(() => {
                        if (document.body.contains(badge)) {
                          document.body.removeChild(badge);
                        }
                      }, 100);
                    }

                    e.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (node.type === 'directory' && e.dataTransfer.types.includes(DRAG_MIME_TYPE)) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverFolderId(node.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (node.type === 'directory') {
                      setDragOverFolderId(null);
                    }
                  }}
                  onDrop={async (e) => {
                    if (node.type === 'directory') {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverFolderId(null);
                      try {
                        const raw = e.dataTransfer.getData(DRAG_MIME_TYPE);
                        if (!raw) return;
                        const payload: DragPayload = JSON.parse(raw);
                        
                        if (payload.type === 'vfs') {
                          const paths = payload.sourcePaths || (payload.sourcePath ? [payload.sourcePath] : []);
                          for (const src of paths) {
                            const fileName = src.split('/').pop() || '';
                            const destPath = `${fullPath}/${fileName}`;
                            
                            if (src !== destPath && !destPath.startsWith(src + '/')) {
                              await vfs.mv(src, destPath, '/');
                            }
                          }
                        }
                      } catch (err) {
                        console.error('Drop to folder failed:', err);
                      }
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (e.button === 0) {
                      handlePointerDown(e, node);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                      if (selectedPaths.has(fullPath) && selectedPaths.size > 1) {
                        setSelectedPaths(new Set([fullPath]));
                      }
                    }
                  }}
                  onDoubleClick={() => handleDoubleClick(node)}
                  onContextMenu={(e) => handleContextMenu(e, node)}
                  className={`explorer-node flex flex-col items-center justify-start p-2 rounded cursor-pointer group transition-colors select-none text-center 
                    ${dragOverFolderId === node.id ? 'bg-blue-500/30 ring-2 ring-blue-400' : ''} 
                    ${isSelected && dragOverFolderId !== node.id ? 'bg-blue-500/40 border border-blue-400/50' : 'hover:bg-white/10 border border-transparent'}
                  `}
                >
                  <div className="mb-2">
                    {node.type === 'directory' ? (
                      <Folder className="w-12 h-12 text-blue-400 fill-blue-400/20" />
                    ) : (
                      getIconForFile(node.name)
                    )}
                  </div>
                  <span className="w-full text-xs truncate group-hover:text-white">
                    {node.name}
                  </span>
                </div>
                );
              })
            )}
          </div>
        )}
        
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

      {/* Status Bar */}
      <div className="h-6 bg-slate-800 border-t border-white/10 flex items-center px-4 text-xs text-slate-400">
        {nodes.length} item{nodes.length !== 1 && 's'}
      </div>
    </div>
  );
};
