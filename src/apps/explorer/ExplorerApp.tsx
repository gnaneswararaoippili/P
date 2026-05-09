import React, { useState, useEffect } from 'react';
import { useExplorerNavigation } from './useExplorerNavigation';
import { vfs } from '../../core/fs/FileSystem';
import type { VFSNode } from '../../core/fs/types';
import { useProcesses } from '../../context/ProcessContext';
import { osEvents } from '../../core/events/EventBus';
import { ArrowLeft, ArrowRight, ArrowUp, Folder, File, FileText, ImageIcon, HardDrive, Trash2, Edit2, ExternalLink, PlusSquare, FolderPlus, Copy } from 'lucide-react';
import type { MenuItem } from '../../core/contextmenu/types';
import { type DragPayload, DRAG_MIME_TYPE } from '../../core/events/DragPayload';
import { AppRegistry } from '../../core/registry/AppRegistry';

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
    
    const items: MenuItem[] = [];

    // Open Action
    items.push({
      id: `explorer-open-${node.id}`,
      label: 'Open',
      icon: <ExternalLink className="w-4 h-4" />,
      action: () => handleDoubleClick(node)
    });

    items.push({ separator: true, id: `sep-1-${node.id}` });

    // File-specific actions
    if (node.type !== 'directory') {
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
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      action: async () => {
        try {
          // A real system would use a clipboard manager, here we just copy in place with a suffix
          const nameParts = node.name.split('.');
          let newName = '';
          if (nameParts.length > 1) {
            const ext = nameParts.pop();
            newName = `${nameParts.join('.')}_copy.${ext}`;
          } else {
            newName = `${node.name}_copy`;
          }
          const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
          await vfs.cp(fullPath, newPath, '/');
        } catch (err) {
          console.error('Failed to copy', err);
        }
      }
    });

    // Delete Action
    items.push({
      id: `explorer-delete-${node.id}`,
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: async () => {
        try {
          await vfs.rm(fullPath, '/');
          // Note: vfs.rm emits 'vfs:changed' automatically which triggers our fetchDir
        } catch (err) {
          console.error('Failed to delete', err);
        }
      }
    });

    osEvents.emit('contextmenu:open', {
      x: e.clientX,
      y: e.clientY,
      items
    });
  };

  const handleBackgroundContextMenu = (e: React.MouseEvent) => {
    // Only trigger if clicking directly on the background container, not a file node
    if (e.target === e.currentTarget) {
      e.preventDefault();
      
      const items: MenuItem[] = [
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

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-slate-200 text-sm">
      
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
        className={`flex-1 overflow-auto p-4 transition-colors ${isDragOver ? 'bg-blue-500/10' : ''}`}
        onContextMenu={handleBackgroundContextMenu}
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
            
            if (payload.type === 'vfs' && payload.sourcePath) {
              const fileName = payload.sourcePath.split('/').pop() || '';
              const destPath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
              
              // Only move if it's changing directories
              if (payload.sourcePath !== destPath && !destPath.startsWith(payload.sourcePath + '/')) {
                await vfs.mv(payload.sourcePath, destPath, '/');
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
                return (
                <div 
                  key={node.id}
                  draggable
                  onDragStart={(e) => {
                    const payload: DragPayload = {
                      type: 'vfs',
                      sourcePath: fullPath,
                      sourceContext: 'explorer'
                    };
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
                        
                        if (payload.type === 'vfs' && payload.sourcePath) {
                          const fileName = payload.sourcePath.split('/').pop() || '';
                          const destPath = `${fullPath}/${fileName}`;
                          
                          if (payload.sourcePath !== destPath && !destPath.startsWith(payload.sourcePath + '/')) {
                            await vfs.mv(payload.sourcePath, destPath, '/');
                          }
                        }
                      } catch (err) {
                        console.error('Drop to folder failed:', err);
                      }
                    }
                  }}
                  onDoubleClick={() => handleDoubleClick(node)}
                  onContextMenu={(e) => handleContextMenu(e, node)}
                  className={`flex flex-col items-center justify-start p-2 rounded cursor-pointer group transition-colors select-none text-center ${dragOverFolderId === node.id ? 'bg-blue-500/30' : 'hover:bg-white/10'}`}
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
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-slate-800 border-t border-white/10 flex items-center px-4 text-xs text-slate-400">
        {nodes.length} item{nodes.length !== 1 && 's'}
      </div>
    </div>
  );
};
