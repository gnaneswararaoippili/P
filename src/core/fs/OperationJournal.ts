import { vfs } from './FileSystem';
import { osEvents } from '../events/EventBus';

export type OperationType = 'copy' | 'move' | 'delete' | 'create' | 'rename';

export interface FileOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  
  // Payloads to reverse the operation
  sourcePaths?: string[]; // Where items came from
  destPaths?: string[]; // Where items went
  
  // For creations or deletions, what was created/deleted
  targetPaths?: string[];
}

class OperationJournalImpl {
  private history: FileOperation[] = [];
  private redoStack: FileOperation[] = [];
  
  // Prevent tracking operations triggered by undo/redo themselves
  private isReplaying = false;

  public log(operation: Omit<FileOperation, 'id' | 'timestamp'>) {
    if (this.isReplaying) return;
    
    this.history.push({
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    });
    
    // Clear redo stack when a new operation occurs
    this.redoStack = [];
    osEvents.emit('journal:updated', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public async undo() {
    if (!this.canUndo() || this.isReplaying) return;
    
    const op = this.history.pop()!;
    this.isReplaying = true;
    
    try {
      switch (op.type) {
        case 'move':
        case 'rename':
          // Revert move/rename by moving destPaths back to sourcePaths
          if (op.destPaths && op.sourcePaths) {
            for (let i = 0; i < op.destPaths.length; i++) {
              await vfs.mv(op.destPaths[i], op.sourcePaths[i], '/');
            }
          }
          break;
        case 'copy':
          // Revert copy by deleting the copies (destPaths)
          if (op.destPaths) {
            for (const p of op.destPaths) {
              await vfs.rm(p, '/');
            }
          }
          break;
        case 'create':
          // Revert create by deleting the created items
          if (op.targetPaths) {
            for (const p of op.targetPaths) {
              await vfs.rm(p, '/');
            }
          }
          break;
        case 'delete':
          // Revert soft-delete by moving from trash back to source
          if (op.sourcePaths && op.destPaths) { // destPaths is the trash location
            for (let i = 0; i < op.destPaths.length; i++) {
              await vfs.mv(op.destPaths[i], op.sourcePaths[i], '/');
            }
          }
          break;
      }
      
      this.redoStack.push(op);
      osEvents.emit('journal:updated', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    } catch (e) {
      console.error('Failed to undo operation', e);
      // If undo fails, push it back to history to prevent state loss
      this.history.push(op);
    } finally {
      this.isReplaying = false;
    }
  }

  public async redo() {
    if (!this.canRedo() || this.isReplaying) return;
    
    const op = this.redoStack.pop()!;
    this.isReplaying = true;
    
    try {
      switch (op.type) {
        case 'move':
        case 'rename':
          if (op.sourcePaths && op.destPaths) {
            for (let i = 0; i < op.sourcePaths.length; i++) {
              await vfs.mv(op.sourcePaths[i], op.destPaths[i], '/');
            }
          }
          break;
        case 'copy':
          if (op.sourcePaths && op.destPaths) {
            for (let i = 0; i < op.sourcePaths.length; i++) {
              await vfs.cp(op.sourcePaths[i], op.destPaths[i], '/');
            }
          }
          break;
        case 'create':
          // Currently not storing content for full redo of files, but for folders it works
          // Or we can just leave create redo unimplemented for now, but usually it works via trash too
          break;
        case 'delete':
          if (op.sourcePaths) {
            for (const p of op.sourcePaths) {
              await vfs.rm(p, '/');
            }
          }
          break;
      }
      
      this.history.push(op);
      osEvents.emit('journal:updated', { canUndo: this.canUndo(), canRedo: this.canRedo() });
    } catch (e) {
      console.error('Failed to redo operation', e);
      this.redoStack.push(op);
    } finally {
      this.isReplaying = false;
    }
  }
}

export const OperationJournal = new OperationJournalImpl();
