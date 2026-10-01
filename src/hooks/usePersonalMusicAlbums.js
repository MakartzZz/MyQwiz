import { useCallback, useEffect, useRef, useState } from "react";
import { personalMusicStorage } from "../services/personalMusicStorage.js";

const createId = (prefix) => (
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
);

const normalizeHexColor = (color) => (
  /^#[0-9a-f]{6}$/i.test(color ?? "") ? color : "#49623b"
);

const readableForeground = (color) => {
  const normalized = normalizeHexColor(color).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 150 ? "#17211b" : "#fff8ec";
};

export const createPersonalAlbumCover = (requestedColor) => {
  const color = normalizeHexColor(requestedColor);
  const foreground = readableForeground(color);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="${color}"/>
      <circle cx="418" cy="82" r="126" fill="${foreground}" opacity=".09"/>
      <circle cx="76" cy="448" r="158" fill="${foreground}" opacity=".07"/>
      <path fill="none" stroke="${foreground}" stroke-width="18" stroke-linecap="round" opacity=".16" d="M54 116h92m220 278h92M86 82l52 52m236 236 52 52"/>
      <g transform="translate(64 80) scale(4)">
        <path fill="${foreground}" d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z"/>
        <rect x="30" y="46" width="11" height="24" rx="5.5" fill="${color}"/>
        <rect x="55" y="46" width="11" height="24" rx="5.5" fill="${color}"/>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const releaseAlbumUrls = (albums) => {
  albums.forEach((album) => {
    album.tracks.forEach((track) => {
      if (track.src?.startsWith("blob:")) URL.revokeObjectURL(track.src);
    });
  });
};

const hydrateAlbums = (records) => records.map((album) => ({
  ...album,
  isPersonal: true,
  cover: createPersonalAlbumCover(album.color),
  tracks: album.tracks.map((track) => ({
    ...track,
    src: URL.createObjectURL(track.blob),
  })),
}));

const serializeAlbum = (album) => ({
  id: album.id,
  title: album.title.trim(),
  color: normalizeHexColor(album.color),
  createdAt: album.createdAt,
  updatedAt: album.updatedAt,
  tracks: album.tracks.map(({ src: _src, ...track }) => track),
});

export function usePersonalMusicAlbums() {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageEstimate, setStorageEstimate] = useState(null);
  const albumsRef = useRef([]);
  const mountedRef = useRef(true);

  const replaceAlbums = useCallback((records) => {
    const hydrated = hydrateAlbums(records);
    if (!mountedRef.current) {
      releaseAlbumUrls(hydrated);
      return;
    }
    releaseAlbumUrls(albumsRef.current);
    albumsRef.current = hydrated;
    setAlbums(hydrated);
  }, []);

  const refreshStorageEstimate = useCallback(async () => {
    const estimate = await personalMusicStorage.getStorageEstimate();
    if (mountedRef.current) setStorageEstimate(estimate);
  }, []);

  const reload = useCallback(async () => {
    const records = await personalMusicStorage.getAll();
    replaceAlbums(records);
    await refreshStorageEstimate();
    return records;
  }, [refreshStorageEstimate, replaceAlbums]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    personalMusicStorage.getAll()
      .then((records) => {
        if (active) replaceAlbums(records);
      })
      .catch(() => {
        if (active) replaceAlbums([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    void refreshStorageEstimate();

    return () => {
      active = false;
      mountedRef.current = false;
      releaseAlbumUrls(albumsRef.current);
      albumsRef.current = [];
    };
  }, [refreshStorageEstimate, replaceAlbums]);

  const saveAlbum = useCallback(async (draft) => {
    const now = new Date().toISOString();
    const album = serializeAlbum({
      ...draft,
      id: draft.id ?? createId("personal-album"),
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
      tracks: draft.tracks.map((track) => ({
        ...track,
        id: track.id ?? createId("personal-track"),
      })),
    });
    await personalMusicStorage.save(album);
    void personalMusicStorage.requestPersistence();
    await reload();
    return album.id;
  }, [reload]);

  const deleteAlbum = useCallback(async (albumId) => {
    await personalMusicStorage.remove(albumId);
    await reload();
  }, [reload]);

  return {
    albums,
    isLoading,
    storageEstimate,
    saveAlbum,
    deleteAlbum,
  };
}

