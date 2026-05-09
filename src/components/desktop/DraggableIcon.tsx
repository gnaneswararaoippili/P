import React, { useState, useEffect } from 'react';
import { DesktopLayoutManager, type DesktopNode, type DesktopVfsNode, type DesktopAppNode } from '../../core/desktop/DesktopLayoutManager';
import { type DragPayload, DRAG_MIME_TYPE } from '../../core/events/DragPayload';

interface DraggableIconProps {
  node: DesktopNode;
  icon: React.ReactNode;
  name: string;
  onDoubleClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const DraggableIcon = ({ node, icon, name, onDoubleClick, onContextMenu }: DraggableIconProps) => {
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
    if (node.type === 'vfs') {
      payload = {
        type: 'vfs',
        sourcePath: (node as DesktopVfsNode).path,
        sourceContext: 'desktop',
        offsetX,
        offsetY
      };
    } else {
      payload = {
        type: 'app',
        appId: (node as DesktopAppNode).id,
        sourceContext: 'desktop',
        offsetX,
        offsetY
      };
    }
    
    e.dataTransfer.setData(DRAG_MIME_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add custom class or state if we wanted drag feedback, 
    // but native HTML5 ghost is usually sufficient.
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`absolute flex flex-col items-center justify-center hover:bg-white/10 rounded-lg cursor-pointer transition-transform group select-none z-0`}
      style={{
        width: DesktopLayoutManager.GRID_SIZE,
        height: DesktopLayoutManager.GRID_SIZE,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`
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
