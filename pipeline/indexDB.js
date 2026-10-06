const DB_NAME = "ThreePipelineDB";
const DB_VERSION = 2;

const META_STORE = "assets"; // lightweight records (listing is fast)
const BUFFER_STORE = "buffers"; // raw ArrayBuffers, keyed by asset id

class IndexDB {
  constructor() {
    this.db = null;
    this.opening = null;
  }

  open() {
    if (this.db) return Promise.resolve(this.db);
    if (this.opening) return this.opening;

    this.opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(META_STORE)) {
          const store = db.createObjectStore(META_STORE, {
            keyPath: "id",
          });
          store.createIndex("name", "name", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
        }

        // v2: binary data lives in its own store
        if (!db.objectStoreNames.contains(BUFFER_STORE)) {
          db.createObjectStore(BUFFER_STORE);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
          this.opening = null;
        };
        resolve(this.db);
      };

      request.onerror = () => {
        this.opening = null;
        reject(request.error);
      };
    });

    return this.opening;
  }

  /**
   * One helper for every operation.
   * `work(tx)` may return an IDBRequest; its result is what we resolve with
   * once the whole transaction has committed.
   */
  async run(stores, mode, work) {
    const db = await this.open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, mode);
      let result;

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      const request = work(tx);

      if (request) {
        request.onsuccess = () => {
          result = request.result;
        };
      }
    });
  }

  /** Save metadata (+ optional buffer) atomically. */
  async saveAsset(meta, buffer = null) {
    await this.run([META_STORE, BUFFER_STORE], "readwrite", (tx) => {
      tx.objectStore(META_STORE).put(meta);

      if (buffer) {
        tx.objectStore(BUFFER_STORE).put(buffer, meta.id);
      }
    });

    return meta;
  }

  async saveBuffer(id, buffer) {
    await this.run(BUFFER_STORE, "readwrite", (tx) =>
      tx.objectStore(BUFFER_STORE).put(buffer, id)
    );
  }

  async getAsset(id) {
    return (
      (await this.run(META_STORE, "readonly", (tx) =>
        tx.objectStore(META_STORE).get(id)
      )) || null
    );
  }

  async getBuffer(id) {
    return (
      (await this.run(BUFFER_STORE, "readonly", (tx) =>
        tx.objectStore(BUFFER_STORE).get(id)
      )) || null
    );
  }

  /** Metadata only: never pulls model bytes into memory. */
  async getAllAssets() {
    return (
      (await this.run(META_STORE, "readonly", (tx) =>
        tx.objectStore(META_STORE).getAll()
      )) || []
    );
  }

  async deleteAsset(id) {
    await this.run([META_STORE, BUFFER_STORE], "readwrite", (tx) => {
      tx.objectStore(META_STORE).delete(id);
      tx.objectStore(BUFFER_STORE).delete(id);
    });

    return true;
  }

  async clearAssets() {
    await this.run([META_STORE, BUFFER_STORE], "readwrite", (tx) => {
      tx.objectStore(META_STORE).clear();
      tx.objectStore(BUFFER_STORE).clear();
    });

    return true;
  }
}

export const database = new IndexDB();