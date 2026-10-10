import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES, QUIZ_ICONS, QUIZ_SCHEMA_VERSION } from "../src/domain/quizConstants.js";
import { canUseGameMode, getRaceTimeForQuestion } from "../src/domain/gameModes.js";
import { createQuestion, createQuiz, duplicateQuiz, prepareQuizForReady } from "../src/domain/quizFactory.js";
import { calculateScore, calculateShortAnswerSimilarity, evaluateQuestionAnswer, prepareQuizForPlay, shouldAutomaticallyAdvanceQuestion, shuffleItems } from "../src/domain/quizGameplay.js";
import { migrateQuiz } from "../src/domain/quizMigration.js";
import { validateQuiz } from "../src/domain/quizValidation.js";
import { buildQuizPrompt } from "../src/services/quizPrompt.js";
import { areQuizzesEquivalent, parseQuizImport, serializeQuiz } from "../src/services/quizTransfer.js";
import { DEFAULT_USER_PREFERENCES, normalizeUserPreferences } from "../src/services/userPreferences.js";

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
  const trueFalse = createQuestion(QUESTION_TYPES.TRUE_FALSE);
  const matching = createQuestion(QUESTION_TYPES.MATCHING);
  const fillBlank = createQuestion(QUESTION_TYPES.FILL_BLANK);
  const shortAnswer = createQuestion(QUESTION_TYPES.SHORT_ANSWER);

  assert.equal(multipleChoice.options.length, 4);
  assert.equal(multipleChoice.options.filter((option) => option.isCorrect).length, 1);
  assert.equal(trueFalse.correctAnswer, true);
  assert.equal(matching.pairs.length, 2);
  assert.deepEqual(fillBlank.acceptedAnswers, [""]);
  assert.equal(fillBlank.imageUrl, "");
  assert.equal(shortAnswer.similarityThreshold, 0.7);
  assert.equal("allowSelfAssessment" in shortAnswer, false);
});

test("the expanded subject catalog is accepted by quiz validation", () => {
  const addedSubjects = [
    QUIZ_ICONS.VIDEOGAMES,
    QUIZ_ICONS.MUSIC,
    QUIZ_ICONS.ART,
    QUIZ_ICONS.BIOLOGY,
    QUIZ_ICONS.PHYSICS,
    QUIZ_ICONS.CINEMA,
  ];

  addedSubjects.forEach((iconId) => {
    assert.equal(validateQuiz(createQuiz({ title: "Nueva categoría", iconId })).valid, true);
  });
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

test("fill blank questions accept optional public image URLs and reject unsafe protocols", () => {
  const quiz = createQuiz({ title: "Anatomía visual" });
  const question = createQuestion(QUESTION_TYPES.FILL_BLANK);
  question.prompt = "El órgano señalado es _____.";
  question.acceptedAnswers = ["corazón"];
  question.imageUrl = "https://example.com/anatomia/corazon.jpg";
  quiz.questions.push(question);

  assert.equal(validateQuiz(quiz, { requirePlayable: true }).valid, true);

  question.imageUrl = "javascript:alert('no')";
  const invalidResult = validateQuiz(quiz, { requirePlayable: true });
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.errors.some((error) => error.code === "invalid_image_url"), true);
});

test("checkpoint mode accepts quick-answer question types", () => {
  const compatibleQuiz = createQuiz({ title: "Compatible" });
  compatibleQuiz.questions.push(
    createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE),
    createQuestion(QUESTION_TYPES.TRUE_FALSE),
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
    getRaceTimeForQuestion(createQuestion(QUESTION_TYPES.TRUE_FALSE)),
    10,
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

test("publishing an edited scored quiz clears its previous results", () => {
  const quiz = createQuiz({ title: "Historia editada" });
  quiz.status = "draft";
  quiz.stats = {
    attempts: 4,
    bestScore: 90,
    lastPlayedAt: "2026-09-30T12:00:00.000Z",
  };

  const readyQuiz = prepareQuizForReady(quiz);

  assert.equal(readyQuiz.status, "ready");
  assert.deepEqual(readyQuiz.stats, {
    attempts: 0,
    bestScore: null,
    lastPlayedAt: null,
  });
  assert.equal(quiz.stats.bestScore, 90);
});

test("publishing an unplayed draft keeps its empty results", () => {
  const quiz = createQuiz({ title: "Quiz nuevo" });
  const readyQuiz = prepareQuizForReady(quiz);

  assert.equal(readyQuiz.status, "ready");
  assert.deepEqual(readyQuiz.stats, quiz.stats);
});

test("exporting and importing preserves every question type and the quiz icon", () => {
  const quiz = createQuiz({ title: "Repaso completo", iconId: QUIZ_ICONS.MEDICINE });
  quiz.questions.push(
    createQuestion(QUESTION_TYPES.MULTIPLE_CHOICE),
    createQuestion(QUESTION_TYPES.TRUE_FALSE),
    createQuestion(QUESTION_TYPES.FILL_BLANK),
    createQuestion(QUESTION_TYPES.MATCHING),
    createQuestion(QUESTION_TYPES.SHORT_ANSWER),
  );
  quiz.questions[2].imageUrl = "https://example.com/imagen-medica.jpg";

  const imported = parseQuizImport(serializeQuiz(quiz));

  assert.equal(imported.iconId, QUIZ_ICONS.MEDICINE);
  assert.equal(imported.questions[1].correctAnswer, true);
  assert.equal(imported.questions[2].imageUrl, "https://example.com/imagen-medica.jpg");
  assert.deepEqual(imported.questions.map((question) => question.type), [
    QUESTION_TYPES.MULTIPLE_CHOICE,
    QUESTION_TYPES.TRUE_FALSE,
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

test("import accepts JSON copied from a Markdown code block", () => {
  const quiz = createQuiz({ title: "Copiado desde IA", iconId: QUIZ_ICONS.TECHNOLOGY });
  const copiedContent = `\`\`\`json\n${serializeQuiz(quiz)}\n\`\`\``;

  const imported = parseQuizImport(copiedContent);

  assert.equal(imported.title, "Copiado desde IA");
  assert.equal(imported.iconId, QUIZ_ICONS.TECHNOLOGY);
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

test("semantic duplicate detection compares true-or-false answers", () => {
  const original = createQuiz({ title: "Afirmaciones" });
  const question = createQuestion(QUESTION_TYPES.TRUE_FALSE);
  question.prompt = "El agua hierve a 100 °C al nivel del mar.";
  original.questions.push(question);

  const copy = duplicateQuiz(original);
  assert.equal(areQuizzesEquivalent(original, copy), true);

  copy.questions[0].correctAnswer = false;
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

test("true or false keeps boolean answers through validation and gameplay", () => {
  const quiz = createQuiz({ title: "Verdadero o falso" });
  const question = createQuestion(QUESTION_TYPES.TRUE_FALSE);
  question.prompt = "La Tierra gira alrededor del Sol.";
  question.correctAnswer = false;
  quiz.questions.push(question);

  assert.equal(validateQuiz(quiz, { requirePlayable: true }).valid, true);
  assert.equal(evaluateQuestionAnswer(question, false), true);
  assert.equal(evaluateQuestionAnswer(question, true), false);

  question.correctAnswer = "false";
  assert.equal(validateQuiz(quiz, { requirePlayable: true }).valid, false);
});

test("score calculation rounds to a whole percentage", () => {
  assert.equal(calculateScore(2, 3), 67);
  assert.equal(calculateScore(0, 0), 0);
  assert.deepEqual(shuffleItems([1], () => 0), [1]);
});

test("automatic question advance is enabled for new and existing preference sets", () => {
  assert.equal(DEFAULT_USER_PREFERENCES.automaticQuestionAdvance, true);
  assert.equal(normalizeUserPreferences({}).automaticQuestionAdvance, true);
  assert.equal(normalizeUserPreferences({ largeText: true }).automaticQuestionAdvance, true);
  assert.equal(normalizeUserPreferences({ automaticQuestionAdvance: false }).automaticQuestionAdvance, false);
});

test("automatic question advance only runs after a correct checked answer when enabled", () => {
  const readyState = {
    enabled: true,
    isChecked: true,
    isCorrect: true,
    isFinished: false,
    isReviewingMatching: false,
    isTerminalGameOver: false,
    questionTransition: "idle",
  };

  assert.equal(shouldAutomaticallyAdvanceQuestion(readyState), true);
  assert.equal(shouldAutomaticallyAdvanceQuestion({ ...readyState, enabled: false }), false);
  assert.equal(shouldAutomaticallyAdvanceQuestion({ ...readyState, isCorrect: false }), false);
  assert.equal(shouldAutomaticallyAdvanceQuestion({ ...readyState, questionTransition: "out" }), false);
});

test("short-answer similarity ignores accents and reports exact matches", () => {
  assert.equal(
    calculateShortAnswerSimilarity("La fotosintesis convierte luz en energia", "La fotosíntesis convierte luz en energía"),
    100,
  );
  assert.equal(calculateShortAnswerSimilarity("", "Una respuesta de referencia"), 0);
});

test("short-answer similarity rewards matching key concepts without grading automatically", () => {
  const similarity = calculateShortAnswerSimilarity(
    "Las plantas usan luz para producir energía mediante fotosíntesis.",
    "La fotosíntesis permite que las plantas transformen la energía de la luz en energía química.",
    ["fotosíntesis", "plantas", "luz", "energía"],
  );

  assert.ok(similarity >= 70);
  assert.equal(evaluateQuestionAnswer({ type: QUESTION_TYPES.SHORT_ANSWER }, true), true);
  assert.equal(evaluateQuestionAnswer({ type: QUESTION_TYPES.SHORT_ANSWER }, false), false);
});

test("prompt generator includes the requested distribution and MyQwiz schema", () => {
  const prompt = buildQuizPrompt({
    title: "Sistema solar",
    topic: "Nivel de primaria, planetas y órbitas.",
    iconId: QUIZ_ICONS.SCIENCE,
    delivery: "text",
    educationLevel: "university",
    sourceMode: "ai",
    questionCounts: {
      [QUESTION_TYPES.MULTIPLE_CHOICE]: 4,
      [QUESTION_TYPES.TRUE_FALSE]: 2,
      [QUESTION_TYPES.FILL_BLANK]: 2,
      [QUESTION_TYPES.MATCHING]: 0,
      [QUESTION_TYPES.SHORT_ANSWER]: 1,
    },
  });

  assert.match(prompt, /Total exacto: 9 preguntas/);
  assert.match(prompt, /4 de Selección múltiple/);
  assert.match(prompt, /2 de Verdadero o falso/);
  assert.match(prompt, /"correctAnswer": true/);
  assert.match(prompt, /"fileType": "myqwiz-quiz"/);
  assert.match(prompt, /"iconId": "science"/);
  assert.match(prompt, /Universidad/);
  assert.match(prompt, /planetas y órbitas/);
  assert.match(prompt, /volumen de información similares/);
  assert.match(prompt, /respuesta correcta no debe destacar/);
  assert.match(prompt, /"zero-day"/);
  assert.match(prompt, /inequívocamente incorrectas/);
  assert.doesNotMatch(prompt, /Estructura para Asociar/);
});

test("document-based prompt tells the AI to use only attached sources", () => {
  const prompt = buildQuizPrompt({
    title: "Mis apuntes",
    iconId: QUIZ_ICONS.GENERAL,
    delivery: "file",
    educationLevel: "postgraduate",
    sourceMode: "documents",
    questionCounts: { [QUESTION_TYPES.MULTIPLE_CHOICE]: 3 },
  });

  assert.match(prompt, /Voy a adjuntar uno o varios documentos/);
  assert.match(prompt, /fuente principal/);
  assert.match(prompt, /Posgrado/);
  assert.match(prompt, /mis-apuntes\.myqwiz\.json/);
});
