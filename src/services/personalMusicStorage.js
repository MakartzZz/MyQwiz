const DATABASE_NAME = "myqwiz-personal-music";
const DATABASE_VERSION = 2;
const ALBUM_STORE = "albums";
const TRACK_STORE = "tracks";
const TRACK_ALBUM_INDEX = "albumId";

const requestResult = (request) => new Promise((resolve, reject) => {
  request.addEventListener("success", () => resolve(request.result), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const transactionFinished = (transaction) => new Promise((resolve, reject) => {
  transaction.addEventListener("complete", resolve, { once: true });
  transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
  transaction.addEventListener("error", () => reject(transaction.error), { once: true });
});

const trackMetadata = ({ blob: _blob, src: _src, albumId: _albumId, ...track }) => track;

const migrateLegacyAlbums = (transaction, trackStore) => {
  const albumStore = transaction.objectStore(ALBUM_STORE);
  const cursorRequest = albumStore.openCursor();
  cursorRequest.addEventListener("success", () => {
    const cursor = cursorRequest.result;
    if (!cursor) return;
    const album = cursor.value;
    const tracks = (album.tracks ?? []).map((track) => {
      if (track.blob) trackStore.put({ ...track, albumId: album.id });
      return trackMetadata(track);
    });
    cursor.update({ ...album, tracks });
    cursor.continue();
  });
};

const openDatabase = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("Este navegador no permite guardar álbumes personales."));
    return;
  }

  const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.addEventListener("upgradeneeded", (event) => {
    const database = request.result;
    if (!database.objectStoreNames.contains(ALBUM_STORE)) {
      database.createObjectStore(ALBUM_STORE, { keyPath: "id" });
    }
    let trackStore;
    if (!database.objectStoreNames.contains(TRACK_STORE)) {
      trackStore = database.createObjectStore(TRACK_STORE, { keyPath: "id" });
      trackStore.createIndex(TRACK_ALBUM_INDEX, TRACK_ALBUM_INDEX, { unique: false });
    } else {
      trackStore = request.transaction.objectStore(TRACK_STORE);
    }
    if (event.oldVersion < 2) migrateLegacyAlbums(request.transaction, trackStore);
  });
  request.addEventListener("success", () => resolve(request.result), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const withStores = async (storeNames, mode, operation) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(storeNames, mode);
    const completion = transactionFinished(transaction);
    const result = await operation(transaction);
    await completion;
    return result;
  } finally {
    database.close();
  }
};

const sortAlbums = (albums) => albums.sort((first, second) => (
  new Date(first.createdAt ?? 0) - new Date(second.createdAt ?? 0)
));

export const personalMusicStorage = {
  async getAll() {
    const albums = await withStores([ALBUM_STORE], "readonly", (transaction) => (
      requestResult(transaction.objectStore(ALBUM_STORE).getAll())
    ));
    return sortAlbums(albums);
  },

  async getTrack(trackId) {
    if (!trackId) return null;
    return withStores([TRACK_STORE], "readonly", (transaction) => (
      requestResult(transaction.objectStore(TRACK_STORE).get(trackId))
    ));
  },

  async getAlbum(albumId) {
    return withStores([ALBUM_STORE, TRACK_STORE], "readonly", async (transaction) => {
      const albumPromise = requestResult(transaction.objectStore(ALBUM_STORE).get(albumId));
      const recordsPromise = requestResult(
        transaction.objectStore(TRACK_STORE).index(TRACK_ALBUM_INDEX).getAll(albumId),
      );
      const [album, records] = await Promise.all([albumPromise, recordsPromise]);
      if (!album) return null;
      const recordsById = new Map(records.map((track) => [track.id, track]));
      return {
        ...album,
        tracks: (album.tracks ?? []).map((track) => ({
          ...track,
          ...recordsById.get(track.id),
        })),
      };
    });
  },

  async save(album) {
    const existingIds = await withStores([TRACK_STORE], "readonly", (transaction) => (
      requestResult(transaction.objectStore(TRACK_STORE).index(TRACK_ALBUM_INDEX).getAllKeys(album.id))
    ));
    await withStores([ALBUM_STORE, TRACK_STORE], "readwrite", (transaction) => {
      const albumStore = transaction.objectStore(ALBUM_STORE);
      const trackStore = transaction.objectStore(TRACK_STORE);
      const nextIds = new Set(album.tracks.map((track) => track.id));
      existingIds.forEach((trackId) => {
        if (!nextIds.has(trackId)) trackStore.delete(trackId);
      });
      album.tracks.forEach((track) => {
        if (track.blob) trackStore.put({ ...track, src: undefined, albumId: album.id });
      });
      albumStore.put({
        ...album,
        tracks: album.tracks.map(trackMetadata),
      });
    });
    return album;
  },

  async remove(albumId) {
    const trackIds = await withStores([TRACK_STORE], "readonly", (transaction) => (
      requestResult(transaction.objectStore(TRACK_STORE).index(TRACK_ALBUM_INDEX).getAllKeys(albumId))
    ));
    await withStores([ALBUM_STORE, TRACK_STORE], "readwrite", (transaction) => {
      const trackStore = transaction.objectStore(TRACK_STORE);
      trackIds.forEach((trackId) => trackStore.delete(trackId));
      transaction.objectStore(ALBUM_STORE).delete(albumId);
    });
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
