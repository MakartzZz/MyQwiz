import { QUIZ_ICONS, QUIZ_SCHEMA_VERSION } from "./quizConstants.js";

const migrateFromVersionOne = (quiz) => {
  const { gameMode: _legacyGameMode, rules: _legacyRules, ...quizSettings } = quiz.settings ?? {};
  const { status: _legacyStatus, ...quizWithoutStatus } = quiz;

  return {
    ...quizWithoutStatus,
    schemaVersion: QUIZ_SCHEMA_VERSION,
    iconId: quiz.iconId ?? QUIZ_ICONS.GENERAL,
    settings: {
      shuffleQuestions: quizSettings.shuffleQuestions ?? true,
      shuffleAnswers: quizSettings.shuffleAnswers ?? true,
    },
    stats: quiz.stats ?? {
      attempts: 0,
      bestScore: null,
      lastPlayedAt: null,
    },
  };
};

export const migrateQuiz = (quiz) => {
  if (!quiz || typeof quiz !== "object") {
    return null;
  }

  if (quiz.schemaVersion === QUIZ_SCHEMA_VERSION) {
    const { status: _legacyStatus, ...quizWithoutStatus } = quiz;
    return {
      ...quizWithoutStatus,
      iconId: quiz.iconId ?? QUIZ_ICONS.GENERAL,
    };
  }

  if (quiz.schemaVersion === 1) {
    return migrateFromVersionOne(quiz);
  }

  return null;
};
