import { migrateQuiz } from "../domain/quizMigration.js";
import { validateQuiz } from "../domain/quizValidation.js";

export const MYQWIZ_FILE_TYPE = "myqwiz-quiz";
export const MYQWIZ_EXPORT_VERSION = 1;
export const MAX_QUIZ_FILE_SIZE = 5 * 1024 * 1024;

const unwrapMarkdownCodeBlock = (content) => content
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/, "")
  .trim();

export const createQuizExport = (quiz) => ({
  fileType: MYQWIZ_FILE_TYPE,
  exportVersion: MYQWIZ_EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  quiz,
});

export const serializeQuiz = (quiz) => JSON.stringify(createQuizExport(quiz), null, 2);

export const parseQuizImport = (fileContent) => {
  let parsed;

  try {
    parsed = JSON.parse(unwrapMarkdownCodeBlock(fileContent));
  } catch {
    throw new Error("El archivo no contiene un JSON válido.");
  }

  if (parsed?.fileType !== MYQWIZ_FILE_TYPE) {
    throw new Error("El archivo no fue creado por MyQwiz.");
  }

  if (parsed.exportVersion !== MYQWIZ_EXPORT_VERSION) {
    throw new Error("La versión del archivo exportado no es compatible.");
  }

  const quiz = migrateQuiz(parsed.quiz);
  if (!quiz) {
    throw new Error("La versión interna del quiz no es compatible.");
  }

  const validation = validateQuiz(quiz);
  if (!validation.valid) {
    throw new Error(validation.errors[0].message);
  }

  return quiz;
};

export const normalizeQuizTitle = (title) => title
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es");

const comparableQuestion = (question) => {
  const comparable = {
    type: question.type,
    prompt: question.prompt,
    explanation: question.explanation,
  };

  if (question.options) {
    comparable.options = question.options.map(({ text, isCorrect }) => ({ text, isCorrect }));
  }
  if (question.correctAnswer !== undefined) {
    comparable.correctAnswer = question.correctAnswer;
  }
  if (question.pairs) {
    comparable.pairs = question.pairs.map(({ left, right }) => ({ left, right }));
  }
  if (question.acceptedAnswers) {
    comparable.acceptedAnswers = [...question.acceptedAnswers];
    comparable.caseSensitive = question.caseSensitive;
    comparable.imageUrl = question.imageUrl ?? "";
  }
  if (question.referenceAnswer !== undefined) {
    comparable.referenceAnswer = question.referenceAnswer;
    comparable.keywords = [...question.keywords];
    comparable.similarityThreshold = question.similarityThreshold;
  }

  return comparable;
};

export const areQuizzesEquivalent = (firstQuiz, secondQuiz) => JSON.stringify({
  description: firstQuiz.description,
  iconId: firstQuiz.iconId,
  settings: firstQuiz.settings,
  questions: firstQuiz.questions.map(comparableQuestion),
}) === JSON.stringify({
  description: secondQuiz.description,
  iconId: secondQuiz.iconId,
  settings: secondQuiz.settings,
  questions: secondQuiz.questions.map(comparableQuestion),
});

const safeFilename = (title) => title
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9-_ ]/g, "")
  .trim()
  .replace(/\s+/g, "-")
  .toLowerCase() || "quiz";

export const downloadQuizFile = (quiz, filename = quiz.title) => {
  const blob = new Blob([serializeQuiz(quiz)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(filename.replace(/\.myqwiz\.json$/i, ""))}.myqwiz.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
