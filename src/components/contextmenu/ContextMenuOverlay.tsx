import { useState, useEffect, useRef } from 'react';
import { osEvents } from '../../core/events/EventBus';
import type { ContextMenuPayload, MenuItem } from '../../core/contextmenu/types';
import { ChevronRight } from 'lucide-react';

export const ContextMenuOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [items, setItems] = useState<MenuItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = (payload: ContextMenuPayload) => {
      setItems(payload.items);
      setPosition({ x: payload.x, y: payload.y });
      setIsOpen(true);
    };

    osEvents.on('contextmenu:open', handleOpen);
    return () => osEvents.off('contextmenu:open', handleOpen);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      
      // Auto adjust viewport bounds
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        
        let newX = position.x;
        let newY = position.y;
        
        if (position.x + rect.width > winWidth) {
          newX = winWidth - rect.width - 5;
        }
        if (position.y + rect.height > winHeight) {
          newY = winHeight - rect.height - 5;
        }
        
        if (newX !== position.x || newY !== position.y) {
          setPosition({ x: Math.max(5, newX), y: Math.max(5, newY) });
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, position.x, position.y]);

  if (!isOpen || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] min-w-[200px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-2xl py-1 overflow-hidden"
      style={{ top: position.y, left: position.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return <div key={item.id || `sep-${index}`} className="h-px bg-slate-200 dark:bg-white/10 my-1 mx-2" />;
        }
        
        return (
          <div
            key={item.id}
            onClick={(e) => {
              if (item.disabled) return;
              e.stopPropagation();
              setIsOpen(false);
              item.action?.();
            }}
            className={`
              flex items-center px-3 py-1.5 text-sm cursor-default select-none
              ${item.disabled 
                ? 'opacity-50 text-slate-500' 
                : 'hover:bg-blue-500 hover:text-white text-slate-800 dark:text-slate-200'
              }
            `}
          >
            {item.icon && <span className="mr-2 w-4 h-4 flex items-center justify-center">{item.icon}</span>}
            <span className="flex-1 text-left">{item.label}</span>
            {item.children && <ChevronRight className="w-4 h-4 ml-2" />}
          </div>
        );
      })}
    </div>
  );
};

