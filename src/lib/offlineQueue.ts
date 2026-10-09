export interface SyncOperation {
  id: string;
  url: string;
  method: string;
  body?: any;
  timestamp: number;
  status: 'pending' | 'failed';
  retryCount: number;
}

const DB_NAME = 'autopro_offline_db';
const STORE_NAME = 'sync_queue';

export class OfflineQueue {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addOperation(url: string, method: string, body?: any): Promise<void> {
    if (!this.db) await this.init();
    
    const operation: SyncOperation = {
      id: crypto.randomUUID(),
      url,
      method,
      body,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(operation);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueueCount(): Promise<number> {
    const ops = await this.getPendingOperations();
    return ops.length;
  }

  async removeOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async processQueue() {
    if (!navigator.onLine) return;
    
    const operations = await this.getPendingOperations();
    for (const op of operations) {
      try {
        const response = await fetch(op.url, {
          method: op.method,
          headers: { 'Content-Type': 'application/json' },
          body: op.body ? JSON.stringify(op.body) : undefined
        });
        
        if (response.ok) {
          await this.removeOperation(op.id);
        } else {
          // Update retry count logic...
          console.error(`Failed to sync operation ${op.id}`);
        }
      } catch (error) {
        console.error(`Network error syncing operation ${op.id}`, error);
      }
    }
  }
}

export const syncQueue = new OfflineQueue();
