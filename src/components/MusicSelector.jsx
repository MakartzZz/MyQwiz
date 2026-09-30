const PlayerIcon = ({ playing }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    {playing ? <><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></> : <path d="m8 5 11 7-11 7V5Z" />}
  </svg>
);

const musicGlyphPaths = {
  note: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
  headphones: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1Z" /><path d="M20 14h-3v6h2a1 1 0 0 0 1-1Z" /></>,
  wave: <><path d="M3 12h2l2-6 3 12 3-14 3 12 2-4h3" /></>,
  disc: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3a9 9 0 0 1 9 9" /></>,
  piano: <><path d="M4 5h16v14H4Z" /><path d="M8 5v9" /><path d="M12 5v9" /><path d="M16 5v9" /><path d="M6 19v-5" /><path d="M10 19v-5" /><path d="M14 19v-5" /><path d="M18 19v-5" /></>,
};

const MusicGlyph = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {musicGlyphPaths[name]}
  </svg>
);

const musicGlyphs = ["note", "headphones", "wave", "disc", "piano", "note", "wave", "headphones", "disc", "piano"];
const musicRibbonGlyphs = Array.from({ length: 3 }, () => musicGlyphs).flat();

const MusicBackdrop = ({ isChanging }) => (
  <div className={`music-backdrop ${isChanging ? "is-changing" : ""}`} aria-hidden="true">
    <div className="music-backdrop__copy">
      <span>SONIDO</span>
      <span>PARA ENFOCAR</span>
      <strong>MYQWIZ RADIO</strong>
      <small>ESCUCHA · RESPIRA · ESTUDIA</small>
    </div>
    {["one", "two", "three"].map((ribbon) => (
      <div className={`music-ribbon music-ribbon--${ribbon}`} key={ribbon}>
        <div className="music-ribbon__track">
          {[0, 1].map((group) => (
            <span className="music-ribbon__group" key={group}>
              {musicRibbonGlyphs.map((glyph, index) => <MusicGlyph name={glyph} key={`${glyph}-${index}`} />)}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const volumeLevels = [
  { value: 0.07, label: "Bajo", percentage: 7 },
  { value: 0.13, label: "Medio", percentage: 13 },
  { value: 0.2, label: "Máximo", percentage: 20 },
];

function MusicSelector({ albums, activeAlbumId, currentTrack, isPlaying, isChanging, volume, onChange, onToggle, onPrevious, onNext, onVolumeChange }) {
  const activeAlbum = albums.find((album) => album.id === activeAlbumId) ?? albums[0];

  return (
    <>
    <MusicBackdrop isChanging={isChanging} />
    <section className="music-library" aria-labelledby="music-library-title">
      <div className="music-library__heading">
        <div>
          <span className="eyebrow">Música ambiental</span>
          <h2 id="music-library-title">Elige tu álbum</h2>
          <p>Cada colección acompaña una forma distinta de estudiar.</p>
        </div>
      </div>

      <div className="music-player-bar">
        <img src={activeAlbum.cover} alt="" />
        <div>
          <span>Reproduciendo ahora</span>
          <strong>{currentTrack?.title ?? activeAlbum.title}</strong>
          <small>{currentTrack ? activeAlbum.title : "Este álbum todavía no tiene pistas"}</small>
        </div>
        <div className="music-player-bar__controls">
          <button type="button" onClick={onPrevious} disabled={!currentTrack || isChanging} aria-label="Pista anterior">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="2" height="14" /><path d="m18 5-9 7 9 7V5Z" /></svg>
          </button>
          <button type="button" onClick={onToggle} disabled={!currentTrack || isChanging} aria-label={isPlaying ? "Pausar música" : "Reproducir música"}>
            <PlayerIcon playing={isPlaying} />
          </button>
          <button type="button" onClick={onNext} disabled={!currentTrack || isChanging} aria-label="Siguiente pista">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m6 5 9 7-9 7V5Z" /><rect x="16" y="5" width="2" height="14" /></svg>
          </button>
        </div>
        <div className="music-player-bar__volume">
          <span>Volumen</span>
          <div role="group" aria-label="Nivel de volumen de la música">
            {volumeLevels.map((level, index) => (
              <button
                className={volume === level.value ? "is-active" : ""}
                type="button"
                key={level.value}
                aria-label={`${level.label}, ${level.percentage}%`}
                aria-pressed={volume === level.value}
                title={`${level.label} · ${level.percentage}%`}
                onClick={() => onVolumeChange(level.value)}
              >
                {Array.from({ length: 3 }, (_, barIndex) => <i className={barIndex <= index ? "is-filled" : ""} key={barIndex} />)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="music-album-grid">
        {albums.map((album, index) => {
          const isActive = album.id === activeAlbumId;
          return (
            <button
              className={`music-album-card ${isActive ? "is-selected" : ""}`}
              type="button"
              data-button-sound="interface"
              key={album.id}
              aria-pressed={isActive}
              onClick={() => onChange(album.id)}
            >
              <span className="music-album-card__number">0{index + 1}</span>
              <img src={album.cover} alt={`Portada de ${album.title}`} />
              <span className="music-album-card__copy">
                <strong>{album.title}</strong>
                <small>{album.description}</small>
                <span>{album.tracks.length ? `${album.tracks.length} pistas` : "Pistas próximamente"}</span>
              </span>
              {isActive && <span className="music-album-card__active">Seleccionado</span>}
            </button>
          );
        })}
      </div>
    </section>
    </>
  );
}

export default MusicSelector;
