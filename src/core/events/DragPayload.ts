export interface DragPayload {
  type: 'vfs' | 'app';
  sourcePath?: string;      // The absolute VFS path (e.g. '/home/guest/file.txt')
  appId?: string;           // The AppRegistry ID if dragging an application
  sourceContext: 'desktop' | 'explorer';
  offsetX?: number;
  offsetY?: number;
}

export const DRAG_MIME_TYPE = 'application/x-webos-payload';
