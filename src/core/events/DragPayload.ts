export interface DragPayload {
  type: 'vfs' | 'app' | 'mixed';
  sourcePath?: string;      // The absolute VFS path (e.g. '/home/guest/file.txt')
  sourcePaths?: string[];   // Array of paths for batch operations
  appId?: string;           // The AppRegistry ID if dragging an application
  appIds?: string[];        // Array of app IDs for batch operations
  sourceContext: 'desktop' | 'explorer';
  offsetX?: number;
  offsetY?: number;
}

export const DRAG_MIME_TYPE = 'application/x-webos-payload';
