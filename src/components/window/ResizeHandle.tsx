import React from 'react';

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeHandleProps {
  direction: ResizeDirection;
  onPointerDown: (e: React.PointerEvent, dir: ResizeDirection) => void;
}

const getCursor = (dir: ResizeDirection) => {
  switch (dir) {
    case 'n': case 's': return 'ns-resize';
    case 'e': case 'w': return 'ew-resize';
    case 'ne': case 'sw': return 'nesw-resize';
    case 'nw': case 'se': return 'nwse-resize';
  }
};

const getPositionClass = (dir: ResizeDirection) => {
  switch (dir) {
    case 'n': return 'top-0 left-2 right-2 h-2';
    case 's': return 'bottom-0 left-2 right-2 h-2';
    case 'e': return 'right-0 top-2 bottom-2 w-2';
    case 'w': return 'left-0 top-2 bottom-2 w-2';
    case 'ne': return 'top-0 right-0 w-3 h-3';
    case 'nw': return 'top-0 left-0 w-3 h-3';
    case 'se': return 'bottom-0 right-0 w-3 h-3';
    case 'sw': return 'bottom-0 left-0 w-3 h-3';
  }
};

export const ResizeHandle = ({ direction, onPointerDown }: ResizeHandleProps) => {
  return (
    <div
      className={`absolute z-50 ${getPositionClass(direction)}`}
      style={{ cursor: getCursor(direction), touchAction: 'none' }}
      onPointerDown={(e) => onPointerDown(e, direction)}
    />
  );
};
