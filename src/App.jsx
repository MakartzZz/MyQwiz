import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "sileo";
import QuizCreatorModal from "./components/QuizCreatorModal.jsx";
import QuizEditor from "./components/QuizEditor.jsx";
import QuizExportModal from "./components/QuizExportModal.jsx";
import GameModeSelector from "./components/GameModeSelector.jsx";
import QuizImportConflictModal from "./components/QuizImportConflictModal.jsx";
import QuizImportModal from "./components/QuizImportModal.jsx";
import QuizLibrary from "./components/QuizLibrary.jsx";
import QuizManageModal from "./components/QuizManageModal.jsx";
import QuizPlayer from "./components/QuizPlayer.jsx";
import MusicSelector from "./components/MusicSelector.jsx";
import PromptRoom from "./components/PromptRoom.jsx";
import ThemeSwitcher from "./components/ThemeSwitcher.jsx";
import { themes } from "./config/themes.js";
import { DEFAULT_MUSIC_ALBUM, MUSIC_ALBUM_STORAGE_KEY, musicAlbums } from "./config/musicAlbums.js";
import { useQuizLibrary } from "./hooks/useQuizLibrary.js";
import { useTheme } from "./hooks/useTheme.js";
import { systemNotifications } from "./services/systemNotifications.js";
import { quizSessionStorage } from "./services/quizSessionStorage.js";
import { playConfirmSound } from "./services/uiSounds.js";
import { areQuizzesEquivalent, downloadQuizFile, MAX_QUIZ_FILE_SIZE, normalizeQuizTitle, parseQuizImport } from "./services/quizTransfer.js";
import "./App.css";

const Icon = ({ name, size = 20 }) => {
  const paths = {
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    library: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    chart: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h5" /></>,
    sparkle: <><path d="m12 3-1.1 3.1a7 7 0 0 1-4.2 4.2L3.5 11.5l3.2 1.2a7 7 0 0 1 4.2 4.2L12 20l1.1-3.1a7 7 0 0 1 4.2-4.2l3.2-1.2-3.2-1.2a7 7 0 0 1-4.2-4.2Z" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4" /><path d="M17 6h3v2a4 4 0 0 1-4 4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    palette: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="9" r="1" /><circle cx="12" cy="7" r="1" /><circle cx="16" cy="9" r="1" /><path d="M15 16h2a2 2 0 0 0 0-4h-1" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6a8 8 0 0 1 0 12" /></>,
    music: <><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.3 2.3 0 1 1 3.3 2.1c-.8.4-1.1.9-1.1 1.9" /><path d="M12 17h.01" /></>,
    accessibility: <><circle cx="12" cy="4" r="2" /><path d="M5 8h14" /><path d="M12 6v7" /><path d="m8 21 4-8 4 8" /></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const navigation = [
  { label: "Inicio", icon: "home" },
  { label: "Mis quizzes", icon: "library" },
  { label: "Sala de prompts", icon: "sparkle" },
];

const sectionTitles = {
  Inicio: "Tu espacio de estudio.",
  "Mis quizzes": "Crea y organiza tus quizzes.",
  "Sala de prompts": "Diseña quizzes con ayuda de IA.",
  Ajustes: "Configura tu experiencia.",
};

const formatShortDate = (date) => new Intl.DateTimeFormat("es-CR", {
  day: "numeric",
  month: "short",
  year: "numeric",
}).format(new Date(date));

const MUSIC_VOLUME_STORAGE_KEY = "myqwiz:music-volume";
const MUSIC_VOLUME_LEVELS = [0.07, 0.13, 0.2];

const readStoredMusicVolume = () => {
  const storedVolume = Number(window.localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY));
  return MUSIC_VOLUME_LEVELS.includes(storedVolume) ? storedVolume : 0.2;
};

function App() {
  const [activeSection, setActiveSection] = useState("Inicio");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [playingQuizId, setPlayingQuizId] = useState(null);
  const [activeGameMode, setActiveGameMode] = useState(null);
  const [activeGameRules, setActiveGameRules] = useState({});
  const [gameAttemptKey, setGameAttemptKey] = useState(0);
  const [savedGameSession, setSavedGameSession] = useState(() => quizSessionStorage.get());
  const [managedQuiz, setManagedQuiz] = useState(null);
  const [manageMode, setManageMode] = useState("rename");
  const [importConflict, setImportConflict] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportingQuiz, setExportingQuiz] = useState(null);
  const importInputRef = useRef(null);
  const [settingsView, setSettingsView] = useState("index");
  const [selectedAlbumId, setSelectedAlbumId] = useState(() => (
    window.localStorage.getItem(MUSIC_ALBUM_STORAGE_KEY) ?? DEFAULT_MUSIC_ALBUM
  ));
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicChanging, setIsMusicChanging] = useState(false);
  const [musicVolume, setMusicVolume] = useState(readStoredMusicVolume);
  const musicAudioRef = useRef(null);
  const musicChangeAudioRef = useRef(null);
  const musicChangeSequenceRef = useRef(0);
  const { theme, changeTheme } = useTheme();
  const { quizzes, createDraft, saveDraft, duplicateDraft, deleteDraft, importDraft, recordAttempt } = useQuizLibrary();

  const recentQuiz = quizzes[0] ?? null;
  const editingQuiz = quizzes.find((quiz) => quiz.id === editingQuizId) ?? null;
  const playingQuiz = quizzes.find((quiz) => quiz.id === playingQuizId) ?? null;
  const activeTheme = themes.find((item) => item.id === theme) ?? themes[0];
  const selectedAlbum = musicAlbums.find((album) => album.id === selectedAlbumId) ?? musicAlbums[0];
  const currentMusicTrack = selectedAlbum.tracks[currentTrackIndex] ?? selectedAlbum.tracks[0] ?? null;
  const isThemeScreen = activeSection === "Ajustes" && settingsView === "themes";
  const isSettingsHome = activeSection === "Ajustes" && settingsView === "index";
  const isMusicScreen = activeSection === "Ajustes" && settingsView === "music";
  const isHomeScreen = activeSection === "Inicio";
  const isQuizScreen = activeSection === "Mis quizzes";
  const isQuizActivityScreen = isQuizScreen && Boolean(editingQuiz || playingQuiz);
  const bestQuiz = quizzes
    .filter((quiz) => Number.isFinite(quiz.stats?.bestScore))
    .sort((first, second) => second.stats.bestScore - first.stats.bestScore)[0] ?? null;
  const resumableQuiz = savedGameSession
    ? quizzes.find((quiz) => quiz.id === savedGameSession.quizId) ?? null
    : null;

  const chooseAction = (message) => {
    systemNotifications.info("Próximamente", message);
  };

  useEffect(() => {
    const sound = new Audio("/sounds/music-change.mp3");
    sound.preload = "auto";
    sound.volume = 0.45;
    musicChangeAudioRef.current = sound;

    return () => {
      musicChangeSequenceRef.current += 1;
      sound.pause();
      musicChangeAudioRef.current = null;
    };
  }, []);

  const playMusicChangeTransition = useCallback((onComplete) => {
    const sequence = musicChangeSequenceRef.current + 1;
    musicChangeSequenceRef.current = sequence;
    musicAudioRef.current?.pause();
    setIsMusicPlaying(false);
    setIsMusicChanging(true);

    const finish = () => {
      if (musicChangeSequenceRef.current !== sequence) return;
      setIsMusicChanging(false);
      onComplete();
    };

    const sound = musicChangeAudioRef.current;
    if (!sound) {
      finish();
      return;
    }

    sound.pause();
    sound.currentTime = 0;
    sound.onended = finish;
    sound.onerror = finish;
    sound.play().catch(finish);
  }, []);

  const selectMusicAlbum = (albumId) => {
    const album = musicAlbums.find((item) => item.id === albumId);
    if (!album) return;
    if (album.tracks.length) {
      playMusicChangeTransition(() => {
        setSelectedAlbumId(albumId);
        setCurrentTrackIndex(0);
        setIsMusicPlaying(true);
        window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, albumId);
        systemNotifications.success("Álbum seleccionado", `${album.title} comenzó a reproducirse.`, { sound: false });
      });
    } else {
      musicChangeSequenceRef.current += 1;
      musicChangeAudioRef.current?.pause();
      setIsMusicChanging(false);
      setSelectedAlbumId(albumId);
      setCurrentTrackIndex(0);
      setIsMusicPlaying(false);
      window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, albumId);
      systemNotifications.info("Álbum seleccionado", `${album.title} estará disponible cuando agreguemos sus pistas.`);
    }
  };

  const toggleMusicPlayback = () => {
    if (!currentMusicTrack || isMusicChanging) return;
    setIsMusicPlaying((playing) => !playing);
  };

  const playNextMusicTrack = useCallback(() => {
    if (!selectedAlbum.tracks.length) return;
    setCurrentTrackIndex((index) => (index + 1) % selectedAlbum.tracks.length);
    setIsMusicPlaying(true);
  }, [selectedAlbum]);

  const playPreviousMusicTrack = useCallback(() => {
    if (!selectedAlbum.tracks.length) return;
    setCurrentTrackIndex((index) => (index - 1 + selectedAlbum.tracks.length) % selectedAlbum.tracks.length);
    setIsMusicPlaying(true);
  }, [selectedAlbum]);

  const changeMusicVolume = (volume) => {
    if (!MUSIC_VOLUME_LEVELS.includes(volume)) return;
    setMusicVolume(volume);
    window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(volume));
  };

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    audio.volume = musicVolume;
    if (!isMusicPlaying || !currentMusicTrack) {
      audio.pause();
      return;
    }
    audio.play().catch(() => setIsMusicPlaying(false));
  }, [currentMusicTrack, isMusicPlaying, musicVolume]);

  useEffect(() => {
    const hoverSound = new Audio("/sounds/button-hover.mp3");
    hoverSound.preload = "auto";
    hoverSound.volume = 0.18;

    const playHoverSound = (event) => {
      if (event.pointerType === "touch" || !(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.disabled || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
      hoverSound.currentTime = 0;
      hoverSound.play().catch(() => {});
    };

    document.addEventListener("pointerover", playHoverSound);
    return () => {
      document.removeEventListener("pointerover", playHoverSound);
      hoverSound.pause();
    };
  }, []);

  const selectSection = (label) => {
    setActiveSection(label);
    setIsMenuOpen(false);

    if (label !== "Mis quizzes") {
      setEditingQuizId(null);
      setPlayingQuizId(null);
      setActiveGameMode(null);
      setActiveGameRules({});
    }

    if (label === "Ajustes") {
      setSettingsView("index");
    }
  };

  const beginQuizCreation = () => {
    selectSection("Mis quizzes");
    setIsCreatorOpen(true);
  };

  const createQuizDraft = (quizDetails) => {
    try {
      const quiz = createDraft(quizDetails);
      setIsCreatorOpen(false);
      setEditingQuizId(quiz.id);
      systemNotifications.success(
        "Borrador guardado",
        `“${quiz.title}” ya está disponible en tu biblioteca.`,
      );
    } catch {
      systemNotifications.error(
        "No se pudo guardar",
        "Revisa el almacenamiento disponible del navegador e inténtalo nuevamente.",
      );
    }
  };

  const openQuizDraft = (quiz) => {
    setActiveSection("Mis quizzes");
    setPlayingQuizId(null);
    setActiveGameMode(null);
    setActiveGameRules({});
    setEditingQuizId(quiz.id);
  };

  const openQuizGame = (quiz) => {
    setActiveSection("Mis quizzes");
    setEditingQuizId(null);
    setPlayingQuizId(quiz.id);
    setActiveGameMode(null);
    setActiveGameRules({});
  };

  const startQuizGame = (_quiz, gameMode, rules) => {
    quizSessionStorage.clear();
    setSavedGameSession(null);
    setActiveGameRules(rules);
    setActiveGameMode(gameMode);
  };

  const exitQuizGame = () => {
    setActiveGameMode(null);
    setActiveGameRules({});
    setPlayingQuizId(null);
  };

  const completeQuizGame = useCallback(({ score }) => {
    quizSessionStorage.clear();
    setSavedGameSession(null);
    if (playingQuizId) recordAttempt(playingQuizId, score);
  }, [playingQuizId, recordAttempt]);

  const saveQuizGameProgress = useCallback((session) => {
    const savedSession = quizSessionStorage.save(session);
    setSavedGameSession(savedSession);
  }, []);

  const resumeQuizGame = () => {
    if (!savedGameSession || !resumableQuiz) return;
    playConfirmSound();
    setActiveSection("Mis quizzes");
    setEditingQuizId(null);
    setPlayingQuizId(resumableQuiz.id);
    setActiveGameRules(savedGameSession.gameRules ?? {});
    setActiveGameMode(savedGameSession.gameMode);
    setGameAttemptKey((value) => value + 1);
    setIsMenuOpen(false);
  };

  const retryQuizGame = () => {
    quizSessionStorage.clear();
    setSavedGameSession(null);
    setGameAttemptKey((value) => value + 1);
  };

  const saveQuizDraft = useCallback((quiz, { silent = false } = {}) => {
    try {
      const savedQuiz = saveDraft(quiz);
      if (!silent) {
        systemNotifications.success("Cambios guardados", `“${savedQuiz.title}” quedó actualizado.`);
      }
      return savedQuiz;
    } catch (error) {
      systemNotifications.error("No se pudo guardar", error.message || "Revisa los datos del quiz e inténtalo nuevamente.");
      return null;
    }
  }, [saveDraft]);

  const openManageQuiz = (quiz, mode) => {
    setManagedQuiz(quiz);
    setManageMode(mode);
  };

  const closeManageQuiz = () => setManagedQuiz(null);

  const confirmManageQuiz = (quiz) => {
    try {
      if (manageMode === "delete") {
        if (deleteDraft(quiz.id)) {
          systemNotifications.success("Quiz eliminado", `“${quiz.title}” ya no está en tu biblioteca.`);
        }
      } else {
        const savedQuiz = saveDraft(quiz);
        systemNotifications.success("Nombre actualizado", `Ahora aparece como “${savedQuiz.title}”.`);
      }
      closeManageQuiz();
    } catch (error) {
      systemNotifications.error("No se pudo completar", error.message || "Inténtalo nuevamente.");
    }
  };

  const duplicateQuizDraft = (quiz) => {
    try {
      const duplicate = duplicateDraft(quiz);
      systemNotifications.success("Copia creada", `“${duplicate.title}” ya está en tu biblioteca.`);
    } catch (error) {
      systemNotifications.error("No se pudo duplicar", error.message || "Inténtalo nuevamente.");
    }
  };

  const showQuizValidationError = (errors) => {
    const firstError = errors[0]?.message ?? "Completa las preguntas antes de continuar.";
    const remaining = errors.length > 1 ? ` Quedan ${errors.length} detalles por corregir.` : "";
    systemNotifications.warning("Quiz incompleto", `${firstError}${remaining}`);
  };

  const openQuizImport = () => setIsImportModalOpen(true);
  const chooseQuizImportFile = () => importInputRef.current?.click();

  const completeQuizImport = (sourceQuiz) => {
    const importedQuiz = importDraft(sourceQuiz);
    setActiveSection("Mis quizzes");
    systemNotifications.success("Quiz importado", `“${importedQuiz.title}” ya está en tu biblioteca.`);
    return importedQuiz;
  };

  const importQuizContent = (content) => {
    try {
      if (new Blob([content]).size > MAX_QUIZ_FILE_SIZE) throw new Error("El contenido supera el límite de 5 MB.");
      const parsedQuiz = parseQuizImport(content);
      const identicalQuiz = quizzes.find((quiz) => areQuizzesEquivalent(quiz, parsedQuiz));
      const sameNameQuiz = quizzes.find((quiz) => normalizeQuizTitle(quiz.title) === normalizeQuizTitle(parsedQuiz.title));

      setIsImportModalOpen(false);
      if (identicalQuiz || sameNameQuiz) {
        setImportConflict({
          quiz: parsedQuiz,
          existingQuiz: identicalQuiz ?? sameNameQuiz,
          reason: identicalQuiz ? "identical" : "same-name",
        });
      } else {
        completeQuizImport(parsedQuiz);
      }
      return true;
    } catch (error) {
      systemNotifications.error("No se pudo reconocer el JSON", error.message || "El contenido no es compatible.");
      return false;
    }
  };

  const importQuizFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_QUIZ_FILE_SIZE) throw new Error("El archivo supera el límite de 5 MB.");
      importQuizContent(await file.text());
    } catch (error) {
      systemNotifications.error("No se pudo importar", error.message || "El archivo no es compatible.");
    } finally {
      event.target.value = "";
    }
  };

  const confirmConflictingImport = (title) => {
    const normalizedTitle = normalizeQuizTitle(title);
    if (quizzes.some((quiz) => normalizeQuizTitle(quiz.title) === normalizedTitle)) {
      systemNotifications.warning("Nombre ocupado", "Elige un nombre que no esté utilizado en tu biblioteca.");
      return;
    }

    completeQuizImport({ ...importConflict.quiz, title });
    setImportConflict(null);
  };

  const exportQuizFile = (filename) => {
    if (!exportingQuiz) return;
    try {
      downloadQuizFile(exportingQuiz, filename);
      systemNotifications.success("Archivo exportado", `Guardamos “${exportingQuiz.title}” en formato MyQwiz.`);
      setExportingQuiz(null);
    } catch {
      systemNotifications.error("No se pudo exportar", "El navegador no permitió crear el archivo.");
    }
  };

  const openGoogleDrive = () => {
    window.open("https://drive.google.com/drive/my-drive", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="app-shell">
      <Toaster
        position="bottom-right"
        theme={theme === "midnight" ? "dark" : "light"}
        options={{ duration: 4000, roundness: 16, fill: "var(--toast-bg)" }}
      />
      <aside className={`sidebar ${isMenuOpen ? "is-open" : ""}`}>
        <div className="brand" aria-label="MyQwiz">
          <img className="brand__mark" src="/myqwiz-icon.svg" alt="" />
          <span>My<span>Qwiz</span></span>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <p className="nav-label">Tu espacio</p>
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeSection === item.label ? "is-active" : ""}`}
              key={item.label}
              type="button"
              onClick={() => selectSection(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-widgets">
          {resumableQuiz && (
            <button className="sidebar-card sidebar-card--resume" type="button" onClick={resumeQuizGame}>
              <span className="sidebar-card__top">
                <span className="sidebar-card__copy">
                  <small>Continuar</small>
                  <strong>{resumableQuiz.title}</strong>
                </span>
                <span className="sidebar-card__icon"><Icon name="arrow" size={17} /></span>
              </span>
              <span className="sidebar-card__progress-row">
                <span className="sidebar-card__progress"><i style={{ width: `${((savedGameSession.questionIndex + 1) / savedGameSession.questions.length) * 100}%` }} /></span>
                <span className="sidebar-card__progress-count">{Math.min(savedGameSession.questionIndex + 1, savedGameSession.questions.length)}/{savedGameSession.questions.length}</span>
              </span>
            </button>
          )}

          <div className={`sidebar-music ${isMusicPlaying ? "is-playing" : ""}`}>
            <img src={selectedAlbum.cover} alt="" />
            <div>
              <button type="button" onClick={playPreviousMusicTrack} disabled={!currentMusicTrack || isMusicChanging} aria-label="Pista anterior">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="2" height="14" /><path d="m18 5-9 7 9 7V5Z" /></svg>
              </button>
              <button type="button" onClick={toggleMusicPlayback} disabled={!currentMusicTrack || isMusicChanging} aria-label={isMusicPlaying ? "Pausar música" : "Reproducir música"}>
                {isMusicPlaying ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
                )}
              </button>
              <button type="button" onClick={playNextMusicTrack} disabled={!currentMusicTrack || isMusicChanging} aria-label="Siguiente pista">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m6 5 9 7-9 7V5Z" /><rect x="16" y="5" width="2" height="14" /></svg>
              </button>
            </div>
          </div>
        </div>

        <button className="nav-item nav-item--settings" type="button" onClick={() => selectSection("Ajustes")}>
          <Icon name="settings" />
          <span>Ajustes</span>
        </button>
      </aside>

      {isMenuOpen && <button className="menu-backdrop" aria-label="Cerrar menú" onClick={() => setIsMenuOpen(false)} />}

      <main className={`main-content ${isThemeScreen ? "main-content--themes" : ""} ${isSettingsHome ? "main-content--settings" : ""} ${isMusicScreen ? "main-content--music" : ""} ${isHomeScreen || isQuizScreen ? "main-content--workspace" : ""} ${isHomeScreen ? "main-content--home" : ""} ${isQuizScreen ? "main-content--library" : ""}`}>
        {!isThemeScreen && !isQuizActivityScreen && (
          <header className="topbar">
            <button className="menu-button" type="button" aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"} onClick={() => setIsMenuOpen(!isMenuOpen)}>
              <Icon name={isMenuOpen ? "close" : "menu"} />
            </button>
            <div>
              <span className="eyebrow">{activeSection}</span>
              <h1>{sectionTitles[activeSection]}</h1>
            </div>
          </header>
        )}

        {activeSection === "Inicio" && (
          <>
            <section className="hero-card">
              <div className="hero-card__content">
                <span className="hero-kicker"><Icon name="sparkle" size={16} /> Aprende a tu manera</span>
                <h2>Crea, practica<br />y conquista.</h2>
                <p>Convierte tus apuntes en quizzes dinámicos, descubre qué necesitas reforzar y aprende a tu ritmo.</p>
                <button className="primary-button" type="button" onClick={beginQuizCreation}>
                  <Icon name="plus" /> Crear un quiz
                </button>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <img
                  className={`hero-character hero-character--${theme}`}
                  src={activeTheme.character}
                  alt=""
                />
              </div>
            </section>

            <section className="home-overview" aria-labelledby="overview-title">
              <div className="section-heading">
                <div><span className="eyebrow">Resumen</span><h2 id="overview-title">Tu recorrido</h2></div>
              </div>

              <div className="overview-grid">
                <article className="overview-card">
                  <span className="overview-card__icon"><Icon name="trophy" /></span>
                  <div className="overview-card__copy">
                    <span>Mejor puntuación</span>
                    {bestQuiz ? (
                      <><strong>{bestQuiz.stats.bestScore}%</strong><p>{bestQuiz.title}</p></>
                    ) : (
                      <><strong>—</strong><p>Completa un quiz para registrar tu mejor marca.</p></>
                    )}
                  </div>
                </article>

                <article className="overview-card overview-card--recent">
                  <span className="overview-card__icon"><Icon name="clock" /></span>
                  <div className="overview-card__copy">
                    <span>Agregado recientemente</span>
                    {recentQuiz ? (
                      <><strong>{recentQuiz.title}</strong><p>{formatShortDate(recentQuiz.createdAt)} · {recentQuiz.questions.length} preguntas</p></>
                    ) : (
                      <><strong>Sin quizzes todavía</strong><p>Tu creación más reciente aparecerá aquí.</p></>
                    )}
                  </div>
                  {recentQuiz && <button type="button" onClick={() => openQuizDraft(recentQuiz)}>Continuar <Icon name="arrow" size={16} /></button>}
                </article>

              </div>
            </section>
          </>
        )}

        {activeSection === "Mis quizzes" && (
          playingQuiz ? (
            activeGameMode ? (
              <QuizPlayer
                key={`${playingQuiz.id}-${activeGameMode}-${gameAttemptKey}`}
                quiz={playingQuiz}
                theme={theme}
                gameMode={activeGameMode}
                gameRules={activeGameRules}
                initialSession={savedGameSession}
                onExit={exitQuizGame}
                onComplete={completeQuizGame}
                onProgress={saveQuizGameProgress}
                onRetry={retryQuizGame}
              />
            ) : (
              <GameModeSelector
                key={playingQuiz.id}
                quiz={playingQuiz}
                onBack={() => setPlayingQuizId(null)}
                onStart={startQuizGame}
              />
            )
          ) : editingQuiz ? (
            <QuizEditor quiz={editingQuiz} onBack={() => setEditingQuizId(null)} onSave={saveQuizDraft} onValidationError={showQuizValidationError} />
          ) : (
            <>
            <section className="library-section" aria-labelledby="library-title">
              <div className="section-heading">
                <div><span className="eyebrow">Tu biblioteca</span><h2 id="library-title">Todos tus quizzes</h2></div>
                <div className="library-heading-actions">
                  <button className="text-button" type="button" onClick={() => setIsCreatorOpen(true)}><Icon name="plus" size={17} /> Crear quiz</button>
                  <button className="text-button" type="button" onClick={openQuizImport}><Icon name="file" size={17} /> Importar</button>
                  <button className="text-button" type="button" onClick={() => selectSection("Sala de prompts")}><Icon name="sparkle" size={17} /> Generación asistida</button>
                </div>
              </div>
              <QuizLibrary
                quizzes={quizzes}
                onCreate={() => setIsCreatorOpen(true)}
                onOpen={openQuizDraft}
                onPlay={openQuizGame}
                onRename={(quiz) => openManageQuiz(quiz, "rename")}
                onDuplicate={duplicateQuizDraft}
                onDelete={(quiz) => openManageQuiz(quiz, "delete")}
                onExport={setExportingQuiz}
              />
            </section>
            </>
          )
        )}

        {activeSection === "Sala de prompts" && <PromptRoom />}

        {activeSection === "Ajustes" && (
          settingsView === "themes" ? (
            <div className="settings-detail">
              <button className="settings-back" type="button" onClick={() => setSettingsView("index")}>
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <ThemeSwitcher activeTheme={theme} onChange={changeTheme} />
            </div>
          ) : settingsView === "music" ? (
            <div className="settings-detail">
              <button className="settings-back" type="button" onClick={() => setSettingsView("index")}>
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <MusicSelector
                albums={musicAlbums}
                activeAlbumId={selectedAlbum.id}
                currentTrack={currentMusicTrack}
                isPlaying={isMusicPlaying}
                isChanging={isMusicChanging}
                volume={musicVolume}
                onChange={selectMusicAlbum}
                onToggle={toggleMusicPlayback}
                onPrevious={playPreviousMusicTrack}
                onNext={playNextMusicTrack}
                onVolumeChange={changeMusicVolume}
              />
            </div>
          ) : (
            <section className="settings-home" aria-label="Categorías de ajustes">
              <div className="settings-options">
                <button className="settings-option settings-option--featured" type="button" onClick={() => setSettingsView("themes")}>
                  <span className="settings-option__icon"><Icon name="palette" size={25} /></span>
                  <span className="settings-option__copy">
                    <strong>Tema</strong>
                    <small>{activeTheme.label}</small>
                  </span>
                  <img className={`settings-option__character settings-option__character--${theme}`} src={activeTheme.character} alt="" />
                  <Icon name="arrow" size={20} />
                </button>
                <button className={`settings-option settings-option--music ${isMusicPlaying ? "is-playing" : ""}`} type="button" onClick={() => setSettingsView("music")}>
                  <span className="settings-option__album"><img src={selectedAlbum.cover} alt="" /></span>
                  <span className="settings-option__music-copy">
                    <small>Reproductor ambiental</small>
                    <strong>{selectedAlbum.title}</strong>
                  </span>
                  <span className="settings-option__turntable" aria-hidden="true">
                    <span className="settings-option__vinyl" />
                    <span className="settings-option__tonearm"><i /></span>
                  </span>
                  <Icon name="arrow" size={20} />
                </button>
                <div className="settings-option-frame settings-option-frame--sound">
                  <button className="settings-option settings-option--sound" type="button" onClick={() => chooseAction("Aquí podrás configurar los efectos y avisos sonoros.")}>
                    <span className="settings-option__icon"><Icon name="volume" size={25} /></span>
                    <strong>Sonido</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
                <div className="settings-option-frame settings-option-frame--help">
                  <button className="settings-option settings-option--help" type="button" onClick={() => chooseAction("Los tutoriales y recursos de ayuda se agregarán aquí.")}>
                    <span className="settings-option__icon"><Icon name="help" size={25} /></span>
                    <strong>Tutoriales y ayuda</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
                <div className="settings-option-frame settings-option-frame--accessibility">
                  <button className="settings-option settings-option--accessibility" type="button" onClick={() => chooseAction("Aquí podrás ajustar movimiento, contraste y otras ayudas visuales.")}>
                    <span className="settings-option__icon"><Icon name="accessibility" size={25} /></span>
                    <strong>Accesibilidad</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
              </div>
            </section>
          )
        )}
      </main>

      <QuizCreatorModal isOpen={isCreatorOpen} onClose={() => setIsCreatorOpen(false)} onCreate={createQuizDraft} />
      <QuizManageModal quiz={managedQuiz} mode={manageMode} onClose={closeManageQuiz} onConfirm={confirmManageQuiz} />
      <QuizImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onChooseFile={chooseQuizImportFile} onImportText={importQuizContent} />
      <QuizImportConflictModal conflict={importConflict} onClose={() => setImportConflict(null)} onConfirm={confirmConflictingImport} />
      <QuizExportModal quiz={exportingQuiz} onClose={() => setExportingQuiz(null)} onExport={exportQuizFile} onDrive={openGoogleDrive} />
      <audio ref={musicAudioRef} src={currentMusicTrack?.src} preload="metadata" onEnded={playNextMusicTrack} />
      <input ref={importInputRef} className="visually-hidden" type="file" accept=".json,.myqwiz.json,application/json" onChange={importQuizFile} />
    </div>
  );
}

export default App;
