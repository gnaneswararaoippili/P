import React, { useState, useEffect } from 'react';
import { DesktopLayoutManager, type DesktopNode, type DesktopVfsNode, type DesktopAppNode } from '../../core/desktop/DesktopLayoutManager';
import { type DragPayload, DRAG_MIME_TYPE } from '../../core/events/DragPayload';

interface DraggableIconProps {
  node: DesktopNode;
  icon: React.ReactNode;
  name: string;
  onDoubleClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectedVfsPaths?: string[]; // passed when multiple are selected
  selectedAppIds?: string[]; // passed when multiple apps are selected
}

export const DraggableIcon = ({ node, icon, name, onDoubleClick, onContextMenu, isSelected, onClick, onPointerDown, selectedVfsPaths = [], selectedAppIds = [] }: DraggableIconProps) => {
  const [pos, setPos] = useState({ x: node.col * DesktopLayoutManager.GRID_SIZE, y: node.row * DesktopLayoutManager.GRID_SIZE });

  // Sync position if layout changes externally
  useEffect(() => {
    setPos({
      x: node.col * DesktopLayoutManager.GRID_SIZE,
      y: node.row * DesktopLayoutManager.GRID_SIZE,
    });
  }, [node.col, node.row]);

  const handleDragStart = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    let payload: DragPayload;
    
    // Check if the current node is part of the selection. If not, we just drag this single node.
    let isNodeSelected = false;
    if (node.type === 'vfs') {
      isNodeSelected = selectedVfsPaths.includes((node as DesktopVfsNode).path);
    } else {
      isNodeSelected = selectedAppIds.includes((node as DesktopAppNode).id);
    }

    const dragVfsPaths = isNodeSelected ? selectedVfsPaths : (node.type === 'vfs' ? [(node as DesktopVfsNode).path] : []);
    const dragAppIds = isNodeSelected ? selectedAppIds : (node.type === 'app' ? [(node as DesktopAppNode).id] : []);
    
    const totalItems = dragVfsPaths.length + dragAppIds.length;

    if (dragVfsPaths.length > 0 && dragAppIds.length > 0) {
      payload = {
        type: 'mixed',
        sourcePaths: dragVfsPaths,
        appIds: dragAppIds,
        sourceContext: 'desktop',
        offsetX,
        offsetY
      };
    } else if (dragVfsPaths.length > 0) {
      payload = {
        type: 'vfs',
        sourcePath: dragVfsPaths[0],
        sourcePaths: dragVfsPaths,
        sourceContext: 'desktop',
        offsetX,
        offsetY
      };
    } else {
      payload = {
        type: 'app',
        appId: dragAppIds[0],
        appIds: dragAppIds,
        sourceContext: 'desktop',
        offsetX,
        offsetY
      };
    }

    if (totalItems > 1) {
      const badge = document.createElement('div');
      badge.className = 'bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold fixed top-[-1000px] left-[-1000px] z-50';
      badge.textContent = `${totalItems} items`;
      document.body.appendChild(badge);
      e.dataTransfer.setDragImage(badge, 0, 0);
      setTimeout(() => {
        if (document.body.contains(badge)) document.body.removeChild(badge);
      }, 100);
    }
    
    e.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add custom class or state if we wanted drag feedback, 
    // but native HTML5 ghost is usually sufficient.
  };

  return (
    <div
      draggable
      data-id={node.id}
      onDragStart={handleDragStart}
      className={`desktop-icon absolute flex flex-col items-center justify-center rounded-lg cursor-pointer transition-transform group select-none z-0
        ${isSelected ? 'bg-blue-500/40 border border-blue-400/50' : 'hover:bg-white/10 border border-transparent'}
      `}
      style={{
        width: DesktopLayoutManager.GRID_SIZE,
        height: DesktopLayoutManager.GRID_SIZE,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`
      }}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
      onPointerDown={(e) => {
        if (onPointerDown) onPointerDown(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.stopPropagation();
          onContextMenu(e);
        }
      }}
    >
      <div className="mb-2 drop-shadow-lg group-hover:scale-110 transition-transform pointer-events-none">
        {icon}
      </div>
      <span className="text-white text-xs font-medium text-center drop-shadow-md tracking-wide px-1 py-0.5 rounded group-hover:bg-blue-600/50 pointer-events-none break-words line-clamp-2 w-full">
        {name}
      </span>
    </div>
  );
};
