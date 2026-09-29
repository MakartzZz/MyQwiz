import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES } from "../domain/quizConstants.js";
import { getGameModeOptionsForQuiz } from "../domain/gameModes.js";
import { playConfirmSound } from "../services/uiSounds.js";
import { QuizIcon, quizIconOptions } from "./QuizIcon.jsx";

const ModeIcon = ({ mode }) => {
  const paths = {
    [GAME_MODES.CLASSIC]: <><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></>,
    [GAME_MODES.LIVES]: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    [GAME_MODES.CHECKPOINT]: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    [GAME_MODES.RACE]: <><path d="M5 19h14" /><path d="M7 16 17 6" /><path d="M9 6h8v8" /></>,
  };

  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[mode]}
    </svg>
  );
};

const modeDetails = {
  [GAME_MODES.CLASSIC]: "Sin vidas ni reloj. Ideal para estudiar con calma.",
  [GAME_MODES.LIVES]: "Empiezas con 3 vidas. Tres errores terminan el intento.",
  [GAME_MODES.CHECKPOINT]: "Acierta para ganar tiempo y evita las penalizaciones.",
  [GAME_MODES.RACE]: "Cada pregunta tiene su propio tiempo límite.",
};

const modeSoundPaths = {
  [GAME_MODES.CLASSIC]: "/sounds/game-modes/classic.mp3",
  [GAME_MODES.LIVES]: "/sounds/game-modes/lives.mp3",
  [GAME_MODES.CHECKPOINT]: "/sounds/game-modes/checkpoint.mp3",
  [GAME_MODES.RACE]: "/sounds/game-modes/race.mp3",
};

const questionTypeLabels = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Selección múltiple",
  [QUESTION_TYPES.TRUE_FALSE]: "Verdadero o falso",
  [QUESTION_TYPES.FILL_BLANK]: "Completar",
  [QUESTION_TYPES.MATCHING]: "Asociar",
  [QUESTION_TYPES.SHORT_ANSWER]: "Respuesta breve",
};

const clampSeconds = (value, minimum = 0) => Math.max(minimum, Number.parseInt(value, 10) || minimum);

function GameModeSelector({ quiz, onBack, onStart }) {
  const modes = useMemo(() => getGameModeOptionsForQuiz(quiz), [quiz]);
  const firstAvailableMode = modes.find((mode) => mode.available)?.id ?? null;
  const [selectedMode, setSelectedMode] = useState(firstAvailableMode);
  const [checkpointRules, setCheckpointRules] = useState({ ...DEFAULT_GAME_RULES.checkpoint });
  const [raceTimes, setRaceTimes] = useState({ ...DEFAULT_GAME_RULES.race.secondsByQuestionType });
  const modeSoundsRef = useRef({});
  const activeModeSoundRef = useRef(null);
  const selected = modes.find((mode) => mode.id === selectedMode);
  const subject = quizIconOptions.find((option) => option.id === quiz.iconId)?.label ?? "General";
  const presentQuestionTypes = useMemo(() => (
    [...new Set(quiz.questions.map((question) => question.type))]
  ), [quiz.questions]);

  useEffect(() => {
    modeSoundsRef.current = Object.fromEntries(
      Object.entries(modeSoundPaths).map(([mode, path]) => {
        const sound = new Audio(path);
        sound.preload = "auto";
        sound.volume = 0.6;
        return [mode, sound];
      }),
    );

    return () => {
      Object.values(modeSoundsRef.current).forEach((sound) => sound.pause());
      modeSoundsRef.current = {};
      activeModeSoundRef.current = null;
    };
  }, []);

  const selectGameMode = (modeId, card) => {
    setSelectedMode(modeId);
    card?.animate(
      [
        { scale: 1 },
        { scale: 1.055, offset: .48 },
        { scale: .985, offset: .76 },
        { scale: 1 },
      ],
      { duration: 360, easing: "cubic-bezier(.2, .9, .3, 1.3)" },
    );
    card?.querySelector(".game-mode-card__icon")?.animate(
      [
        { scale: 1 },
        { scale: 1.3, offset: .5 },
        { scale: 1 },
      ],
      { duration: 320, delay: 45, easing: "cubic-bezier(.2, .9, .3, 1.35)" },
    );
    activeModeSoundRef.current?.pause();
    const sound = modeSoundsRef.current[modeId];
    if (!sound) return;
    sound.currentTime = 0;
    activeModeSoundRef.current = sound;
    sound.play().catch(() => {});
  };

  const startGame = () => {
    const rules = selectedMode === GAME_MODES.CHECKPOINT
      ? checkpointRules
      : selectedMode === GAME_MODES.RACE
        ? { secondsByQuestionType: raceTimes }
        : {};
    playConfirmSound();
    onStart(quiz, selectedMode, rules);
  };

  return (
    <section className="game-setup" aria-labelledby="game-setup-title">
      <button className="game-setup__back" type="button" onClick={onBack}>
        <span aria-hidden="true">←</span> Volver a la biblioteca
      </button>

      <div className="game-setup__intro">
        <div className="game-setup__quiz-mark">
          <QuizIcon iconId={quiz.iconId} size={34} />
        </div>
        <div className="game-setup__quiz-copy">
          <span className="eyebrow">Preparar partida</span>
          <h2 id="game-setup-title">{quiz.title}</h2>
          <p>{quiz.description || "Elige cómo quieres practicar este quiz."}</p>
          <div className="game-setup__meta">
            <span>{quiz.questions.length} {quiz.questions.length === 1 ? "pregunta" : "preguntas"}</span>
            <span>{subject}</span>
          </div>
        </div>
        <div className="game-setup__launch">
          <div>
            <span>Modo seleccionado</span>
            <strong>{selected?.label ?? "Sin modo disponible"}</strong>
            <p>{selected?.description}</p>
          </div>
          <button type="button" disabled={!selectedMode} onClick={startGame}>
            Comenzar <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="game-setup__heading">
        <div>
          <span className="eyebrow">Modo de juego</span>
          <h3>¿Cómo quieres jugar?</h3>
        </div>
      </div>

      <div className="game-mode-grid">
        {modes.map((mode, index) => (
          <button
            className={`game-mode-card ${selectedMode === mode.id ? "is-selected" : ""}`}
            type="button"
            key={mode.id}
            disabled={!mode.available}
            aria-pressed={selectedMode === mode.id}
            onClick={(event) => selectGameMode(mode.id, event.currentTarget)}
          >
            <span className="game-mode-card__number">0{index + 1}</span>
            <span className="game-mode-card__icon"><ModeIcon mode={mode.id} /></span>
            <strong>{mode.label}</strong>
            <p>{modeDetails[mode.id]}</p>
            {!mode.available && <small>{mode.reason}</small>}
          </button>
        ))}
      </div>

      {selectedMode === GAME_MODES.CHECKPOINT && (
        <div className="game-mode-config" aria-label="Configurar tiempos de Punto de control">
          <div className="game-mode-config__heading">
            <span className="eyebrow">Reglas de tiempo</span>
            <strong>Configura Punto de control</strong>
          </div>
          <label>
            <span>Tiempo inicial</span>
            <div><input type="number" min="10" step="5" value={checkpointRules.initialSeconds} onChange={(event) => setCheckpointRules((rules) => ({ ...rules, initialSeconds: clampSeconds(event.target.value, 10) }))} /><small>seg</small></div>
          </label>
          <label>
            <span>Extra por acierto</span>
            <div><input type="number" min="0" step="1" value={checkpointRules.correctBonusSeconds} onChange={(event) => setCheckpointRules((rules) => ({ ...rules, correctBonusSeconds: clampSeconds(event.target.value) }))} /><small>seg</small></div>
          </label>
          <label>
            <span>Quitar por error</span>
            <div><input type="number" min="0" step="1" value={checkpointRules.incorrectPenaltySeconds} onChange={(event) => setCheckpointRules((rules) => ({ ...rules, incorrectPenaltySeconds: clampSeconds(event.target.value) }))} /><small>seg</small></div>
          </label>
        </div>
      )}

      {selectedMode === GAME_MODES.RACE && (
        <div className="game-mode-config game-mode-config--race" aria-label="Configurar tiempos de Carrera">
          <div className="game-mode-config__heading">
            <span className="eyebrow">Tiempo por formato</span>
            <strong>Configura Carrera</strong>
          </div>
          {presentQuestionTypes.map((questionType) => (
            <label key={questionType}>
              <span>{questionTypeLabels[questionType]}</span>
              <div><input type="number" min="5" step="5" value={raceTimes[questionType]} onChange={(event) => setRaceTimes((times) => ({ ...times, [questionType]: clampSeconds(event.target.value, 5) }))} /><small>seg</small></div>
            </label>
          ))}
        </div>
      )}

    </section>
  );
}

export default GameModeSelector;
