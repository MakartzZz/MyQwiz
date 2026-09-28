import {
  DEFAULT_GAME_RULES,
  GAME_MODES,
  gameModeOptions,
  QUESTION_TYPES,
} from "./quizConstants.js";

const checkpointQuestionTypes = new Set([
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.FILL_BLANK,
]);

export const getRaceTimeForQuestion = (question, customTimes = {}) => {
  const secondsByQuestionType = {
    ...DEFAULT_GAME_RULES.race.secondsByQuestionType,
    ...customTimes,
  };

  return secondsByQuestionType[question?.type] ?? null;
};

export const canUseGameMode = (quiz, gameMode) => {
  if (!Array.isArray(quiz?.questions) || quiz.questions.length === 0) {
    return {
      available: false,
      reason: "El quiz necesita al menos una pregunta.",
    };
  }

  if (gameMode === GAME_MODES.CHECKPOINT) {
    const hasUnsupportedQuestion = quiz.questions.some(
      (question) => !checkpointQuestionTypes.has(question.type),
    );

    if (hasUnsupportedQuestion) {
      return {
        available: false,
        reason: "Este modo solo admite preguntas de selección múltiple y completar.",
      };
    }
  }

  if (gameMode === GAME_MODES.RACE) {
    const hasQuestionWithoutTime = quiz.questions.some(
      (question) => getRaceTimeForQuestion(question) === null,
    );

    if (hasQuestionWithoutTime) {
      return {
        available: false,
        reason: "Hay preguntas sin una duración configurada para Carrera.",
      };
    }
  }

  return { available: true, reason: null };
};

export const getGameModeOptionsForQuiz = (quiz) => gameModeOptions.map((mode) => ({
  ...mode,
  ...canUseGameMode(quiz, mode.id),
}));
