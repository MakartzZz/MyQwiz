export const QUIZ_SCHEMA_VERSION = 2;

export const QUESTION_TYPES = Object.freeze({
  MULTIPLE_CHOICE: "multiple-choice",
  MATCHING: "matching",
  FILL_BLANK: "fill-blank",
  SHORT_ANSWER: "short-answer",
});

export const QUIZ_ICONS = Object.freeze({
  GENERAL: "general",
  MATHEMATICS: "mathematics",
  SCIENCE: "science",
  CHEMISTRY: "chemistry",
  HISTORY: "history",
  LANGUAGES: "languages",
  TECHNOLOGY: "technology",
  MEDICINE: "medicine",
  ANATOMY: "anatomy",
  GEOGRAPHY: "geography",
});

export const GAME_MODES = Object.freeze({
  CLASSIC: "classic",
  LIVES: "lives",
  CHECKPOINT: "checkpoint",
  RACE: "race",
});

export const gameModeOptions = Object.freeze([
  {
    id: GAME_MODES.CLASSIC,
    label: "Clásico",
    description: "Completa el quiz sin límite de vidas o tiempo.",
  },
  {
    id: GAME_MODES.LIVES,
    label: "Vidas",
    description: "Tienes tres vidas; el tercer error termina el intento.",
  },
  {
    id: GAME_MODES.CHECKPOINT,
    label: "Punto de control",
    description: "Los aciertos suman tiempo y los errores lo descuentan.",
  },
  {
    id: GAME_MODES.RACE,
    label: "Carrera",
    description: "Cada pregunta tiene un límite de tiempo según su tipo.",
  },
]);

export const DEFAULT_GAME_RULES = Object.freeze({
  lives: Object.freeze({ initialLives: 3 }),
  checkpoint: Object.freeze({
    initialSeconds: 60,
    correctBonusSeconds: 10,
    incorrectPenaltySeconds: 8,
  }),
  race: Object.freeze({
    secondsByQuestionType: Object.freeze({
      [QUESTION_TYPES.MULTIPLE_CHOICE]: 15,
      [QUESTION_TYPES.FILL_BLANK]: 15,
      [QUESTION_TYPES.MATCHING]: 60,
      [QUESTION_TYPES.SHORT_ANSWER]: 180,
    }),
  }),
});
