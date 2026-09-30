import anatomy from "./anatomy.json";
import art from "./art.json";
import biology from "./biology.json";
import chemistry from "./chemistry.json";
import cinema from "./cinema.json";
import general from "./general.json";
import geography from "./geography.json";
import history from "./history.json";
import languages from "./languages.json";
import mathematics from "./mathematics.json";
import medicine from "./medicine.json";
import music from "./music.json";
import physics from "./physics.json";
import science from "./science.json";
import technology from "./technology.json";
import videogames from "./videogames.json";
import { QUESTION_TYPES, QUIZ_SCHEMA_VERSION } from "../../domain/quizConstants.js";

const collections = [
  general,
  mathematics,
  science,
  chemistry,
  history,
  languages,
  technology,
  medicine,
  anatomy,
  biology,
  physics,
  geography,
  videogames,
  music,
  art,
  cinema,
];

const normalizeCollection = (collection) => {
  const questionBank = new Map(collection.questions.map((question) => [question.id, question]));

  return collection.quizzes.map((quiz) => ({
    schemaVersion: QUIZ_SCHEMA_VERSION,
    id: `quick-${collection.category}-${quiz.id}`,
    title: quiz.title,
    description: quiz.description,
    difficulty: quiz.difficulty,
    iconId: collection.category,
    status: "ready",
    source: "quick",
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    preferences: { themeId: null, playlistId: null },
    settings: { shuffleQuestions: true, shuffleAnswers: true },
    stats: { attempts: 0, bestScore: null, lastPlayedAt: null },
    questions: quiz.questionIds.map((questionId) => {
      const question = questionBank.get(questionId);
      if (!question) throw new Error(`Pregunta rápida inexistente: ${collection.category}/${questionId}`);

      if (question.type === QUESTION_TYPES.TRUE_FALSE) {
        return {
          id: `quick-${collection.category}-${quiz.id}-${question.id}`,
          type: QUESTION_TYPES.TRUE_FALSE,
          prompt: question.prompt,
          explanation: question.explanation ?? "",
          correctAnswer: Boolean(question.correct),
        };
      }

      return {
        id: `quick-${collection.category}-${quiz.id}-${question.id}`,
        type: QUESTION_TYPES.MULTIPLE_CHOICE,
        prompt: question.prompt,
        explanation: question.explanation ?? "",
        options: question.options.map((text, optionIndex) => ({
          id: `quick-${collection.category}-${quiz.id}-${question.id}-option-${optionIndex}`,
          text,
          isCorrect: optionIndex === question.correct,
        })),
      };
    }),
  }));
};

export const quickQuizzes = collections.flatMap(normalizeCollection);

