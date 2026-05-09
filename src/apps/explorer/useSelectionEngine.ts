import { useState, useCallback, useEffect } from 'react';
import type { VFSNode } from '../../core/fs/types';

export const useSelectionEngine = (nodes: VFSNode[], currentPath: string) => {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [anchorPath, setAnchorPath] = useState<string | null>(null);

  // Clear selection on path change
  useEffect(() => {
    setSelectedPaths(new Set());
    setAnchorPath(null);
  }, [currentPath]);

  const getFullPath = (node: VFSNode) => 
    currentPath === '/' ? `/${node.name}` : `${currentPath}/${node.name}`;

  const handlePointerDown = useCallback((e: React.PointerEvent | React.MouseEvent, node: VFSNode) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const path = getFullPath(node);

    setSelectedPaths(prev => {
      const next = new Set(prev);

      if (isCtrl) {
        // Toggle selection
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
          setAnchorPath(path);
        }
      } else if (isShift) {
        // Range selection
        if (!anchorPath) {
          next.add(path);
          setAnchorPath(path);
        } else {
          // Find indices
          const anchorIdx = nodes.findIndex(n => getFullPath(n) === anchorPath);
          const currentIdx = nodes.findIndex(n => getFullPath(n) === path);

          if (anchorIdx !== -1 && currentIdx !== -1) {
            const start = Math.min(anchorIdx, currentIdx);
            const end = Math.max(anchorIdx, currentIdx);

            // If we don't hold ctrl with shift, we clear previous selection
            next.clear();
            
            for (let i = start; i <= end; i++) {
              next.add(getFullPath(nodes[i]));
            }
          }
        }
      } else {
        // Single selection pointer down (don't clear if already selected, to allow dragging)
        if (!next.has(path)) {
          next.clear();
          next.add(path);
        }
        setAnchorPath(path);
      }

      return next;
    });
  }, [anchorPath, nodes, currentPath]);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
    setAnchorPath(null);
  }, []);

  const selectAll = useCallback(() => {
    const allPaths = new Set(nodes.map(n => getFullPath(n)));
    setSelectedPaths(allPaths);
  }, [nodes, currentPath]);

  return {
    selectedPaths,
    setSelectedPaths,
    handlePointerDown,
    clearSelection,
    selectAll,
    getFullPath
  };
};
