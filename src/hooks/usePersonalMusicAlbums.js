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

const hydrateAlbumMetadata = (album) => ({
  ...album,
  isPersonal: true,
  cover: createPersonalAlbumCover(album.color),
  tracks: (album.tracks ?? []).map(({ blob: _blob, src: _src, albumId: _albumId, ...track }) => track),
});

const serializeAlbum = (album) => ({
  id: album.id,
  title: album.title.trim(),
  color: normalizeHexColor(album.color),
  createdAt: album.createdAt,
  updatedAt: album.updatedAt,
  tracks: album.tracks.map(({ src: _src, albumId: _albumId, ...track }) => track),
});

export function usePersonalMusicAlbums({
  enabled = true,
  activeAlbumId = null,
  activeTrackIndex = 0,
} = {}) {
  const [albums, setAlbums] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [storageEstimate, setStorageEstimate] = useState(null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const albumRecordsRef = useRef([]);
  const activeTrackUrlRef = useRef(null);
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);

  const releaseActiveTrackUrl = useCallback(() => {
    if (activeTrackUrlRef.current) URL.revokeObjectURL(activeTrackUrlRef.current);
    activeTrackUrlRef.current = null;
  }, []);

  const replaceAlbums = useCallback((records) => {
    albumRecordsRef.current = records;
    setAlbums(records.map(hydrateAlbumMetadata));
    setCatalogRevision((revision) => revision + 1);
  }, []);

  const refreshStorageEstimate = useCallback(async () => {
    const estimate = await personalMusicStorage.getStorageEstimate();
    if (mountedRef.current) setStorageEstimate(estimate);
  }, []);

  const reload = useCallback(async () => {
    const records = await personalMusicStorage.getAll();
    loadedRef.current = true;
    if (mountedRef.current) replaceAlbums(records);
    await refreshStorageEstimate();
    return records;
  }, [refreshStorageEstimate, replaceAlbums]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || loadedRef.current) {
      setIsLoading(false);
      return undefined;
    }

    let active = true;
    setIsLoading(true);
    personalMusicStorage.getAll()
      .then((records) => {
        loadedRef.current = true;
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
    };
  }, [enabled, refreshStorageEstimate, replaceAlbums]);

  useEffect(() => {
    releaseActiveTrackUrl();
    setAlbums(albumRecordsRef.current.map(hydrateAlbumMetadata));
    if (!enabled || !activeAlbumId?.startsWith("personal-album-")) return undefined;

    const album = albumRecordsRef.current.find((item) => item.id === activeAlbumId);
    const track = album?.tracks?.[activeTrackIndex] ?? album?.tracks?.[0];
    if (!track) return undefined;

    let active = true;
    let objectUrl = null;
    personalMusicStorage.getTrack(track.id).then((record) => {
      if (!active || !record?.blob) return;
      objectUrl = URL.createObjectURL(record.blob);
      activeTrackUrlRef.current = objectUrl;
      setAlbums(albumRecordsRef.current.map((item) => hydrateAlbumMetadata({
        ...item,
        tracks: item.id === activeAlbumId
          ? item.tracks.map((candidate) => (
            candidate.id === track.id ? { ...candidate, ...record, src: objectUrl } : candidate
          ))
          : item.tracks,
      })));
    }).catch(() => undefined);

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (activeTrackUrlRef.current === objectUrl) activeTrackUrlRef.current = null;
    };
  }, [activeAlbumId, activeTrackIndex, catalogRevision, enabled, releaseActiveTrackUrl]);

  useEffect(() => () => {
    mountedRef.current = false;
    releaseActiveTrackUrl();
    albumRecordsRef.current = [];
  }, [releaseActiveTrackUrl]);

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

  const loadAlbum = useCallback(async (albumId) => {
    const album = await personalMusicStorage.getAlbum(albumId);
    return album ? hydrateAlbumMetadata(album) : null;
  }, []);

  return {
    albums,
    isLoading,
    storageEstimate,
    saveAlbum,
    deleteAlbum,
    loadAlbum,
  };
}
