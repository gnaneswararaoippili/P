import { useState, useCallback } from 'react';

export const useExplorerNavigation = (initialPath: string) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [backStack, setBackStack] = useState<string[]>([]);
  const [forwardStack, setForwardStack] = useState<string[]>([]);

  const navigateTo = useCallback((path: string) => {
    if (path === currentPath) return;
    setBackStack((prev) => [...prev, currentPath]);
    setForwardStack([]);
    setCurrentPath(path);
  }, [currentPath]);

  const goBack = useCallback(() => {
    if (backStack.length === 0) return;
    const newBackStack = [...backStack];
    const prevPath = newBackStack.pop()!;
    
    setForwardStack((prev) => [...prev, currentPath]);
    setBackStack(newBackStack);
    setCurrentPath(prevPath);
  }, [backStack, currentPath]);

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return;
    const newForwardStack = [...forwardStack];
    const nextPath = newForwardStack.pop()!;
    
    setBackStack((prev) => [...prev, currentPath]);
    setForwardStack(newForwardStack);
    setCurrentPath(nextPath);
  }, [forwardStack, currentPath]);

  const goUp = useCallback(() => {
    if (currentPath === '/') return;
    
    const parts = currentPath.split('/').filter(p => p.length > 0);
    parts.pop();
    const parentPath = '/' + parts.join('/');
    
    navigateTo(parentPath);
  }, [currentPath, navigateTo]);

  return {
    currentPath,
    backStack,
    forwardStack,
    navigateTo,
    goBack,
    goForward,
    goUp,
    canGoBack: backStack.length > 0,
    canGoForward: forwardStack.length > 0,
    canGoUp: currentPath !== '/',
  };
};
