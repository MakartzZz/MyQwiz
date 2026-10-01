import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, HardDrive, Music2, Plus, Trash2 } from "lucide-react";
import { PersonalAlbumCover } from "./PersonalAlbumCover.jsx";

const AUDIO_EXTENSIONS = ["mp3", "m4a", "aac", "ogg", "wav", "webm"];
const COVER_COLORS = ["#49623b", "#2389dc", "#171a1c", "#ef5f9b", "#d98e3d", "#7656c9"];

const createId = () => (
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const titleFromFilename = (filename) => filename
  .replace(/\.[^.]+$/, "")
  .replace(/[-_]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const isSupportedAudio = (file) => {
  if (file.type.startsWith("audio/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return AUDIO_EXTENSIONS.includes(extension);
};

const formatBytes = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function PersonalAlbumModal({ album, storageEstimate, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTitle(album?.title ?? "");
    setColor(album?.color ?? COVER_COLORS[0]);
    setTracks((album?.tracks ?? []).map(({ src: _src, ...track }) => track));
    setError("");
    setConfirmDelete(false);
  }, [album]);

  const totalSize = tracks.reduce((sum, track) => sum + (track.size ?? track.blob?.size ?? 0), 0);
  const originalSize = (album?.tracks ?? []).reduce(
    (sum, track) => sum + (track.size ?? track.blob?.size ?? 0),
    0,
  );
  const additionalSize = Math.max(0, totalSize - originalSize);
  const availableStorage = storageEstimate?.quota && storageEstimate?.usage != null
    ? Math.max(0, storageEstimate.quota - storageEstimate.usage)
    : null;

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    const validFiles = selectedFiles.filter(isSupportedAudio);
    if (validFiles.length !== selectedFiles.length) {
      setError("Algunos archivos no parecen ser pistas de audio compatibles.");
    } else {
      setError("");
    }

    setTracks((current) => {
      const knownFiles = new Set(current.map((track) => `${track.fileName}-${track.size}`));
      const additions = validFiles
        .filter((file) => !knownFiles.has(`${file.name}-${file.size}`))
        .map((file) => ({
          id: `personal-track-${createId()}`,
          title: titleFromFilename(file.name) || "Pista sin título",
          fileName: file.name,
          type: file.type || "audio/mpeg",
          size: file.size,
          blob: file,
        }));
      return [...current, ...additions];
    });
  };

  const updateTrackTitle = (trackId, nextTitle) => {
    setTracks((current) => current.map((track) => (
      track.id === trackId ? { ...track, title: nextTitle } : track
    )));
  };

  const moveTrack = (index, direction) => {
    const destination = index + direction;
    if (destination < 0 || destination >= tracks.length) return;
    setTracks((current) => {
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  const removeTrack = (trackId) => {
    setTracks((current) => current.filter((track) => track.id !== trackId));
  };

  const submit = async (event) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedTracks = tracks.map((track) => ({ ...track, title: track.title.trim() }));
    if (!normalizedTitle) {
      setError("Ponle un nombre al álbum.");
      return;
    }
    if (!normalizedTracks.length) {
      setError("Agrega al menos una pista antes de guardar el álbum.");
      return;
    }
    if (normalizedTracks.some((track) => !track.title)) {
      setError("Todas las pistas necesitan un nombre.");
      return;
    }
    if (availableStorage != null && additionalSize > availableStorage) {
      setError("No hay suficiente espacio disponible en este navegador para guardar las pistas.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave({
        id: album?.id,
        createdAt: album?.createdAt,
        title: normalizedTitle,
        color,
        tracks: normalizedTracks,
      });
    } catch (saveError) {
      setError(saveError?.name === "QuotaExceededError"
        ? "El navegador no tiene espacio suficiente para guardar este álbum."
        : "No pudimos guardar el álbum en este navegador.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAlbum = async () => {
    if (!album) return;
    setIsDeleting(true);
    setError("");
    try {
      await onDelete(album.id);
    } catch {
      setError("No pudimos eliminar el álbum.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="quiz-modal personal-album-modal" role="dialog" aria-modal="true" aria-labelledby="personal-album-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Álbum personal</span>
            <h2 id="personal-album-title">{album ? "Edita tu colección" : "Crea tu propia colección"}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          <div className="personal-album-modal__identity">
            <PersonalAlbumCover color={color} label="Vista previa de la carátula" />
            <div>
              <label className="form-field">
                Nombre del álbum
                <input value={title} maxLength={60} onChange={(event) => setTitle(event.target.value)} placeholder="Mi álbum de estudio" autoFocus />
              </label>
            </div>
          </div>

          <fieldset className="personal-album-colors">
            <legend>Color de la carátula</legend>
            <div>
              {COVER_COLORS.map((preset) => (
                <button className={color.toLowerCase() === preset ? "is-selected" : ""} type="button" style={{ "--album-color": preset }} aria-label={`Usar color ${preset}`} aria-pressed={color.toLowerCase() === preset} onClick={() => setColor(preset)} key={preset} />
              ))}
              <label className="personal-album-colors__custom">
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
                Otro color
              </label>
            </div>
          </fieldset>

          <div className="personal-album-tracks__heading">
            <div>
              <span className="eyebrow">Pistas</span>
              <strong>{tracks.length} {tracks.length === 1 ? "pista" : "pistas"} · {formatBytes(totalSize)}</strong>
            </div>
            <button className="secondary-button personal-album-add" type="button" onClick={() => fileInputRef.current?.click()}>
              <Plus size={17} /> Agregar música
            </button>
            <input ref={fileInputRef} className="visually-hidden" type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/webm,.mp3,.m4a,.aac,.ogg,.wav,.webm" multiple onChange={addFiles} />
          </div>

          <div className={`personal-album-tracks ${tracks.length ? "" : "is-empty"}`}>
            {tracks.length ? tracks.map((track, index) => (
              <div className="personal-album-track" key={track.id}>
                <span className="personal-album-track__icon"><Music2 size={17} /></span>
                <label>
                  <span className="visually-hidden">Nombre de la pista {index + 1}</span>
                  <input value={track.title} maxLength={80} onChange={(event) => updateTrackTitle(track.id, event.target.value)} />
                  <small>{track.fileName} · {formatBytes(track.size ?? track.blob?.size)}</small>
                </label>
                <div className="personal-album-track__actions">
                  <button type="button" onClick={() => moveTrack(index, -1)} disabled={index === 0} aria-label="Subir pista"><ArrowUp size={15} /></button>
                  <button type="button" onClick={() => moveTrack(index, 1)} disabled={index === tracks.length - 1} aria-label="Bajar pista"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => removeTrack(track.id)} aria-label="Eliminar pista"><Trash2 size={15} /></button>
                </div>
              </div>
            )) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                <Music2 size={25} />
                <strong>Agrega tus canciones</strong>
                <span>Selecciona archivos MP3, M4A, OGG, WAV o WebM.</span>
              </button>
            )}
          </div>

          <div className="personal-album-storage">
            <HardDrive size={17} />
            <span>Las pistas se guardan únicamente en este navegador.</span>
            {availableStorage != null && <strong>{formatBytes(availableStorage)} disponibles</strong>}
          </div>

          {error && <p className="personal-album-modal__error" role="alert">{error}</p>}

          {confirmDelete && (
            <div className="personal-album-delete-warning" role="alert">
              <p>Se eliminarán el álbum y todas sus pistas guardadas en este navegador.</p>
              <div>
                <button type="button" className="modal-cancel" onClick={() => setConfirmDelete(false)}>Conservar álbum</button>
                <button type="button" className="danger-button" onClick={deleteAlbum} disabled={isDeleting}>{isDeleting ? "Eliminando…" : "Eliminar definitivamente"}</button>
              </div>
            </div>
          )}

          <div className="quiz-modal__actions personal-album-modal__actions">
            {album && !confirmDelete && <button className="danger-text-button" type="button" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Eliminar álbum</button>}
            <span />
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" type="submit" disabled={isSaving || isDeleting}>{isSaving ? "Guardando…" : "Guardar álbum"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default PersonalAlbumModal;

