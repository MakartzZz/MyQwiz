import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, SwatchBook } from "lucide-react";
import { Toaster } from "sileo";
import myQwizWordmarkMidnight from "./assets/branding/myqwiz-wordmark-midnight.webp";
import myQwizWordmarkPink from "./assets/branding/myqwiz-wordmark-pink.webp";
import myQwizWordmarkSky from "./assets/branding/myqwiz-wordmark-sky.webp";
import myQwizWordmarkViolet from "./assets/branding/myqwiz-wordmark-violet.webp";
import AlbumCover from "./components/PersonalAlbumCover.jsx";
import { QuizIcon } from "./components/QuizIcon.jsx";
import {
  AccessibilitySettings,
  HelpSettings,
  SoundSettings,
} from "./components/SettingsPanels.jsx";
import BlinkingCharacter from "./components/BlinkingCharacter.jsx";
import QuizEntryTransition from "./components/QuizEntryTransition.jsx";
import QwizLoader from "./components/QwizLoader.jsx";
import SidebarMascot from "./components/SidebarMascot.jsx";
import SupportCoffee from "./components/SupportCoffee.jsx";
import { themes } from "./config/themes.js";
import {
  DEFAULT_MUSIC_ALBUM,
  MUSIC_ALBUM_STORAGE_KEY,
  musicAlbums,
} from "./config/musicAlbums.js";
import { QUESTION_TYPES } from "./domain/quizConstants.js";
import { useQuizLibrary } from "./hooks/useQuizLibrary.js";
import { usePersonalMusicAlbums } from "./hooks/usePersonalMusicAlbums.js";
import { useTheme } from "./hooks/useTheme.js";
import { systemNotifications } from "./services/systemNotifications.js";
import { catRewards } from "./services/catRewards.js";
import {
  playBufferedSound,
  prepareSoundBuffers,
  SOUND_EFFECT_GROUPS,
  stopBufferedSound,
  unlockSoundBuffers,
} from "./services/soundBuffer.js";
import {
  applyUserPreferences,
  canPlayCatRewardSounds,
  canPlayGameplaySounds,
  canPlayInterfaceSounds,
  getSoundScale,
  readUserPreferences,
  saveUserPreferences,
} from "./services/userPreferences.js";
import { quizSessionStorage } from "./services/quizSessionStorage.js";
import { quickQuizProgress } from "./services/quickQuizProgress.js";
import {
  playButtonPressSound,
  playButtonHoverSound,
  playConfirmSound,
  playSupportHoverSound,
  playTypingSound,
} from "./services/uiSounds.js";
import {
  areQuizzesEquivalent,
  downloadQuizFile,
  MAX_QUIZ_FILE_SIZE,
  normalizeQuizTitle,
  parseQuizImport,
} from "./services/quizTransfer.js";
import "./App.css";

const QuizCreatorModal = lazy(() => import("./components/QuizCreatorModal.jsx"));
const QuizEditor = lazy(() => import("./components/QuizEditor.jsx"));
const QuizExportModal = lazy(() => import("./components/QuizExportModal.jsx"));
const GameModeSelector = lazy(() => import("./components/GameModeSelector.jsx"));
const QuizImportConflictModal = lazy(() => import("./components/QuizImportConflictModal.jsx"));
const QuizImportModal = lazy(() => import("./components/QuizImportModal.jsx"));
const QuizLibrary = lazy(() => import("./components/QuizLibrary.jsx"));
const QuickQuizLibrary = lazy(() => import("./components/QuickQuizLibrary.jsx"));
const QuickQuizDrawModal = lazy(() => import("./components/QuickQuizDrawModal.jsx"));
const QuizManageModal = lazy(() => import("./components/QuizManageModal.jsx"));
const QuizEditWarningModal = lazy(() => import("./components/QuizEditWarningModal.jsx"));
const QuizProgressNoticeModal = lazy(() => import("./components/QuizProgressNoticeModal.jsx"));
const QuizPlayer = lazy(() => import("./components/QuizPlayer.jsx"));
const MusicSelector = lazy(() => import("./components/MusicSelector.jsx"));
const PersonalAlbumModal = lazy(() => import("./components/PersonalAlbumModal.jsx"));
const CatFeedingGame = lazy(() => import("./components/CatFeedingGame.jsx"));
const PromptRoom = lazy(() => import("./components/PromptRoom.jsx"));
const ThemeSwitcher = lazy(() => import("./components/ThemeSwitcher.jsx"));

const wordmarkByTheme = {
  violet: myQwizWordmarkViolet,
  sky: myQwizWordmarkSky,
  midnight: myQwizWordmarkMidnight,
  pink: myQwizWordmarkPink,
};

const Icon = ({ name, size = 20 }) => {
  const paths = {
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    library: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    quick: (
      <>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        <path d="m7 7 .01 0M17 7l.01 0M7 17l.01 0M17 17l.01 0" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3-1.1 3.1a7 7 0 0 1-4.2 4.2L3.5 11.5l3.2 1.2a7 7 0 0 1 4.2 4.2L12 20l1.1-3.1a7 7 0 0 1 4.2-4.2l3.2-1.2-3.2-1.2a7 7 0 0 1-4.2-4.2Z" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="m18 6-12 12" />
      </>
    ),
    collapse: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M20 5v14" />
      </>
    ),
    expand: (
      <>
        <path d="m9 18 6-6-6-6" />
        <path d="M4 5v14" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
        <path d="M7 6H4v2a4 4 0 0 0 4 4" />
        <path d="M17 6h3v2a4 4 0 0 1-4 4" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4Z" />
        <path d="M15 9a4 4 0 0 1 0 6" />
        <path d="M18 6a8 8 0 0 1 0 12" />
      </>
    ),
    music: (
      <>
        <path d="M9 18V5l10-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="16" cy="16" r="3" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.8 9a2.3 2.3 0 1 1 3.3 2.1c-.8.4-1.1.9-1.1 1.9" />
        <path d="M12 17h.01" />
      </>
    ),
    accessibility: (
      <>
        <circle cx="12" cy="4" r="2" />
        <path d="M5 8h14" />
        <path d="M12 6v7" />
        <path d="m8 21 4-8 4 8" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
};

const AutoScrollTitle = ({ children }) => {
  const frameRef = useRef(null);
  const textRef = useRef(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const text = textRef.current;
    if (!frame || !text) return undefined;

    const measureOverflow = () => {
      setScrollDistance(
        Math.max(0, Math.ceil(text.scrollWidth - frame.clientWidth) + 8),
      );
    };

    measureOverflow();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measureOverflow);
    observer.observe(frame);
    observer.observe(text);

    return () => observer.disconnect();
  }, [children]);

  return (
    <strong className="score-card__title" ref={frameRef} title={children}>
      <span
        ref={textRef}
        className={scrollDistance > 0 ? "is-overflowing" : ""}
        style={
          scrollDistance > 0
            ? { "--title-scroll-distance": `${scrollDistance}px` }
            : undefined
        }
      >
        {children}
      </span>
    </strong>
  );
};

const navigation = [
  { label: "Inicio", icon: "home" },
  { label: "Mis quizzes", icon: "library" },
  { label: "Quizzes rápidos", icon: "quick" },
  { label: "Sala de prompts", icon: "sparkle" },
];

const sectionTitles = {
  Inicio: "Tu espacio de estudio.",
  "Mis quizzes": "Crea y organiza tus quizzes.",
  "Quizzes rápidos": "Elige un reto y empieza a jugar.",
  "Sala de prompts": "Diseña quizzes con ayuda de IA.",
  Ajustes: "Configura tu experiencia.",
};

const MUSIC_VOLUME_STORAGE_KEY = "myqwiz:music-volume";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "myqwiz:sidebar-collapsed";
const QUIZ_PROGRESS_NOTICE_HIDDEN_STORAGE_KEY = "myqwiz:hide-progress-notice";
const MUSIC_VOLUME_LEVELS = [0.07, 0.13, 0.2];
const SCORE_QUESTION_TYPES = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección" },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "V/F" },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar" },
  { id: QUESTION_TYPES.MATCHING, label: "Asociar" },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Breve" },
];

const readStoredMusicVolume = () => {
  const storedVolume = Number(
    window.localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY),
  );
  return MUSIC_VOLUME_LEVELS.includes(storedVolume) ? storedVolume : 0.2;
};

function App() {
  const [activeSection, setActiveSection] = useState("Inicio");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true",
  );
  const [sidebarMotion, setSidebarMotion] = useState(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [playingQuizId, setPlayingQuizId] = useState(null);
  const [quickQuizId, setQuickQuizId] = useState(null);
  const [playingQuickQuiz, setPlayingQuickQuiz] = useState(null);
  const [quickQuizLoading, setQuickQuizLoading] = useState(false);
  const [drawnQuickQuiz, setDrawnQuickQuiz] = useState(null);
  const [quickQuizStats, setQuickQuizStats] = useState(() =>
    quickQuizProgress.getAll(),
  );
  const [quickQuizCatalog, setQuickQuizCatalog] = useState([]);
  const [quickQuizCatalogLoading, setQuickQuizCatalogLoading] = useState(false);
  const [quickQuizLibraryState, setQuickQuizLibraryState] = useState({
    selectedCategory: "all",
    searchQuery: "",
  });
  const [activeGameMode, setActiveGameMode] = useState(null);
  const [activeGameRules, setActiveGameRules] = useState({});
  const [gameAttemptKey, setGameAttemptKey] = useState(0);
  const [quizEntryTransitionKey, setQuizEntryTransitionKey] = useState(null);
  const [isQuizProgressNoticeOpen, setIsQuizProgressNoticeOpen] = useState(false);
  const [savedGameSession, setSavedGameSession] = useState(() =>
    quizSessionStorage.get(),
  );
  const [managedQuiz, setManagedQuiz] = useState(null);
  const [manageMode, setManageMode] = useState("rename");
  const [quizPendingEdit, setQuizPendingEdit] = useState(null);
  const [importConflict, setImportConflict] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportingQuiz, setExportingQuiz] = useState(null);
  const [userPreferences, setUserPreferences] = useState(readUserPreferences);
  const [scoreCardCapacity, setScoreCardCapacity] = useState(4);
  const [catRewardState, setCatRewardState] = useState(catRewards.get);
  const [catRewardSignal, setCatRewardSignal] = useState(0);
  const [isCatGameOpen, setIsCatGameOpen] = useState(false);
  const importInputRef = useRef(null);
  const scoreboardRef = useRef(null);
  const quickQuizLibraryScrollRef = useRef(0);
  const shouldRestoreQuickQuizScrollRef = useRef(false);
  const previousSectionRef = useRef(activeSection);
  const quizEntryActionRef = useRef(null);
  const quizEntrySequenceRef = useRef(0);
  const [settingsView, setSettingsView] = useState("index");
  const [selectedAlbumId, setSelectedAlbumId] = useState(
    () =>
      window.localStorage.getItem(MUSIC_ALBUM_STORAGE_KEY) ??
      DEFAULT_MUSIC_ALBUM,
  );
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isMusicChanging, setIsMusicChanging] = useState(false);
  const [musicVolume, setMusicVolume] = useState(readStoredMusicVolume);
  const [isPersonalAlbumModalOpen, setIsPersonalAlbumModalOpen] = useState(false);
  const [editingPersonalAlbum, setEditingPersonalAlbum] = useState(null);
  const musicAudioRef = useRef(null);
  const musicChangeSoundRef = useRef(null);
  const musicChangeSequenceRef = useRef(0);
  const quickQuizCatalogPromiseRef = useRef(null);
  const quickQuizLoaderRef = useRef(null);
  const quickQuizLoadSequenceRef = useRef(0);
  const sidebarMotionTimeoutRef = useRef(null);
  const { theme, changeTheme } = useTheme();
  const shouldLoadPersonalMusic = (
    (activeSection === "Ajustes" && settingsView === "music")
    || selectedAlbumId.startsWith("personal-album-")
    || isPersonalAlbumModalOpen
  );
  const {
    albums: personalMusicAlbums,
    isLoading: personalMusicAlbumsLoading,
    storageEstimate: personalMusicStorageEstimate,
    saveAlbum: savePersonalMusicAlbum,
    deleteAlbum: deletePersonalMusicAlbum,
    loadAlbum: loadPersonalMusicAlbum,
  } = usePersonalMusicAlbums({
    enabled: shouldLoadPersonalMusic,
    activeAlbumId: selectedAlbumId,
    activeTrackIndex: currentTrackIndex,
  });
  const {
    quizzes,
    createDraft,
    saveDraft,
    duplicateDraft,
    deleteDraft,
    importDraft,
    recordAttempt,
  } = useQuizLibrary();

  const editingQuiz = quizzes.find((quiz) => quiz.id === editingQuizId) ?? null;
  const playingQuiz = quizzes.find((quiz) => quiz.id === playingQuizId) ?? null;
  const quickQuizzesWithStats = useMemo(() => quickQuizCatalog.map((quiz) => ({
    ...quiz,
    stats: quickQuizStats[quiz.id] ?? quiz.stats,
  })), [quickQuizCatalog, quickQuizStats]);
  const activeTheme = themes.find((item) => item.id === theme) ?? themes[0];
  const allMusicAlbums = useMemo(
    () => [...musicAlbums, ...personalMusicAlbums],
    [personalMusicAlbums],
  );
  const selectedAlbum =
    allMusicAlbums.find((album) => album.id === selectedAlbumId) ?? musicAlbums[0];
  const currentMusicTrack =
    selectedAlbum.tracks[currentTrackIndex] ?? selectedAlbum.tracks[0] ?? null;
  const isThemeScreen =
    activeSection === "Ajustes" && settingsView === "themes";
  const isSettingsHome =
    activeSection === "Ajustes" && !["themes", "music"].includes(settingsView);
  const hidesSettingsHeading =
    activeSection === "Ajustes" &&
    ["themes", "music", "sound", "help", "accessibility"].includes(settingsView);
  const isMusicScreen = activeSection === "Ajustes" && settingsView === "music";
  const isHomeScreen = activeSection === "Inicio";
  const isQuizScreen = activeSection === "Mis quizzes";
  const isQuickQuizScreen = activeSection === "Quizzes rápidos";
  const isQuizActivityScreen =
    isQuizScreen && Boolean(editingQuiz || playingQuiz);
  const isQuickQuizActivityScreen =
    isQuickQuizScreen && Boolean(quickQuizId);
  const scoredQuizzes = useMemo(() => quizzes
    .filter((quiz) => Number.isFinite(quiz.stats?.bestScore))
    .sort(
      (first, second) =>
        second.stats.bestScore - first.stats.bestScore ||
        new Date(second.stats.lastPlayedAt ?? 0) -
          new Date(first.stats.lastPlayedAt ?? 0),
    ), [quizzes]);
  const visibleScoredQuizzes = scoredQuizzes.slice(0, scoreCardCapacity);
  const visibleScoredQuickQuizzes = useMemo(() => quickQuizzesWithStats
    .filter((quiz) => Number.isFinite(quiz.stats?.bestScore))
    .sort(
      (first, second) =>
        second.stats.bestScore - first.stats.bestScore ||
        new Date(second.stats.lastPlayedAt ?? 0) -
          new Date(first.stats.lastPlayedAt ?? 0),
    )
    .slice(0, 5), [quickQuizzesWithStats]);
  const resumableQuiz = savedGameSession
    ? (quizzes.find((quiz) => quiz.id === savedGameSession.quizId) ?? null)
    : null;
  const isQuizInProgress = Boolean(
    activeGameMode
      && ((isQuizScreen && playingQuiz) || (isQuickQuizScreen && playingQuickQuiz)),
  );
  const sectionTransitionKey = activeSection === "Ajustes"
    ? `${activeSection}-${settingsView}`
    : activeSection;

  const changeUserPreferences = (changes) => {
    setUserPreferences((current) =>
      saveUserPreferences({ ...current, ...changes }),
    );
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((collapsed) => {
      const nextValue = !collapsed;
      window.clearTimeout(sidebarMotionTimeoutRef.current);
      setSidebarMotion(nextValue ? "collapsing" : "expanding");
      sidebarMotionTimeoutRef.current = window.setTimeout(
        () => setSidebarMotion(null),
        320,
      );
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(nextValue),
      );
      return nextValue;
    });
  };

  useEffect(() => {
    applyUserPreferences(userPreferences);
    if (userPreferences.interfaceSounds) {
      prepareSoundBuffers(SOUND_EFFECT_GROUPS.interface);
    }
  }, [userPreferences]);

  useEffect(
    () => () => window.clearTimeout(sidebarMotionTimeoutRef.current),
    [],
  );

  useEffect(() => {
    const hasQuickQuizHistory = Object.keys(quickQuizStats).length > 0;
    const needsCatalog = activeSection === "Quizzes rápidos" || hasQuickQuizHistory;
    if (!needsCatalog || quickQuizCatalog.length) return undefined;

    let active = true;
    setQuickQuizCatalogLoading(true);
    quickQuizCatalogPromiseRef.current ??= import("./data/quick-quizzes/catalog.js");
    quickQuizCatalogPromiseRef.current
      .then(({ quickQuizCatalog: catalog, loadQuickQuiz }) => {
        quickQuizLoaderRef.current = loadQuickQuiz;
        if (active) setQuickQuizCatalog(catalog);
      })
      .catch(() => {
        if (active) {
          systemNotifications.error(
            "No se pudieron cargar los quizzes rápidos",
            "Inténtalo de nuevo en unos segundos.",
          );
          quickQuizCatalogPromiseRef.current = null;
        }
      })
      .finally(() => {
        if (active) setQuickQuizCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSection, quickQuizCatalog.length, quickQuizStats]);

  useEffect(() => {
    if (previousSectionRef.current === activeSection) return;
    previousSectionRef.current = activeSection;
    window.scrollTo(0, 0);
  }, [activeSection]);

  useEffect(() => {
    if (
      !isQuickQuizScreen ||
      quickQuizId ||
      !shouldRestoreQuickQuizScrollRef.current
    )
      return undefined;

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo(0, quickQuizLibraryScrollRef.current);
      shouldRestoreQuickQuizScrollRef.current = false;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isQuickQuizScreen, quickQuizId]);

  useEffect(() => {
    if (canPlayInterfaceSounds()) prepareSoundBuffers(SOUND_EFFECT_GROUPS.interface);

    const unlockAudio = () => {
      if (canPlayInterfaceSounds()) unlockSoundBuffers(SOUND_EFFECT_GROUPS.interface);
    };
    window.addEventListener("pointerdown", unlockAudio, { capture: true });
    window.addEventListener("keydown", unlockAudio, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio, { capture: true });
      window.removeEventListener("keydown", unlockAudio, { capture: true });
      musicChangeSequenceRef.current += 1;
      stopBufferedSound(musicChangeSoundRef.current);
    };
  }, []);

  useEffect(() => {
    if (!playingQuiz && !playingQuickQuiz) return;
    if (canPlayGameplaySounds()) {
      prepareSoundBuffers([
        ...SOUND_EFFECT_GROUPS.gameplay,
        ...SOUND_EFFECT_GROUPS.results,
      ]);
    }
    if (canPlayCatRewardSounds()) prepareSoundBuffers(SOUND_EFFECT_GROUPS.catReward);
  }, [playingQuiz, playingQuickQuiz]);

  useEffect(() => {
    if (!drawnQuickQuiz || !canPlayInterfaceSounds()) return;
    prepareSoundBuffers(SOUND_EFFECT_GROUPS.results);
  }, [drawnQuickQuiz]);

  useEffect(() => {
    if (!isCatGameOpen || !canPlayInterfaceSounds()) return;
    prepareSoundBuffers(SOUND_EFFECT_GROUPS.cat);
  }, [isCatGameOpen]);

  useEffect(() => {
    const scoreboard = scoreboardRef.current;
    if (!scoreboard || typeof ResizeObserver === "undefined") return undefined;

    const updateCapacity = (width) => {
      if (window.matchMedia("(max-width: 600px)").matches) {
        setScoreCardCapacity(Math.max(1, Math.min(5, scoredQuizzes.length)));
        return;
      }

      const cardWidth = 210;
      const gap = 12;
      const capacity = Math.max(
        1,
        Math.floor((width + gap) / (cardWidth + gap)),
      );
      setScoreCardCapacity(capacity);
    };

    updateCapacity(scoreboard.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) =>
      updateCapacity(entry.contentRect.width),
    );
    observer.observe(scoreboard);

    return () => observer.disconnect();
  }, [activeSection, scoredQuizzes.length]);

  useEffect(() => {
    if (personalMusicAlbumsLoading) return;
    if (allMusicAlbums.some((album) => album.id === selectedAlbumId)) return;
    setSelectedAlbumId(DEFAULT_MUSIC_ALBUM);
    setCurrentTrackIndex(0);
    setIsMusicPlaying(false);
    window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, DEFAULT_MUSIC_ALBUM);
  }, [allMusicAlbums, personalMusicAlbumsLoading, selectedAlbumId]);

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

    stopBufferedSound(musicChangeSoundRef.current);
    if (!canPlayInterfaceSounds()) {
      finish();
      return;
    }

    musicChangeSoundRef.current = playBufferedSound(
      "/sounds/music-change.mp3",
      {
        volume: 0.18 * getSoundScale(),
        onEnded: finish,
        onError: finish,
      },
    );
  }, []);

  const selectMusicAlbum = (albumId) => {
    const album = allMusicAlbums.find((item) => item.id === albumId);
    if (!album) return;
    if (album.tracks.length) {
      playMusicChangeTransition(() => {
        setSelectedAlbumId(albumId);
        setCurrentTrackIndex(0);
        setIsMusicPlaying(true);
        window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, albumId);
        systemNotifications.success(
          "Álbum seleccionado",
          `${album.title} comenzó a reproducirse.`,
          { sound: false },
        );
      });
    } else {
      musicChangeSequenceRef.current += 1;
      stopBufferedSound(musicChangeSoundRef.current);
      setIsMusicChanging(false);
      setSelectedAlbumId(albumId);
      setCurrentTrackIndex(0);
      setIsMusicPlaying(false);
      window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, albumId);
      systemNotifications.info(
        "Álbum seleccionado",
        `${album.title} estará disponible cuando agreguemos sus pistas.`,
      );
    }
  };

  const openPersonalAlbumCreator = () => {
    setEditingPersonalAlbum(null);
    setIsPersonalAlbumModalOpen(true);
  };

  const openPersonalAlbumEditor = async (albumId) => {
    try {
      const album = await loadPersonalMusicAlbum(albumId);
      if (!album) throw new Error("Álbum inexistente");
      setEditingPersonalAlbum(album);
      setIsPersonalAlbumModalOpen(true);
    } catch {
      systemNotifications.error(
        "No se pudo abrir el álbum",
        "Las pistas guardadas no están disponibles en este momento.",
      );
    }
  };

  const closePersonalAlbumModal = () => {
    setIsPersonalAlbumModalOpen(false);
    setEditingPersonalAlbum(null);
  };

  const savePersonalAlbum = async (draft) => {
    const shouldSelect = !draft.id || draft.id === selectedAlbumId;
    if (draft.id === selectedAlbumId) {
      musicAudioRef.current?.pause();
      setIsMusicPlaying(false);
    }

    const albumId = await savePersonalMusicAlbum(draft);
    closePersonalAlbumModal();
    if (shouldSelect) {
      setSelectedAlbumId(albumId);
      setCurrentTrackIndex(0);
      setIsMusicPlaying(true);
      window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, albumId);
    }
    systemNotifications.success(
      draft.id ? "Álbum actualizado" : "Álbum creado",
      draft.id ? "Tus cambios quedaron guardados en este navegador." : "Tu música ya está lista para reproducirse.",
      { sound: false },
    );
  };

  const removePersonalAlbum = async (albumId) => {
    const wasSelected = albumId === selectedAlbumId;
    if (wasSelected) {
      musicAudioRef.current?.pause();
      setIsMusicPlaying(false);
    }
    await deletePersonalMusicAlbum(albumId);
    if (wasSelected) {
      setSelectedAlbumId(DEFAULT_MUSIC_ALBUM);
      setCurrentTrackIndex(0);
      window.localStorage.setItem(MUSIC_ALBUM_STORAGE_KEY, DEFAULT_MUSIC_ALBUM);
    }
    closePersonalAlbumModal();
    systemNotifications.success(
      "Álbum eliminado",
      "Las pistas guardadas en este navegador también se eliminaron.",
      { sound: false },
    );
  };

  const toggleMusicPlayback = () => {
    if (!currentMusicTrack?.src || isMusicChanging) return;
    setIsMusicPlaying((playing) => !playing);
  };

  const playNextMusicTrack = useCallback(() => {
    if (!selectedAlbum.tracks.length) return;
    setCurrentTrackIndex((index) => (index + 1) % selectedAlbum.tracks.length);
    setIsMusicPlaying(true);
  }, [selectedAlbum]);

  const playPreviousMusicTrack = useCallback(() => {
    if (!selectedAlbum.tracks.length) return;
    setCurrentTrackIndex(
      (index) =>
        (index - 1 + selectedAlbum.tracks.length) % selectedAlbum.tracks.length,
    );
    setIsMusicPlaying(true);
  }, [selectedAlbum]);

  const changeMusicVolume = (volume) => {
    if (!MUSIC_VOLUME_LEVELS.includes(volume)) return;
    setMusicVolume(volume);
    window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(volume));
  };

  const recordCatCorrectAnswer = useCallback(() => {
    const result = catRewards.recordCorrectAnswer();
    if (result.earned) {
      setCatRewardState(result.state);
      setCatRewardSignal((signal) => signal + 1);
      if (canPlayCatRewardSounds()) {
        playBufferedSound("/sounds/cat-reward.mp3", {
          volume: 0.58 * getSoundScale(),
        });
      }
    }
  }, []);

  const feedSidebarCat = (foodShape) => {
    const nextState = catRewards.feed(foodShape);
    setCatRewardState(nextState);
  };

  const openCatGame = () => {
    setCatRewardState(catRewards.get());
    setIsMenuOpen(false);
    window.setTimeout(() => setIsCatGameOpen(true), 0);
  };

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return undefined;

    let active = true;

    const pauseMusic = () => {
      audio.pause();
    };

    const syncMusicPlayback = () => {
      audio.volume = musicVolume;

      if (!isMusicPlaying || !currentMusicTrack?.src || document.hidden) {
        pauseMusic();
        return;
      }

      audio.play().catch(() => {
        if (active && !document.hidden) setIsMusicPlaying(false);
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) pauseMusic();
      else syncMusicPlayback();
    };

    const handlePageShow = () => {
      if (!document.hidden) syncMusicPlayback();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", pauseMusic);
    window.addEventListener("pageshow", handlePageShow);
    syncMusicPlayback();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", pauseMusic);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [currentMusicTrack, isMusicPlaying, musicVolume]);

  useEffect(() => {
    const playHoverSound = (event) => {
      if (event.pointerType === "touch" || !(event.target instanceof Element))
        return;
      const button = event.target.closest("button");
      if (
        !button ||
        button.disabled ||
        !canPlayInterfaceSounds() ||
        (event.relatedTarget instanceof Node &&
          button.contains(event.relatedTarget))
      )
        return;
      playButtonHoverSound();
    };

    document.addEventListener("pointerover", playHoverSound);
    return () => document.removeEventListener("pointerover", playHoverSound);
  }, []);

  useEffect(() => {
    const playPressSound = (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.disabled) return;

      const ownedSound = button.dataset.buttonSound;
      if (ownedSound === "interface") return;
      if (ownedSound === "gameplay" && canPlayGameplaySounds()) return;

      playButtonPressSound();
    };

    document.addEventListener("click", playPressSound);
    return () => document.removeEventListener("click", playPressSound);
  }, []);

  useEffect(() => {
    const textInputTypes = new Set([
      "text",
      "search",
      "email",
      "url",
      "tel",
      "number",
      "password",
    ]);
    const playFieldTypingSound = (event) => {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLInputElement && textInputTypes.has(target.type);
      const isEditable =
        isTextInput ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (!isEditable) return;

      const inputType = event.inputType ?? "";
      if (!inputType.startsWith("insert") && !inputType.startsWith("delete"))
        return;
      playTypingSound();
    };

    document.addEventListener("beforeinput", playFieldTypingSound);
    return () =>
      document.removeEventListener("beforeinput", playFieldTypingSound);
  }, []);

  const selectSection = (label) => {
    shouldRestoreQuickQuizScrollRef.current = false;
    if (label === activeSection) window.scrollTo(0, 0);
    setActiveSection(label);
    setIsMenuOpen(false);

    if (label !== "Mis quizzes") {
      setEditingQuizId(null);
      setPlayingQuizId(null);
      setActiveGameMode(null);
      setActiveGameRules({});
    }

    if (label !== "Quizzes rápidos") {
      quickQuizLoadSequenceRef.current += 1;
      setQuickQuizId(null);
      setPlayingQuickQuiz(null);
      setQuickQuizLoading(false);
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

  const enterQuizEditor = (quiz) => {
    setActiveSection("Mis quizzes");
    setPlayingQuizId(null);
    setActiveGameMode(null);
    setActiveGameRules({});
    setEditingQuizId(quiz.id);
  };

  const openQuizDraft = (quiz) => {
    const hasPreviousScore = Number.isFinite(quiz.stats?.bestScore);
    if (quiz.status === "ready" && hasPreviousScore) {
      setQuizPendingEdit(quiz);
      return;
    }

    enterQuizEditor(quiz);
  };

  const confirmQuizEdit = (quiz) => {
    setQuizPendingEdit(null);
    enterQuizEditor(quiz);
  };

  const openQuizGame = (quiz) => {
    setActiveSection("Mis quizzes");
    setEditingQuizId(null);
    setPlayingQuizId(quiz.id);
    setActiveGameMode(null);
    setActiveGameRules({});
  };

  const openQuickQuizGame = async (quiz) => {
    const loadSequence = quickQuizLoadSequenceRef.current + 1;
    quickQuizLoadSequenceRef.current = loadSequence;
    if (activeSection === "Quizzes rápidos" && !quickQuizId) {
      quickQuizLibraryScrollRef.current = window.scrollY;
      shouldRestoreQuickQuizScrollRef.current = true;
    }

    setActiveSection("Quizzes rápidos");
    setQuickQuizId(quiz.id);
    setPlayingQuickQuiz(null);
    setQuickQuizLoading(true);
    setActiveGameMode(null);
    setActiveGameRules({});
    try {
      if (!quickQuizLoaderRef.current) {
        const catalogModule = await import("./data/quick-quizzes/catalog.js");
        quickQuizLoaderRef.current = catalogModule.loadQuickQuiz;
      }
      const loadedQuiz = await quickQuizLoaderRef.current(quiz.id);
      if (quickQuizLoadSequenceRef.current !== loadSequence) return;
      if (!loadedQuiz) throw new Error("Quiz inexistente");
      setPlayingQuickQuiz({
        ...loadedQuiz,
        stats: quickQuizStats[loadedQuiz.id] ?? loadedQuiz.stats,
      });
    } catch {
      if (quickQuizLoadSequenceRef.current !== loadSequence) return;
      setQuickQuizId(null);
      systemNotifications.error(
        "No se pudo cargar el quiz",
        "Inténtalo nuevamente en unos segundos.",
      );
    } finally {
      if (quickQuizLoadSequenceRef.current === loadSequence) setQuickQuizLoading(false);
    }
  };

  const drawQuickQuiz = () => {
    const quiz =
      quickQuizzesWithStats[
        Math.floor(Math.random() * quickQuizzesWithStats.length)
      ];
    if (quiz) setDrawnQuickQuiz(quiz);
  };

  const finishQuickQuizDraw = (quiz) => {
    setDrawnQuickQuiz(null);
    openQuickQuizGame(quiz);
  };

  const exitQuickQuizGame = () => {
    quickQuizLoadSequenceRef.current += 1;
    quizSessionStorage.clear();
    setActiveGameMode(null);
    setActiveGameRules({});
    setQuickQuizId(null);
    setPlayingQuickQuiz(null);
  };

  const completeQuickQuizGame = useCallback(
    ({ score }) => {
      quizSessionStorage.clear();
      if (quickQuizId)
        setQuickQuizStats(quickQuizProgress.recordAttempt(quickQuizId, score));
    },
    [quickQuizId],
  );

  const ignoreQuickQuizProgress = useCallback(() => {}, []);

  const beginQuizEntryTransition = (action) => {
    quizEntryActionRef.current = action;
    quizEntrySequenceRef.current += 1;
    setQuizEntryTransitionKey(quizEntrySequenceRef.current);
  };

  const revealQuizEntry = useCallback(() => {
    const action = quizEntryActionRef.current;
    quizEntryActionRef.current = null;
    action?.();
  }, []);

  const finishQuizEntry = useCallback(() => {
    setQuizEntryTransitionKey(null);
  }, []);

  const startQuizGame = (_quiz, gameMode, rules) => {
    quizSessionStorage.clear();
    setSavedGameSession(null);
    beginQuizEntryTransition(() => {
      setActiveGameRules(rules);
      setActiveGameMode(gameMode);
    });
  };

  const exitQuizGame = () => {
    setActiveGameMode(null);
    setActiveGameRules({});
    setPlayingQuizId(null);
  };

  const continueQuizLater = () => {
    exitQuizGame();
    if (window.localStorage.getItem(QUIZ_PROGRESS_NOTICE_HIDDEN_STORAGE_KEY) !== "true") {
      setIsQuizProgressNoticeOpen(true);
    }
  };

  const closeQuizProgressNotice = useCallback((dontShowAgain = false) => {
    if (dontShowAgain) {
      window.localStorage.setItem(QUIZ_PROGRESS_NOTICE_HIDDEN_STORAGE_KEY, "true");
    }
    setIsQuizProgressNoticeOpen(false);
  }, []);

  const completeQuizGame = useCallback(
    ({ score }) => {
      quizSessionStorage.clear();
      setSavedGameSession(null);
      if (playingQuizId) recordAttempt(playingQuizId, score);
    },
    [playingQuizId, recordAttempt],
  );

  const saveQuizGameProgress = useCallback((session) => {
    const savedSession = quizSessionStorage.save(session);
    setSavedGameSession(savedSession);
  }, []);

  const resumeQuizGame = () => {
    if (!savedGameSession || !resumableQuiz) return;
    playConfirmSound();
    beginQuizEntryTransition(() => {
      setActiveSection("Mis quizzes");
      setEditingQuizId(null);
      setPlayingQuizId(resumableQuiz.id);
      setActiveGameRules(savedGameSession.gameRules ?? {});
      setActiveGameMode(savedGameSession.gameMode);
      setGameAttemptKey((value) => value + 1);
      setIsMenuOpen(false);
    });
  };

  const retryQuizGame = () => {
    beginQuizEntryTransition(() => {
      quizSessionStorage.clear();
      setSavedGameSession(null);
      setGameAttemptKey((value) => value + 1);
    });
  };

  const saveQuizDraft = useCallback(
    (quiz, { silent = false } = {}) => {
      try {
        const savedQuiz = saveDraft(quiz);
        if (!silent) {
          systemNotifications.success(
            "Cambios guardados",
            `“${savedQuiz.title}” quedó actualizado.`,
          );
        }
        return savedQuiz;
      } catch (error) {
        systemNotifications.error(
          "No se pudo guardar",
          error.message || "Revisa los datos del quiz e inténtalo nuevamente.",
        );
        return null;
      }
    },
    [saveDraft],
  );

  const openManageQuiz = (quiz, mode) => {
    setManagedQuiz(quiz);
    setManageMode(mode);
  };

  const closeManageQuiz = () => setManagedQuiz(null);

  const confirmManageQuiz = (quiz) => {
    try {
      if (manageMode === "delete") {
        if (deleteDraft(quiz.id)) {
          systemNotifications.success(
            "Quiz eliminado",
            `“${quiz.title}” ya no está en tu biblioteca.`,
          );
        }
      } else {
        const savedQuiz = saveDraft(quiz);
        systemNotifications.success(
          "Nombre actualizado",
          `Ahora aparece como “${savedQuiz.title}”.`,
        );
      }
      closeManageQuiz();
    } catch (error) {
      systemNotifications.error(
        "No se pudo completar",
        error.message || "Inténtalo nuevamente.",
      );
    }
  };

  const duplicateQuizDraft = (quiz) => {
    try {
      const duplicate = duplicateDraft(quiz);
      systemNotifications.success(
        "Copia creada",
        `“${duplicate.title}” ya está en tu biblioteca.`,
      );
    } catch (error) {
      systemNotifications.error(
        "No se pudo duplicar",
        error.message || "Inténtalo nuevamente.",
      );
    }
  };

  const showQuizValidationError = (errors) => {
    const firstError =
      errors[0]?.message ?? "Completa las preguntas antes de continuar.";
    const remaining =
      errors.length > 1
        ? ` Quedan ${errors.length} detalles por corregir.`
        : "";
    systemNotifications.warning("Quiz incompleto", `${firstError}${remaining}`);
  };

  const openQuizImport = () => setIsImportModalOpen(true);
  const chooseQuizImportFile = () => importInputRef.current?.click();

  const completeQuizImport = (sourceQuiz) => {
    const importedQuiz = importDraft(sourceQuiz);
    setActiveSection("Mis quizzes");
    systemNotifications.success(
      "Quiz importado",
      `“${importedQuiz.title}” ya está en tu biblioteca.`,
    );
    return importedQuiz;
  };

  const importQuizContent = (content) => {
    try {
      if (new Blob([content]).size > MAX_QUIZ_FILE_SIZE)
        throw new Error("El contenido supera el límite de 5 MB.");
      const parsedQuiz = parseQuizImport(content);
      const identicalQuiz = quizzes.find((quiz) =>
        areQuizzesEquivalent(quiz, parsedQuiz),
      );
      const sameNameQuiz = quizzes.find(
        (quiz) =>
          normalizeQuizTitle(quiz.title) ===
          normalizeQuizTitle(parsedQuiz.title),
      );

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
      systemNotifications.error(
        "No se pudo reconocer el JSON",
        error.message || "El contenido no es compatible.",
      );
      return false;
    }
  };

  const importQuizFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > MAX_QUIZ_FILE_SIZE)
        throw new Error("El archivo supera el límite de 5 MB.");
      importQuizContent(await file.text());
    } catch (error) {
      systemNotifications.error(
        "No se pudo importar",
        error.message || "El archivo no es compatible.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const confirmConflictingImport = (title) => {
    const normalizedTitle = normalizeQuizTitle(title);
    if (
      quizzes.some((quiz) => normalizeQuizTitle(quiz.title) === normalizedTitle)
    ) {
      systemNotifications.warning(
        "Nombre ocupado",
        "Elige un nombre que no esté utilizado en tu biblioteca.",
      );
      return;
    }

    completeQuizImport({ ...importConflict.quiz, title });
    setImportConflict(null);
  };

  const exportQuizFile = (filename) => {
    if (!exportingQuiz) return;
    try {
      downloadQuizFile(exportingQuiz, filename);
      systemNotifications.success(
        "Archivo exportado",
        `Guardamos “${exportingQuiz.title}” en formato MyQwiz.`,
      );
      setExportingQuiz(null);
    } catch {
      systemNotifications.error(
        "No se pudo exportar",
        "El navegador no permitió crear el archivo.",
      );
    }
  };

  const openGoogleDrive = () => {
    window.open(
      "https://drive.google.com/drive/my-drive",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div
      className={`app-shell ${isSidebarCollapsed ? "is-sidebar-collapsed" : ""} ${sidebarMotion ? `is-sidebar-${sidebarMotion}` : ""}`}
    >
      {quizEntryTransitionKey !== null && (
        <QuizEntryTransition
          key={quizEntryTransitionKey}
          onCovered={revealQuizEntry}
          onComplete={finishQuizEntry}
        />
      )}
      <Toaster
        position="bottom-right"
        theme={theme === "sky" || theme === "pink" ? "dark" : "light"}
        options={{ duration: 4000, roundness: 16, fill: "var(--toast-bg)" }}
      />
      <aside
        className={`sidebar ${isSidebarCollapsed ? "is-collapsed" : ""} ${isMenuOpen ? "is-open" : ""}`}
      >
        <div className="brand" aria-label="MyQwiz">
          <SidebarMascot
            rewardSignal={catRewardSignal}
            onActivate={openCatGame}
          />
          <img
            className="brand__wordmark"
            src={wordmarkByTheme[theme]}
            alt=""
          />
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          <p className="nav-label">Tu espacio</p>
          {navigation.map((item) => (
            <button
              className={`nav-item ${activeSection === item.label ? "is-active" : ""}`}
              key={item.label}
              type="button"
              aria-label={item.label}
              title={isSidebarCollapsed ? item.label : undefined}
              onClick={() => selectSection(item.label)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-widgets">
          {resumableQuiz && !isQuizInProgress && (
            <button
              className="sidebar-card sidebar-card--resume"
              type="button"
              data-button-sound="interface"
              aria-label={`Continuar ${resumableQuiz.title}`}
              title={isSidebarCollapsed ? `Continuar ${resumableQuiz.title}` : undefined}
              onClick={resumeQuizGame}
            >
              <span className="sidebar-card__top">
                <span className="sidebar-card__copy">
                  <small>Continuar</small>
                  <strong>{resumableQuiz.title}</strong>
                </span>
                <span className="sidebar-card__icon">
                  <Icon name="arrow" size={17} />
                </span>
              </span>
              <span className="sidebar-card__progress-row">
                <span className="sidebar-card__progress">
                  <i
                    style={{
                      width: `${((savedGameSession.questionIndex + 1) / savedGameSession.questions.length) * 100}%`,
                    }}
                  />
                </span>
                <span className="sidebar-card__progress-count">
                  {Math.min(
                    savedGameSession.questionIndex + 1,
                    savedGameSession.questions.length,
                  )}
                  /{savedGameSession.questions.length}
                </span>
              </span>
            </button>
          )}

          <div
            className={`sidebar-music ${isMusicPlaying ? "is-playing" : ""}`}
          >
            <button
              className="sidebar-music__cover"
              type="button"
              aria-label="Abrir la sala de música para cambiar de álbum"
              onClick={() => {
                selectSection("Ajustes");
                setSettingsView("music");
              }}
            >
              <AlbumCover album={selectedAlbum} />
            </button>
            <div>
              <button
                type="button"
                onClick={playPreviousMusicTrack}
                disabled={!currentMusicTrack?.src || isMusicChanging}
                aria-label="Pista anterior"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="2" height="14" />
                  <path d="m18 5-9 7 9 7V5Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={toggleMusicPlayback}
                disabled={!currentMusicTrack?.src || isMusicChanging}
                aria-label={
                  isMusicPlaying ? "Pausar música" : "Reproducir música"
                }
                title={
                  isSidebarCollapsed
                    ? (isMusicPlaying ? "Pausar música" : "Reproducir música")
                    : undefined
                }
              >
                {isMusicPlaying ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <rect x="6" y="5" width="4" height="14" />
                    <rect x="14" y="5" width="4" height="14" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="m8 5 11 7-11 7V5Z" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={playNextMusicTrack}
                disabled={!currentMusicTrack?.src || isMusicChanging}
                aria-label="Siguiente pista"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="m6 5 9 7-9 7V5Z" />
                  <rect x="16" y="5" width="2" height="14" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <a
          className="sidebar-support"
          href="https://ko-fi.com/makartzzz"
          target="_blank"
          rel="noopener noreferrer"
          data-button-sound="interface"
          aria-label="Invitar al creador un café en Ko-fi"
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch") playButtonHoverSound();
          }}
        >
          <SupportCoffee className="sidebar-support__coffee" />
          <span>
            <small>¿Te gusta MyQwiz?</small>
            <strong>Invítame un café</strong>
          </span>
          <Icon name="arrow" size={16} />
        </a>

        <button
          className="nav-item nav-item--settings"
          type="button"
          aria-label="Ajustes"
          title={isSidebarCollapsed ? "Ajustes" : undefined}
          onClick={() => selectSection("Ajustes")}
        >
          <Icon name="settings" />
          <span>Ajustes</span>
        </button>
      </aside>

      <button
        className="sidebar-toggle"
        type="button"
        aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Minimizar barra lateral"}
        aria-expanded={!isSidebarCollapsed}
        title={isSidebarCollapsed ? "Expandir barra lateral" : "Minimizar barra lateral"}
        onClick={toggleSidebar}
      >
        <Icon name={isSidebarCollapsed ? "expand" : "collapse"} size={17} />
      </button>

      {isMenuOpen && (
        <button
          className="menu-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main
        className={`main-content ${isThemeScreen ? "main-content--themes" : ""} ${isSettingsHome ? "main-content--settings" : ""} ${isMusicScreen ? "main-content--music" : ""} ${isHomeScreen || isQuizScreen || isQuickQuizScreen ? "main-content--workspace" : ""} ${isHomeScreen ? "main-content--home" : ""} ${isQuizScreen || isQuickQuizScreen ? "main-content--library" : ""}`}
      >
        <Suspense fallback={<QwizLoader />}>
        <div className="section-transition" key={sectionTransitionKey}>
        {!hidesSettingsHeading &&
          !isQuizActivityScreen &&
          !isQuickQuizActivityScreen && (
            <header
              className={`topbar ${isQuizScreen || isQuickQuizScreen ? "topbar--menu-only" : ""}`}
            >
              <button
                className="menu-button"
                type="button"
                aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Icon name={isMenuOpen ? "close" : "menu"} />
              </button>
              {!isQuizScreen && !isQuickQuizScreen && (
                <div>
                  <span className="eyebrow">{activeSection}</span>
                  <h1>{sectionTitles[activeSection]}</h1>
                </div>
              )}
            </header>
          )}

        {activeSection === "Inicio" && (
          <>
            <section className="hero-card">
              <div className="hero-card__content">
                <span className="hero-kicker">
                  <Icon name="sparkle" size={16} /> Aprende a tu manera
                </span>
                <h2>
                  Crea, practica
                  <br />y conquista.
                </h2>
                <p>
                  Convierte tus apuntes en quizzes dinámicos, descubre qué
                  necesitas reforzar y aprende a tu ritmo.
                </p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={beginQuizCreation}
                >
                  <Icon name="plus" /> Crear un quiz
                </button>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <BlinkingCharacter
                  className={`hero-character hero-character--${theme}`}
                  src={activeTheme.character}
                  blinkSrc={activeTheme.blinkCharacter}
                  theme={theme}
                />
              </div>
            </section>

            <section className="home-overview" aria-labelledby="overview-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Resultados</span>
                  <h2 id="overview-title">Tus mejores quizzes personales</h2>
                </div>
              </div>

              <div className="scoreboard">
                <div
                  className={`scoreboard__list ${visibleScoredQuizzes.length ? "" : "is-empty"}`}
                  ref={scoreboardRef}
                  style={{
                    "--score-card-count": Math.max(
                      visibleScoredQuizzes.length,
                      1,
                    ),
                  }}
                >
                  {visibleScoredQuizzes.length ? (
                    visibleScoredQuizzes.map((quiz, index) => {
                      const isPerfect = quiz.stats.bestScore === 100;
                      const questionTypeCounts = SCORE_QUESTION_TYPES.map(
                        (type) => ({
                          ...type,
                          count: quiz.questionTypeCounts?.[type.id] ?? quiz.questions.filter(
                            (question) => question.type === type.id,
                          ).length,
                        }),
                      ).filter((type) => type.count > 0);

                      return (
                        <article
                          className={`score-card ${isPerfect ? "is-perfect" : ""}`}
                          key={quiz.id}
                        >
                          <span className="score-card__position">
                            #{index + 1}
                          </span>
                          <span className="score-card__subject">
                            <QuizIcon iconId={quiz.iconId} size={22} />
                          </span>
                          <div className="score-card__copy">
                            <AutoScrollTitle>{quiz.title}</AutoScrollTitle>
                            <span>{quiz.questionCount ?? quiz.questions.length} preguntas</span>
                          </div>
                          <div
                            className="score-card__types"
                            aria-label="Preguntas por tipo"
                          >
                            {questionTypeCounts.map((type) => (
                              <span key={type.id}>
                                <i>{type.label}</i>
                                <b>{type.count}</b>
                              </span>
                            ))}
                          </div>
                          <div className="score-card__score">
                            <strong>{quiz.stats.bestScore}%</strong>
                            <span>Mejor nota</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openQuizGame(quiz)}
                            aria-label={`Jugar ${quiz.title}`}
                            title="Jugar quiz"
                          >
                            <Play size={18} fill="currentColor" />
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <div className="scoreboard__empty">
                      <Icon name="trophy" size={22} />
                      <div>
                        <strong>Aún no hay resultados</strong>
                        <span>
                          Completa un quiz y tu mejor nota aparecerá aquí.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              className="home-overview"
              aria-labelledby="quick-overview-title"
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Partidas rápidas</span>
                  <h2 id="quick-overview-title">Tus mejores quizzes rápidos</h2>
                </div>
              </div>

              <div className="scoreboard">
                <div
                  className={`scoreboard__list scoreboard__list--fixed-five ${visibleScoredQuickQuizzes.length ? "" : "is-empty"}`}
                  style={{
                    "--score-card-count": Math.max(
                      visibleScoredQuickQuizzes.length,
                      1,
                    ),
                  }}
                >
                  {visibleScoredQuickQuizzes.length ? (
                    visibleScoredQuickQuizzes.map((quiz, index) => {
                      const isPerfect = quiz.stats.bestScore === 100;
                      const questionTypeCounts = SCORE_QUESTION_TYPES.map(
                        (type) => ({
                          ...type,
                          count: quiz.questionTypeCounts?.[type.id] ?? quiz.questions?.filter(
                            (question) => question.type === type.id,
                          ).length ?? 0,
                        }),
                      ).filter((type) => type.count > 0);

                      return (
                        <article
                          className={`score-card ${isPerfect ? "is-perfect" : ""}`}
                          key={quiz.id}
                        >
                          <span className="score-card__position">
                            #{index + 1}
                          </span>
                          <span className="score-card__subject">
                            <QuizIcon iconId={quiz.iconId} size={22} />
                          </span>
                          <div className="score-card__copy">
                            <AutoScrollTitle>{quiz.title}</AutoScrollTitle>
                            <span>{quiz.questionCount ?? quiz.questions?.length ?? 0} preguntas</span>
                          </div>
                          <div
                            className="score-card__types"
                            aria-label="Preguntas por tipo"
                          >
                            {questionTypeCounts.map((type) => (
                              <span key={type.id}>
                                <i>{type.label}</i>
                                <b>{type.count}</b>
                              </span>
                            ))}
                          </div>
                          <div className="score-card__score">
                            <strong>{quiz.stats.bestScore}%</strong>
                            <span>Mejor nota</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openQuickQuizGame(quiz)}
                            aria-label={`Jugar ${quiz.title}`}
                            title="Jugar quiz rápido"
                          >
                            <Play size={18} fill="currentColor" />
                          </button>
                        </article>
                      );
                    })
                  ) : (
                    <div className="scoreboard__empty">
                      <Icon name="quick" size={22} />
                      <div>
                        <strong>Aún no hay resultados rápidos</strong>
                        <span>
                          Completa un quiz rápido y tus cinco mejores notas
                          aparecerán aquí.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {activeSection === "Mis quizzes" &&
          (playingQuiz ? (
            activeGameMode ? (
              <QuizPlayer
                key={`${playingQuiz.id}-${activeGameMode}-${gameAttemptKey}`}
                quiz={playingQuiz}
                theme={theme}
                gameMode={activeGameMode}
                gameRules={activeGameRules}
                isEntryTransitionActive={quizEntryTransitionKey !== null}
                automaticQuestionAdvance={userPreferences.automaticQuestionAdvance}
                initialSession={savedGameSession}
                onExit={exitQuizGame}
                onContinueLater={continueQuizLater}
                onComplete={completeQuizGame}
                onCorrectAnswer={recordCatCorrectAnswer}
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
            <QuizEditor
              quiz={editingQuiz}
              onBack={() => setEditingQuizId(null)}
              onSave={saveQuizDraft}
              onValidationError={showQuizValidationError}
            />
          ) : (
            <>
              <section
                className="library-section"
                aria-labelledby="library-title"
              >
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">Tu biblioteca</span>
                    <h2 id="library-title">Todos tus quizzes</h2>
                  </div>
                  <div className="library-heading-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setIsCreatorOpen(true)}
                    >
                      <Icon name="plus" size={17} /> Crear quiz
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={openQuizImport}
                    >
                      <Icon name="file" size={17} /> Importar
                    </button>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => selectSection("Sala de prompts")}
                    >
                      <Icon name="sparkle" size={17} /> Sala de prompts
                    </button>
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
          ))}

        {activeSection === "Quizzes rápidos" &&
          (quickQuizCatalogLoading && !quickQuizCatalog.length ? (
            <section className="feature-loading" role="status">Cargando quizzes rápidos…</section>
          ) : quickQuizLoading ? (
            <section className="feature-loading" role="status">Preparando el quiz…</section>
          ) : playingQuickQuiz ? (
            activeGameMode ? (
              <QuizPlayer
                key={`${playingQuickQuiz.id}-${activeGameMode}-${gameAttemptKey}`}
                quiz={playingQuickQuiz}
                theme={theme}
                gameMode={activeGameMode}
                gameRules={activeGameRules}
                isEntryTransitionActive={quizEntryTransitionKey !== null}
                automaticQuestionAdvance={userPreferences.automaticQuestionAdvance}
                onExit={exitQuickQuizGame}
                onComplete={completeQuickQuizGame}
                onCorrectAnswer={recordCatCorrectAnswer}
                onProgress={ignoreQuickQuizProgress}
                onRetry={retryQuizGame}
                continueLaterLabel="Salir"
                exitLabel="Volver a quizzes rápidos"
              />
            ) : (
              <GameModeSelector
                key={playingQuickQuiz.id}
                quiz={playingQuickQuiz}
                onBack={exitQuickQuizGame}
                onStart={startQuizGame}
                backLabel="Volver a quizzes rápidos"
              />
            )
          ) : (
            <QuickQuizLibrary
              quizzes={quickQuizzesWithStats}
              selectedCategory={quickQuizLibraryState.selectedCategory}
              searchQuery={quickQuizLibraryState.searchQuery}
              onCategoryChange={(selectedCategory) =>
                setQuickQuizLibraryState((current) => ({
                  ...current,
                  selectedCategory,
                }))
              }
              onSearchQueryChange={(searchQuery) =>
                setQuickQuizLibraryState((current) => ({
                  ...current,
                  searchQuery,
                }))
              }
              onPlay={openQuickQuizGame}
              onDraw={drawQuickQuiz}
            />
          ))}

        {activeSection === "Sala de prompts" && <PromptRoom />}

        {activeSection === "Ajustes" &&
          (settingsView === "themes" ? (
            <div className="settings-detail">
              <button
                className="settings-back"
                type="button"
                onClick={() => setSettingsView("index")}
              >
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <ThemeSwitcher activeTheme={theme} onChange={changeTheme} />
            </div>
          ) : settingsView === "music" ? (
            <div className="settings-detail">
              <button
                className="settings-back"
                type="button"
                onClick={() => setSettingsView("index")}
              >
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <MusicSelector
                albums={musicAlbums}
                personalAlbums={personalMusicAlbums}
                personalAlbumsLoading={personalMusicAlbumsLoading}
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
                onCreatePersonalAlbum={openPersonalAlbumCreator}
                onEditPersonalAlbum={openPersonalAlbumEditor}
              />
            </div>
          ) : settingsView === "sound" ? (
            <div className="settings-detail">
              <button
                className="settings-back"
                type="button"
                onClick={() => setSettingsView("index")}
              >
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <SoundSettings
                preferences={userPreferences}
                onChange={changeUserPreferences}
              />
            </div>
          ) : settingsView === "help" ? (
            <div className="settings-detail">
              <button
                className="settings-back"
                type="button"
                onClick={() => setSettingsView("index")}
              >
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <HelpSettings
                onCreate={beginQuizCreation}
                onImport={() => {
                  setActiveSection("Mis quizzes");
                  openQuizImport();
                }}
                onPromptRoom={() => selectSection("Sala de prompts")}
              />
            </div>
          ) : settingsView === "accessibility" ? (
            <div className="settings-detail">
              <button
                className="settings-back"
                type="button"
                onClick={() => setSettingsView("index")}
              >
                <Icon name="back" size={18} /> Volver a Ajustes
              </button>
              <AccessibilitySettings
                preferences={userPreferences}
                onChange={changeUserPreferences}
              />
            </div>
          ) : (
            <section
              className="settings-home"
              aria-label="Categorías de ajustes"
            >
              <div className="settings-options">
                <button
                  className="settings-option settings-option--featured"
                  type="button"
                  onClick={() => setSettingsView("themes")}
                >
                  <span className="settings-option__icon">
                    <SwatchBook size={25} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="settings-option__copy">
                    <strong>Tema</strong>
                    <small>{activeTheme.label}</small>
                  </span>
                  <BlinkingCharacter
                    className={`settings-option__character settings-option__character--${theme}`}
                    src={activeTheme.character}
                    blinkSrc={activeTheme.blinkCharacter}
                    theme={theme}
                  />
                  <Icon name="arrow" size={20} />
                </button>
                <button
                  className={`settings-option settings-option--music ${isMusicPlaying ? "is-playing" : ""}`}
                  type="button"
                  onClick={() => setSettingsView("music")}
                >
                  <span className="settings-option__album">
                    <AlbumCover album={selectedAlbum} />
                  </span>
                  <span className="settings-option__music-copy">
                    <small>Reproductor ambiental</small>
                    <strong>{selectedAlbum.title}</strong>
                  </span>
                  <span
                    className="settings-option__turntable"
                    aria-hidden="true"
                  >
                    <span className="settings-option__vinyl" />
                    <span className="settings-option__tonearm">
                      <i />
                    </span>
                  </span>
                  <Icon name="arrow" size={20} />
                </button>
                <div className="settings-option-frame settings-option-frame--sound">
                  <button
                    className="settings-option settings-option--sound"
                    type="button"
                    onClick={() => setSettingsView("sound")}
                  >
                    <span className="settings-option__icon">
                      <Icon name="volume" size={25} />
                    </span>
                    <strong>Sonido</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
                <div className="settings-option-frame settings-option-frame--help">
                  <button
                    className="settings-option settings-option--help"
                    type="button"
                    onClick={() => setSettingsView("help")}
                  >
                    <span className="settings-option__icon">
                      <Icon name="help" size={25} />
                    </span>
                    <strong>Tutoriales y ayuda</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
                <div className="settings-option-frame settings-option-frame--accessibility">
                  <button
                    className="settings-option settings-option--accessibility"
                    type="button"
                    onClick={() => setSettingsView("accessibility")}
                  >
                    <span className="settings-option__icon">
                      <Icon name="accessibility" size={25} />
                    </span>
                    <strong>Accesibilidad</strong>
                    <Icon name="arrow" size={20} />
                  </button>
                </div>
              </div>
              <a
                className="help-support settings-support"
                href="https://ko-fi.com/makartzzz"
                target="_blank"
                rel="noopener noreferrer"
                data-button-sound="interface"
                aria-label="Invitar al creador un café en Ko-fi"
                onPointerEnter={(event) => {
                  if (event.pointerType !== "touch") playSupportHoverSound();
                }}
              >
                <SupportCoffee className="help-support__coffee" />
                <span>
                  <small>¿Te gusta MyQwiz?</small>
                  <strong>Invítame un café</strong>
                  <p>Invítame un café desde $1 y apoya mi trabajo como desarrollador indie.</p>
                </span>
                <b>Invitar un café →</b>
              </a>
            </section>
          ))}
        </div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {isCreatorOpen && (
          <QuizCreatorModal
            isOpen
            onClose={() => setIsCreatorOpen(false)}
            onCreate={createQuizDraft}
          />
        )}
        {drawnQuickQuiz && (
          <QuickQuizDrawModal
            quiz={drawnQuickQuiz}
            onCancel={() => setDrawnQuickQuiz(null)}
            onComplete={finishQuickQuizDraw}
          />
        )}
        {quizPendingEdit && (
          <QuizEditWarningModal
            quiz={quizPendingEdit}
            onClose={() => setQuizPendingEdit(null)}
            onConfirm={confirmQuizEdit}
          />
        )}
        {isQuizProgressNoticeOpen && (
          <QuizProgressNoticeModal
            isOpen
            onClose={closeQuizProgressNotice}
          />
        )}
        {managedQuiz && (
          <QuizManageModal
            quiz={managedQuiz}
            mode={manageMode}
            onClose={closeManageQuiz}
            onConfirm={confirmManageQuiz}
          />
        )}
        {isImportModalOpen && (
          <QuizImportModal
            isOpen
            onClose={() => setIsImportModalOpen(false)}
            onChooseFile={chooseQuizImportFile}
            onImportText={importQuizContent}
          />
        )}
        {importConflict && (
          <QuizImportConflictModal
            conflict={importConflict}
            onClose={() => setImportConflict(null)}
            onConfirm={confirmConflictingImport}
          />
        )}
        {exportingQuiz && (
          <QuizExportModal
            quiz={exportingQuiz}
            onClose={() => setExportingQuiz(null)}
            onExport={exportQuizFile}
            onDrive={openGoogleDrive}
          />
        )}
        {isPersonalAlbumModalOpen && (
          <PersonalAlbumModal
            album={editingPersonalAlbum}
            storageEstimate={personalMusicStorageEstimate}
            onClose={closePersonalAlbumModal}
            onSave={savePersonalAlbum}
            onDelete={removePersonalAlbum}
          />
        )}
        {isCatGameOpen && (
          <CatFeedingGame
            rewards={catRewardState}
            onClose={() => setIsCatGameOpen(false)}
            onFeed={feedSidebarCat}
          />
        )}
      </Suspense>
      <audio
        ref={musicAudioRef}
        src={currentMusicTrack?.src}
        preload="metadata"
        onEnded={playNextMusicTrack}
      />
      <input
        ref={importInputRef}
        className="visually-hidden"
        type="file"
        accept=".json,.myqwiz.json,application/json"
        onChange={importQuizFile}
      />
    </div>
  );
}

export default App;
