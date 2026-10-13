export const ENTRY_CHALLENGE_VERSION = 1;

export const ENTRY_CHALLENGE_QUESTIONS = Object.freeze([
  {
    id: "travel",
    prompt: "Si mañana pudieras viajar a cualquier lugar, ¿cuál escogerías?",
    distractorBank: ["París", "Tokio", "Nueva York", "Roma", "Londres", "Barcelona", "Cancún", "Islandia"],
  },
  {
    id: "food",
    prompt: "Si hoy pudieras comer cualquier cosa, ¿qué elegirías?",
    distractorBank: ["Pizza", "Sushi", "Tacos", "Pasta", "Hamburguesa", "Paella", "Helado", "Ceviche"],
  },
  {
    id: "free_time",
    prompt: "Si tuvieras todo el día libre, ¿qué harías primero?",
    distractorBank: ["Dormir", "Ver una película", "Salir a caminar", "Jugar videojuegos", "Leer", "Escuchar música", "Cocinar", "Hacer ejercicio"],
  },
]);

const GENERIC_ANSWERS = new Set([
  "ningun",
  "ninguna",
  "ninguno",
  "no se",
  "nada",
  "lo que sea",
  "cualquier cosa",
]);

export const normalizeEntryChallengeAnswer = (answer) => (answer ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es")
  .replace(/\s+/g, " ");

const findQuestion = (questionId) => (
  ENTRY_CHALLENGE_QUESTIONS.find(({ id }) => id === questionId)
);

const answerHash = (value) => Array.from(value).reduce(
  (hash, character) => ((hash * 31) + character.codePointAt(0)) >>> 0,
  0,
);

export const createEntryChallenge = (questionId, answer) => {
  const question = findQuestion(questionId);
  if (!question) throw new Error("Selecciona una pregunta de entrada válida.");

  const trimmedAnswer = answer?.trim() ?? "";
  const normalizedAnswer = normalizeEntryChallengeAnswer(trimmedAnswer);
  if (trimmedAnswer.length < 2 || trimmedAnswer.length > 60) {
    throw new Error("La respuesta debe tener entre 2 y 60 caracteres.");
  }
  if (GENERIC_ANSWERS.has(normalizedAnswer)) {
    throw new Error("Escribe una respuesta más personal para poder recordarla.");
  }

  const availableDistractors = question.distractorBank.filter(
    (distractor) => normalizeEntryChallengeAnswer(distractor) !== normalizedAnswer,
  );
  const startIndex = answerHash(normalizedAnswer) % availableDistractors.length;
  const distractors = Array.from(
    { length: 3 },
    (_, index) => availableDistractors[(startIndex + index) % availableDistractors.length],
  );

  return {
    version: ENTRY_CHALLENGE_VERSION,
    questionId,
    answer: trimmedAnswer,
    normalizedAnswer,
    distractors,
  };
};

export const getEntryChallengeQuestion = (questionId) => findQuestion(questionId) ?? null;

export const isEntryChallengeAnswerCorrect = (challenge, selectedAnswer) => (
  normalizeEntryChallengeAnswer(selectedAnswer) === challenge?.normalizedAnswer
);
