import { osEvents } from '../events/EventBus';

export type ClipboardAction = 'copy' | 'cut';

export interface ClipboardState {
  action: ClipboardAction;
  paths: string[];
}

class ClipboardManagerImpl {
  private state: ClipboardState | null = null;

  public setClipboard(action: ClipboardAction, paths: string[]) {
    this.state = { action, paths };
    osEvents.emit('clipboard:changed', this.state);
  }

  public getClipboard(): ClipboardState | null {
    return this.state;
  }

  public clear() {
    this.state = null;
    osEvents.emit('clipboard:changed', null);
  }
}

export const ClipboardManager = new ClipboardManagerImpl();
