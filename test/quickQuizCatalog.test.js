import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { QUESTION_TYPES, QUIZ_ICONS } from "../src/domain/quizConstants.js";
import { quickQuizCatalog } from "../src/data/quick-quizzes/catalog.generated.js";
import { quickQuizProgress } from "../src/services/quickQuizProgress.js";

const catalogDirectory = fileURLToPath(new URL("../src/data/quick-quizzes/", import.meta.url));
const catalogFiles = readdirSync(catalogDirectory).filter((filename) => filename.endsWith(".json"));

test("quick quiz catalog includes five playable definitions for every subject", () => {
  const collections = catalogFiles.map((filename) => JSON.parse(readFileSync(`${catalogDirectory}/${filename}`, "utf8")));
  const categories = collections.map((collection) => collection.category).sort();
  const expectedCategories = Object.values(QUIZ_ICONS).sort();
  const quizIds = new Set();
  const expectedQuestionCount = {
    Inicial: 5,
    "Fácil": 6,
    Intermedio: 7,
    Avanzado: 8,
    Experto: 9,
  };

  assert.equal(collections.length, expectedCategories.length);
  assert.deepEqual(categories, expectedCategories);

  collections.forEach((collection) => {
    const questionIds = new Set(collection.questions.map((question) => question.id));
    const questionsById = new Map(collection.questions.map((question) => [question.id, question]));
    const usedQuestionIds = new Set();
    const usedPrompts = new Set();
    assert.equal(collection.quizzes.length, 5, `${collection.category} debe tener cinco quizzes`);
    assert.equal(questionIds.size, collection.questions.length, `${collection.category} tiene preguntas duplicadas`);

    collection.questions.forEach((question) => {
      if (question.type === QUESTION_TYPES.TRUE_FALSE) {
        assert.equal(typeof question.correct, "boolean", `${collection.category}/${question.id} debe tener respuesta booleana`);
      } else {
        assert.equal(question.options.length, 4, `${collection.category}/${question.id} debe tener cuatro opciones`);
        assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.options.length);
      }
    });

    collection.quizzes.forEach((quiz) => {
      const fullId = `${collection.category}/${quiz.id}`;
      assert.equal(quizIds.has(fullId), false, `ID de quiz duplicado: ${fullId}`);
      quizIds.add(fullId);
      assert.equal(quiz.questionIds.length, expectedQuestionCount[quiz.difficulty], `${fullId} no coincide con su dificultad`);
      assert.ok(quiz.questionIds.length >= 5 && quiz.questionIds.length <= 10, `${fullId} debe tener entre 5 y 10 preguntas`);
      quiz.questionIds.forEach((questionId) => {
        assert.equal(questionIds.has(questionId), true, `${fullId} referencia ${questionId}`);
        assert.equal(usedQuestionIds.has(questionId), false, `${collection.category}/${questionId} se repite entre niveles`);
        usedQuestionIds.add(questionId);

        const prompt = questionsById.get(questionId).prompt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        assert.equal(usedPrompts.has(prompt), false, `${collection.category}/${questionId} repite el texto de otra pregunta`);
        usedPrompts.add(prompt);
      });
    });

    assert.equal(usedQuestionIds.size, collection.questions.length, `${collection.category} debe usar cada pregunta exactamente una vez`);

    if (collection.category !== QUIZ_ICONS.GENERAL) {
      const advanced = collection.quizzes.find((quiz) => quiz.difficulty === "Avanzado");
      const expert = collection.quizzes.find((quiz) => quiz.difficulty === "Experto");
      const trueFalseCount = (quiz) => quiz.questionIds.filter((id) => questionsById.get(id).type === QUESTION_TYPES.TRUE_FALSE).length;
      assert.ok(trueFalseCount(advanced) >= 1, `${collection.category}/Avanzado necesita verdadero o falso`);
      assert.ok(trueFalseCount(expert) >= 2, `${collection.category}/Experto necesita dos verdadero o falso`);
    }
  });

  assert.equal(quizIds.size, 80);
});

test("quick quiz progress keeps attempts and the highest score separately", () => {
  const storedValues = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    localStorage: {
      getItem: (key) => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
    },
  };

  try {
    quickQuizProgress.recordAttempt("quick-general-test", 80);
    const progress = quickQuizProgress.recordAttempt("quick-general-test", 60);

    assert.equal(progress["quick-general-test"].attempts, 2);
    assert.equal(progress["quick-general-test"].bestScore, 80);
    assert.equal(typeof progress["quick-general-test"].lastPlayedAt, "string");
  } finally {
    globalThis.window = previousWindow;
  }
});

test("the lightweight quick quiz catalog stays synchronized with question files", () => {
  assert.equal(quickQuizCatalog.length, 80);
  const ids = new Set(quickQuizCatalog.map((quiz) => quiz.id));
  assert.equal(ids.size, quickQuizCatalog.length);
  quickQuizCatalog.forEach((quiz) => {
    const countedQuestions = Object.values(quiz.questionTypeCounts)
      .reduce((total, count) => total + count, 0);
    assert.equal(countedQuestions, quiz.questionCount, quiz.id);
    assert.ok(quiz.questionCount >= 5 && quiz.questionCount <= 10, quiz.id);
  });
});
