import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES, QUIZ_ICONS, QUIZ_SCHEMA_VERSION } from "../src/domain/quizConstants.js";
import { canUseGameMode, getRaceTimeForQuestion } from "../src/domain/gameModes.js";
import { createQuestion, createQuiz, duplicateQuiz } from "../src/domain/quizFactory.js";
import { calculateScore, evaluateQuestionAnswer, prepareQuizForPlay, shuffleItems } from "../src/domain/quizGameplay.js";
import { migrateQuiz } from "../src/domain/quizMigration.js";
import { validateQuiz } from "../src/domain/quizValidation.js";
import { areQuizzesEquivalent, parseQuizImport, serializeQuiz } from "../src/services/quizTransfer.js";

test("createQuiz generates a versioned draft without fixing a game mode", () => {
  const quiz = createQuiz({
    title: "  Redes  ",
    description: "Repaso",
  });

  assert.equal(quiz.schemaVersion, QUIZ_SCHEMA_VERSION);
  assert.equal(quiz.title, "Redes");
  assert.equal(quiz.iconId, QUIZ_ICONS.GENERAL);
  assert.equal("gameMode" in quiz.settings, false);
  assert.deepEqual(quiz.stats, {
    attempts: 0,
    bestScore: null,
    lastPlayedAt: null,
  });
  assert.deepEqual(quiz.questions, []);
  assert.equal(validateQuiz(quiz).valid, true);
});

test("every supported question type receives its required initial structure", () => {
  const multipleChoice = createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE);
  const matching = createQuestion(QUESTION_TYPES.MATCHING);
  const fillBlank = createQuestion(QUESTION_TYPES.FILL_BLANK);
  const shortAnswer = createQuestion(QUESTION_TYPES.SHORT_ANSWER);

  assert.equal(multipleChoice.options.length, 4);
  assert.equal(multipleChoice.options.filter((option) => option.isCorrect).length, 1);
  assert.equal(matching.pairs.length, 2);
  assert.deepEqual(fillBlank.acceptedAnswers, [""]);
  assert.equal(shortAnswer.similarityThreshold, 0.7);
  assert.equal(shortAnswer.allowSelfAssessment, true);
});

test("playable validation detects an empty quiz", () => {
  const quiz = createQuiz({ title: "Quiz vacío" });
  const validation = validateQuiz(quiz, { requirePlayable: true });

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.code === "empty_quiz"), true);
});

test("a completed multiple-choice question is playable", () => {
  const quiz = createQuiz({ title: "Quiz funcional" });
  const question = createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE);

  question.prompt = "¿Qué protocolo asigna direcciones IP automáticamente?";
  question.options[0].text = "DHCP";
  question.options[1].text = "DNS";
  question.options[2].text = "HTTP";
  question.options[3].text = "FTP";
  quiz.questions.push(question);

  assert.equal(validateQuiz(quiz, { requirePlayable: true }).valid, true);
});

test("validation reports malformed imported answers without throwing", () => {
  const quiz = createQuiz({ title: "Importado" });
  const question = createQuestion(QUESTION_TYPES.FILL_BLANK);

  question.prompt = "La capital de Costa Rica es _____.";
  question.acceptedAnswers = [null, 42];
  quiz.questions.push(question);

  assert.doesNotThrow(() => validateQuiz(quiz, { requirePlayable: true }));
  assert.equal(validateQuiz(quiz, { requirePlayable: true }).valid, false);
});

test("checkpoint mode only accepts multiple-choice and fill-blank quizzes", () => {
  const compatibleQuiz = createQuiz({ title: "Compatible" });
  compatibleQuiz.questions.push(
    createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE),
    createQuestion(QUESTION_TYPES.FILL_BLANK),
  );

  const incompatibleQuiz = createQuiz({ title: "No compatible" });
  incompatibleQuiz.questions.push(createQuestion(QUESTION_TYPES.SHORT_ANSWER));

  assert.equal(canUseGameMode(compatibleQuiz, GAME_MODES.CHECKPOINT).available, true);
  assert.equal(canUseGameMode(incompatibleQuiz, GAME_MODES.CHECKPOINT).available, false);
});

test("race mode assigns time according to the question type", () => {
  assert.equal(
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE)),
    15,
  );
  assert.equal(
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.FILL_BLANK)),
    15,
  );
  assert.equal(
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.MATCHING)),
    60,
  );
  assert.equal(
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.SHORT_ANSWER)),
    180,
  );
  assert.equal(DEFAULT_GAME_RULES.race.secondsByQuestionType[QUESTION_TYPES.SHORT_ANSWER], 180);
  assert.equal(
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.MATCHING), {
      [QUESTION_TYPES.MATCHING]: 95,
    }),
    95,
  );
});

test("version one drafts migrate without their fixed game mode", () => {
  const legacyQuiz = {
    ...createQuiz({ title: "Borrador anterior" }),
    schemaVersion: 1,
    settings: {
      gameMode: GAME_MODES.LIVES,
      shuffleQuestions: false,
      shuffleAnswers: true,
      rules: { lives: { initialLives: 3 } },
    },
  };

  const migratedQuiz = migrateQuiz(legacyQuiz);

  assert.equal(migratedQuiz.schemaVersion, QUIZ_SCHEMA_VERSION);
  assert.deepEqual(migratedQuiz.settings, {
    shuffleQuestions: false,
    shuffleAnswers: true,
  });
  assert.equal(validateQuiz(migratedQuiz).valid, true);
});

test("duplicating a quiz preserves its content with fresh identifiers", () => {
  const original = createQuiz({ title: "Biología" });
  original.questions.push(createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE));
  original.iconId = QUIZ_ICONS.SCIENCE;

  const duplicate = duplicateQuiz(original);

  assert.notEqual(duplicate.id, original.id);
  assert.equal(duplicate.title, "Biología (copia)");
  assert.equal(duplicate.status, "draft");
  assert.equal(duplicate.iconId, QUIZ_ICONS.SCIENCE);
  assert.notEqual(duplicate.questions[0].id, original.questions[0].id);
  assert.notEqual(duplicate.questions[0].options[0].id, original.questions[0].options[0].id);
  assert.deepEqual(duplicate.stats, { attempts: 0, bestScore: null, lastPlayedAt: null });
});

test("exporting and importing preserves every question type and the quiz icon", () => {
  const quiz = createQuiz({ title: "Repaso completo", iconId: QUIZ_ICONS.MEDICINE });
  quiz.questions.push(
    createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE),
    createQuestion(QUESTION_TYPES.FILL_BLANK),
    createQuestion(QUESTION_TYPES.MATCHING),
    createQuestion(QUESTION_TYPES.SHORT_ANSWER),
  );

  const imported = parseQuizImport(serializeQuiz(quiz));

  assert.equal(imported.iconId, QUIZ_ICONS.MEDICINE);
  assert.deepEqual(imported.questions.map((question) => question.type), [
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.FILL_BLANK,
    QUESTION_TYPES.MATCHING,
    QUESTION_TYPES.SHORT_ANSWER,
  ]);
});

test("import rejects JSON files that are not MyQwiz exports", () => {
  assert.throws(
    () => parseQuizImport(JSON.stringify({ quiz: createQuiz({ title: "Inválido" }) })),
    /no fue creado por MyQwiz/,
  );
});

test("semantic duplicate detection ignores identifiers but detects content changes", () => {
  const original = createQuiz({ title: "Anatomía", iconId: QUIZ_ICONS.ANATOMY });
  const question = createQuestion(QUESTION_TYPES.FILL_BLANK);
  question.prompt = "El hueso más largo es _____.";
  question.acceptedAnswers = ["fémur"];
  original.questions.push(question);

  const copy = duplicateQuiz(original);
  assert.equal(areQuizzesEquivalent(original, copy), true);

  copy.questions[0].acceptedAnswers = ["tibia"];
  assert.equal(areQuizzesEquivalent(original, copy), false);
});

test("game preparation shuffles choices without changing their correctness", () => {
  const quiz = createQuiz({ title: "Opciones mezcladas" });
  const question = createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE);
  question.prompt = "Elige A";
  question.options.forEach((option, index) => {
    option.text = String.fromCharCode(65 + index);
    option.isCorrect = index === 0;
  });
  quiz.questions.push(question);

  const prepared = prepareQuizForPlay(quiz, () => 0);

  assert.notDeepEqual(prepared[0].options.map((option) => option.id), question.options.map((option) => option.id));
  assert.equal(prepared[0].options.filter((option) => option.isCorrect).length, 1);
  assert.equal(evaluateQuestionAnswer(prepared[0], question.options[0].id), true);
});

test("matching prepares both columns independently and evaluates pair ids", () => {
  const quiz = createQuiz({ title: "Parejas" });
  const question = createQuestion(QUESTION_TYPES.MATCHING);
  question.prompt = "Relaciona";
  question.pairs[0].left = "Costa Rica";
  question.pairs[0].right = "San José";
  question.pairs[1].left = "Francia";
  question.pairs[1].right = "París";
  quiz.questions.push(question);

  const prepared = prepareQuizForPlay(quiz, () => 0);
  const correctAnswer = Object.fromEntries(question.pairs.map((pair) => [pair.id, pair.id]));

  assert.equal(prepared[0].leftItems.length, 2);
  assert.equal(prepared[0].rightItems.length, 2);
  assert.equal(evaluateQuestionAnswer(prepared[0], correctAnswer), true);
  assert.equal(evaluateQuestionAnswer(prepared[0], { [question.pairs[0].id]: question.pairs[1].id }), false);
});

test("fill blank evaluation respects the case-sensitive setting", () => {
  const question = createQuestion(QUESTION_TYPES.FILL_BLANK);
  question.acceptedAnswers = ["San José"];
  question.caseSensitive = false;
  assert.equal(evaluateQuestionAnswer(question, "san josé"), true);

  question.caseSensitive = true;
  assert.equal(evaluateQuestionAnswer(question, "san josé"), false);
});

test("score calculation rounds to a whole percentage", () => {
  assert.equal(calculateScore(2, 3), 67);
  assert.equal(calculateScore(0, 0), 0);
  assert.deepEqual(shuffleItems([1], () => 0), [1]);
});
