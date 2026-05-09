type EventCallback = (payload: any) => void;

/**
 * OS Event Bus
 * Generic Pub/Sub architecture for Inter-Process Communication and System Events.
 * 
 * Event Namespacing Conventions:
 * - vfs: (e.g. vfs:changed)
 * - process: (e.g. process:spawned, process:killed)
 * - window: (e.g. window:focused)
 * - system: (e.g. system:boot)
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit(event: string, payload?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      // Create a copy of the Set to iterate over safely in case
      // callbacks unsubscribe themselves during execution.
      const callbacks = Array.from(eventListeners);
      callbacks.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error executing event listener for ${event}:`, err);
        }
      });
    }
  }
}

export const osEvents = EventBus.getInstance();
