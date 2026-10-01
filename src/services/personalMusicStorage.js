const DATABASE_NAME = "myqwiz-personal-music";
const DATABASE_VERSION = 1;
const ALBUM_STORE = "albums";

const requestResult = (request) => new Promise((resolve, reject) => {
  request.addEventListener("success", () => resolve(request.result), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const transactionFinished = (transaction) => new Promise((resolve, reject) => {
  transaction.addEventListener("complete", resolve, { once: true });
  transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
  transaction.addEventListener("error", () => reject(transaction.error), { once: true });
});

const openDatabase = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("Este navegador no permite guardar álbumes personales."));
    return;
  }

  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(ALBUM_STORE)) {
      database.createObjectStore(ALBUM_STORE, { keyPath: "id" });
    }
  });
  request.addEventListener("success", () => resolve(request.result), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const withStore = async (mode, operation) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(ALBUM_STORE, mode);
    const completion = transactionFinished(transaction);
    const result = await operation(transaction.objectStore(ALBUM_STORE));
    await completion;
    return result;
  } finally {
    database.close();
  }
};

export const personalMusicStorage = {
  async getAll() {
    const albums = await withStore("readonly", (store) => requestResult(store.getAll()));
    return albums.sort((first, second) => (
      new Date(first.createdAt ?? 0) - new Date(second.createdAt ?? 0)
    ));
  },

  async save(album) {
    await withStore("readwrite", (store) => requestResult(store.put(album)));
    return album;
  },

  async remove(albumId) {
    await withStore("readwrite", (store) => requestResult(store.delete(albumId)));
  },

  async requestPersistence() {
    if (!navigator.storage?.persist) return false;
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  },

  async getStorageEstimate() {
    if (!navigator.storage?.estimate) return null;
    try {
      return await navigator.storage.estimate();
    } catch {
      return null;
    }
  },
};

