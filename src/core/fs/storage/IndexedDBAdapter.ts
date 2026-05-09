import type { StorageAdapter, SerializedFileSystem } from './types';

const DB_NAME = 'WebOS_FileSystem';
const STORE_NAME = 'vfs_store';
const RECORD_ID = 'vfs_root'; // We only store one big record for now

export class IndexedDBAdapter implements StorageAdapter {
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    });
  }

  async load(): Promise<SerializedFileSystem | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(RECORD_ID);

      request.onsuccess = () => {
        resolve(request.result ? (request.result as SerializedFileSystem) : null);
      };
      request.onerror = () => reject(new Error('Failed to load VFS from IndexedDB'));
    });
  }

  async save(data: SerializedFileSystem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, RECORD_ID);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save VFS to IndexedDB'));
    });
  }
}
