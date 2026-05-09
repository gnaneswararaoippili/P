import React, { useState, useEffect, useRef } from 'react';
import { useProcesses, type Process } from '../../context/ProcessContext';
import { X, Minus, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResizeHandle, type ResizeDirection } from './ResizeHandle';
import { cn } from '../../utils/cn';
import { TerminalApp } from '../../apps/terminal/TerminalApp';
import { ExplorerApp } from '../../apps/explorer/ExplorerApp';
import { EditorApp } from '../../apps/editor/EditorApp';
import { TaskManagerApp } from '../../apps/taskmanager/TaskManagerApp';
import { SettingsApp } from '../../apps/settings/SettingsApp';

export const Window = ({ process }: { process: Process }) => {
  const { closeProcess, minimizeProcess, focusProcess, updateProcessBounds } = useProcesses();

  // Local render state — updated every animation frame during drag for 60fps
  const [localBounds, setLocalBounds] = useState({
    x: process.x,
    y: process.y,
    w: process.width,
    h: process.height,
  });
  const [snapPreview, setSnapPreview] = useState<'left' | 'right' | 'maximized' | null>(null);

  // Refs so our document-level handlers always see fresh values without stale closures
  const localBoundsRef = useRef(localBounds);
  const snapPreviewRef = useRef(snapPreview);
  const interactionMode = useRef<'move' | ResizeDirection | 'none'>('none');
  const pointerStart = useRef({ x: 0, y: 0 });
  const initialBounds = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const isDraggingWindow = useRef(false);
  // Store references to the bound handlers so we can properly remove them
  const boundMoveHandler = useRef<((e: PointerEvent) => void) | null>(null);
  const boundUpHandler = useRef<((e: PointerEvent) => void) | null>(null);

  // Keep refs in sync with state
  useEffect(() => { localBoundsRef.current = localBounds; }, [localBounds]);
  useEffect(() => { snapPreviewRef.current = snapPreview; }, [snapPreview]);

  // Sync from global compositor (e.g. after snap commit or external update)
  useEffect(() => {
    if (!isDraggingWindow.current) {
      const next = { x: process.x, y: process.y, w: process.width, h: process.height };
      setLocalBounds(next);
      localBoundsRef.current = next;
    }
  }, [process.x, process.y, process.width, process.height]);

  const toggleMaximize = () => {
    if (process.windowState === 'maximized') {
      updateProcessBounds(process.id, { windowState: 'normal' });
    } else {
      updateProcessBounds(process.id, { windowState: 'maximized' });
    }
  };

  // Document-level handlers — using refs so they never have stale closure values
  const onDocumentPointerMove = (e: PointerEvent) => {
    if (interactionMode.current === 'none') return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const ib = initialBounds.current;
    const newBounds = { ...ib };

    if (interactionMode.current === 'move') {
      newBounds.x = ib.x + dx;
      newBounds.y = ib.y + dy;

      // Snap zone detection
      let snap: 'left' | 'right' | 'maximized' | null = null;
      if (e.clientX < 8) snap = 'left';
      else if (e.clientX > window.innerWidth - 8) snap = 'right';
      else if (e.clientY < 4) snap = 'maximized';

      if (snap !== snapPreviewRef.current) {
        snapPreviewRef.current = snap;
        setSnapPreview(snap);
      }
    } else {
      const dir = interactionMode.current;
      const minW = 300, minH = 200;
      if (dir.includes('e')) newBounds.w = Math.max(minW, ib.w + dx);
      if (dir.includes('s')) newBounds.h = Math.max(minH, ib.h + dy);
      if (dir.includes('w')) {
        const pw = ib.w - dx;
        if (pw >= minW) { newBounds.w = pw; newBounds.x = ib.x + dx; }
      }
      if (dir.includes('n')) {
        const ph = ib.h - dy;
        if (ph >= minH) { newBounds.h = ph; newBounds.y = ib.y + dy; }
      }
    }

    localBoundsRef.current = newBounds;
    setLocalBounds({ ...newBounds });
  };

  const onDocumentPointerUp = () => {
    if (interactionMode.current === 'none') return;

    // Remove listeners using stored refs
    if (boundMoveHandler.current) document.removeEventListener('pointermove', boundMoveHandler.current);
    if (boundUpHandler.current) document.removeEventListener('pointerup', boundUpHandler.current);
    boundMoveHandler.current = null;
    boundUpHandler.current = null;

    const finalBounds = localBoundsRef.current;
    const currentSnap = snapPreviewRef.current;
    const prevWindowState = process.windowState;

    let nextState = prevWindowState;
    if (interactionMode.current === 'move' && currentSnap) {
      nextState = currentSnap === 'left' ? 'snapped-left'
                : currentSnap === 'right' ? 'snapped-right'
                : 'maximized';
    } else if (prevWindowState !== 'normal' && interactionMode.current !== 'move') {
      nextState = 'normal';
    }

    interactionMode.current = 'none';
    isDraggingWindow.current = false;
    snapPreviewRef.current = null;
    setSnapPreview(null);

    updateProcessBounds(process.id, {
      x: finalBounds.x,
      y: finalBounds.y,
      width: finalBounds.w,
      height: finalBounds.h,
      windowState: nextState,
    });
  };

  const startInteraction = (e: React.PointerEvent, mode: 'move' | ResizeDirection) => {
    if (e.button !== 0) return;
    if (mode === 'move' && process.windowState === 'maximized') return;

    e.preventDefault();
    e.stopPropagation();
    focusProcess(process.id);

    interactionMode.current = mode;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    initialBounds.current = { ...localBoundsRef.current };
    isDraggingWindow.current = true;

    // Bind and store handlers so we can remove the exact same references
    boundMoveHandler.current = onDocumentPointerMove;
    boundUpHandler.current = onDocumentPointerUp;

    // Use capture phase so we get events before HTML5 drag handlers
    document.addEventListener('pointermove', boundMoveHandler.current);
    document.addEventListener('pointerup', boundUpHandler.current);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (boundMoveHandler.current) document.removeEventListener('pointermove', boundMoveHandler.current);
      if (boundUpHandler.current) document.removeEventListener('pointerup', boundUpHandler.current);
    };
  }, []);

  // Compute rendered geometry
  const isMaximized = process.windowState === 'maximized';
  const isSnappedLeft = process.windowState === 'snapped-left';
  const isSnappedRight = process.windowState === 'snapped-right';
  const isSpecialState = isMaximized || isSnappedLeft || isSnappedRight;

  let renderLeft: string | number = localBounds.x;
  let renderTop: string | number = localBounds.y;
  let renderW: string | number = localBounds.w;
  let renderH: string | number = localBounds.h;

  if (isMaximized) {
    renderLeft = 0; renderTop = 0; renderW = '100vw'; renderH = 'calc(100vh - 3rem)';
  } else if (isSnappedLeft) {
    renderLeft = 0; renderTop = 0; renderW = '50vw'; renderH = 'calc(100vh - 3rem)';
  } else if (isSnappedRight) {
    renderLeft = '50vw'; renderTop = 0; renderW = '50vw'; renderH = 'calc(100vh - 3rem)';
  }

  return (
    <>
      {/* Snap Preview Overlay */}
      {snapPreview && (
        <div
          className="fixed z-30 bg-blue-500/20 border-2 border-blue-400/50 pointer-events-none rounded-xl"
          style={{
            top: 0,
            height: 'calc(100vh - 3rem)',
            left: snapPreview === 'right' ? '50vw' : 0,
            width: snapPreview === 'maximized' ? '100vw' : '50vw',
            transition: 'left 0.1s, width 0.1s',
          }}
        />
      )}

      <AnimatePresence>
        {!process.isMinimized && (
          <motion.div
            key={process.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            onMouseDown={() => focusProcess(process.id)}
            style={{
              position: 'absolute',
              left: renderLeft,
              top: renderTop,
              width: renderW,
              height: renderH,
              zIndex: process.zIndex,
              transition: isSpecialState && !isDraggingWindow.current
                ? 'left 0.25s ease-out, top 0.25s ease-out, width 0.25s ease-out, height 0.25s ease-out'
                : undefined,
            }}
            className={cn(
              'flex flex-col overflow-hidden bg-slate-900/90 border border-white/20 shadow-2xl backdrop-blur-2xl',
              isSpecialState ? 'rounded-none' : 'rounded-xl',
              process.isFocused ? 'border-white/30 shadow-blue-500/10' : 'opacity-95'
            )}
          >
            {/* Resize Handles */}
            {process.windowState === 'normal' && (
              <>
                <ResizeHandle direction="n" onPointerDown={startInteraction} />
                <ResizeHandle direction="s" onPointerDown={startInteraction} />
                <ResizeHandle direction="e" onPointerDown={startInteraction} />
                <ResizeHandle direction="w" onPointerDown={startInteraction} />
                <ResizeHandle direction="ne" onPointerDown={startInteraction} />
                <ResizeHandle direction="nw" onPointerDown={startInteraction} />
                <ResizeHandle direction="se" onPointerDown={startInteraction} />
                <ResizeHandle direction="sw" onPointerDown={startInteraction} />
              </>
            )}

            {/* Title Bar */}
            <div
              onPointerDown={(e) => startInteraction(e, 'move')}
              onDoubleClick={toggleMaximize}
              className="h-10 bg-black/50 border-b border-white/10 flex items-center justify-between px-3 select-none shrink-0"
              style={{ cursor: process.windowState === 'normal' ? 'move' : 'default', touchAction: 'none' }}
            >
              <span className="text-white text-sm font-medium truncate">{process.name}</span>
              <div
                className="flex items-center gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => minimizeProcess(process.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={toggleMaximize}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-white/20 text-white transition-colors"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  <Square className="w-3 h-3" />
                </button>
                <button
                  onClick={() => closeProcess(process.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white text-slate-300 transition-colors"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/50 min-h-0">
              {process.id === 'terminal' ? (
                <TerminalApp pid={process.id} args={process.args} />
              ) : process.id === 'explorer' ? (
                <ExplorerApp />
              ) : process.id === 'taskmanager' ? (
                <TaskManagerApp />
              ) : process.id === 'settings' ? (
                <SettingsApp />
              ) : process.id.startsWith('editor') ? (
                <EditorApp args={process.args} />
              ) : (
                <div className="p-4 text-white overflow-auto flex-1">
                  <h2 className="text-xl font-bold mb-2">Welcome to {process.name}</h2>
                  <p className="text-sm text-slate-400">
                    This is a dummy window. Actual application content will be rendered here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
