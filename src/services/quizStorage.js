import { validateQuiz } from "../domain/quizValidation.js";
import { migrateQuiz } from "../domain/quizMigration.js";

const STORAGE_KEY = "myqwiz:quizzes:v2";
const LEGACY_STORAGE_KEY = "myqwiz:quizzes:v1";

const readQuizCollection = () => {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const migratedQuizzes = parsedValue
      .map(migrateQuiz)
      .filter((quiz) => quiz && validateQuiz(quiz).valid);

    if (!window.localStorage.getItem(STORAGE_KEY) && migratedQuizzes.length) {
      writeQuizCollection(migratedQuizzes);
    }

    return migratedQuizzes;
  } catch {
    return [];
  }
};

const writeQuizCollection = (quizzes) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
};

export const quizStorage = {
  getAll() {
    return readQuizCollection().sort((first, second) => (
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
    ));
  },

  getById(quizId) {
    return readQuizCollection().find((quiz) => quiz.id === quizId) ?? null;
  },

  save(quiz) {
    const validation = validateQuiz(quiz);

    if (!validation.valid) {
      throw new Error(validation.errors[0].message);
    }

    const quizzes = readQuizCollection();
    const storedIndex = quizzes.findIndex((item) => item.id === quiz.id);
    const nextQuiz = { ...quiz, updatedAt: new Date().toISOString() };

    if (storedIndex >= 0) {
      quizzes[storedIndex] = nextQuiz;
    } else {
      quizzes.unshift(nextQuiz);
    }

    writeQuizCollection(quizzes);
    return nextQuiz;
  },

  remove(quizId) {
    const quizzes = readQuizCollection();
    const nextQuizzes = quizzes.filter((quiz) => quiz.id !== quizId);
    writeQuizCollection(nextQuizzes);
    return nextQuizzes.length !== quizzes.length;
  },

  recordAttempt(quizId, score) {
    const quizzes = readQuizCollection();
    const storedIndex = quizzes.findIndex((quiz) => quiz.id === quizId);
    if (storedIndex < 0) return null;

    const quiz = quizzes[storedIndex];
    const previousBest = Number.isFinite(quiz.stats?.bestScore) ? quiz.stats.bestScore : null;
    const nextQuiz = {
      ...quiz,
      stats: {
        ...quiz.stats,
        attempts: (quiz.stats?.attempts ?? 0) + 1,
        bestScore: previousBest === null ? score : Math.max(previousBest, score),
        lastPlayedAt: new Date().toISOString(),
      },
    };
    quizzes[storedIndex] = nextQuiz;
    writeQuizCollection(quizzes);
    return nextQuiz;
  },
};
