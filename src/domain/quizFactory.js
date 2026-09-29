import { QUESTION_TYPES, QUIZ_ICONS, QUIZ_SCHEMA_VERSION } from "./quizConstants.js";

export const createId = (prefix = "item") => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createBaseQuestion = (type) => ({
  id: createId("question"),
  type,
  prompt: "",
  explanation: "",
});

export const createQuestion = (type = QUESTION_TYPES.MULTIPLE_CHOICE) => {
  const baseQuestion = createBaseQuestion(type);

  switch (type) {
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      return {
        ...baseQuestion,
        options: Array.from({ length: 4 }, (_, index) => ({
          id: createId("option"),
          text: "",
          isCorrect: index === 0,
        })),
      };

    case QUESTION_TYPES.TRUE_FALSE:
      return {
        ...baseQuestion,
        correctAnswer: true,
      };

    case QUESTION_TYPES.MATCHING:
      return {
        ...baseQuestion,
        pairs: Array.from({ length: 2 }, () => ({
          id: createId("pair"),
          left: "",
          right: "",
        })),
      };

    case QUESTION_TYPES.FILL_BLANK:
      return {
        ...baseQuestion,
        acceptedAnswers: [""],
        caseSensitive: false,
      };

    case QUESTION_TYPES.SHORT_ANSWER:
      return {
        ...baseQuestion,
        referenceAnswer: "",
        keywords: [],
        similarityThreshold: 0.7,
        allowSelfAssessment: true,
      };

    default:
      throw new Error(`Tipo de pregunta no compatible: ${type}`);
  }
};

export const cloneQuestion = (question) => {
  const clone = { ...question, id: createId("question") };

  if (Array.isArray(question.options)) {
    clone.options = question.options.map((option) => ({ ...option, id: createId("option") }));
  }

  if (Array.isArray(question.pairs)) {
    clone.pairs = question.pairs.map((pair) => ({ ...pair, id: createId("pair") }));
  }

  if (Array.isArray(question.acceptedAnswers)) {
    clone.acceptedAnswers = [...question.acceptedAnswers];
  }

  if (Array.isArray(question.keywords)) {
    clone.keywords = [...question.keywords];
  }

  return clone;
};

export const createQuiz = ({
  title,
  description = "",
  iconId = QUIZ_ICONS.GENERAL,
} = {}) => {
  const timestamp = new Date().toISOString();

  return {
    schemaVersion: QUIZ_SCHEMA_VERSION,
    id: createId("quiz"),
    title: title?.trim() || "Quiz sin título",
    description: description.trim(),
    iconId,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    preferences: {
      themeId: null,
      playlistId: null,
    },
    settings: {
      shuffleQuestions: true,
      shuffleAnswers: true,
    },
    stats: {
      attempts: 0,
      bestScore: null,
      lastPlayedAt: null,
    },
    questions: [],
  };
};

export const duplicateQuiz = (sourceQuiz) => {
  const duplicate = createQuiz({
    title: `${sourceQuiz.title} (copia)`,
    description: sourceQuiz.description,
    iconId: sourceQuiz.iconId,
  });

  return {
    ...duplicate,
    preferences: { ...sourceQuiz.preferences },
    settings: { ...sourceQuiz.settings },
    questions: sourceQuiz.questions.map(cloneQuestion),
  };
};
