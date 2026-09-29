import { QUESTION_TYPES, QUIZ_ICONS, QUIZ_SCHEMA_VERSION } from "./quizConstants.js";

const supportedQuestionTypes = new Set(Object.values(QUESTION_TYPES));
const supportedQuizIcons = new Set(Object.values(QUIZ_ICONS));

const addError = (errors, path, message, code) => {
  errors.push({ path, message, code });
};

const validateQuestion = (question, index, errors, requirePlayable) => {
  const path = `questions[${index}]`;

  if (!question || typeof question !== "object") {
    addError(errors, path, "La pregunta debe ser un objeto.", "invalid_question");
    return;
  }

  if (!supportedQuestionTypes.has(question.type)) {
    addError(errors, `${path}.type`, "El tipo de pregunta no es compatible.", "unsupported_question_type");
    return;
  }

  if (requirePlayable && !question.prompt?.trim()) {
    addError(errors, `${path}.prompt`, "La pregunta necesita un enunciado.", "missing_prompt");
  }

  if (!question.id || typeof question.id !== "string") {
    addError(errors, `${path}.id`, "La pregunta necesita un identificador.", "missing_question_id");
  }

  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      addError(errors, `${path}.options`, "Se necesitan al menos dos opciones.", "missing_options");
    } else if (question.options.some((option) => !option || typeof option.id !== "string" || typeof option.text !== "string" || typeof option.isCorrect !== "boolean")) {
      addError(errors, `${path}.options`, "La estructura de las opciones no es válida.", "invalid_options");
    } else if (requirePlayable && question.options.filter((option) => option.isCorrect).length !== 1) {
      addError(errors, `${path}.options`, "Debe existir exactamente una respuesta correcta.", "invalid_correct_options");
    } else if (requirePlayable && question.options.some((option) => !option.text.trim())) {
      addError(errors, `${path}.options`, "Las opciones no pueden estar vacías.", "empty_option");
    }
  }

  if (question.type === QUESTION_TYPES.TRUE_FALSE && typeof question.correctAnswer !== "boolean") {
    addError(errors, `${path}.correctAnswer`, "La respuesta correcta debe ser verdadero o falso.", "invalid_true_false_answer");
  }

  if (question.type === QUESTION_TYPES.MATCHING) {
    if (!Array.isArray(question.pairs) || question.pairs.length < 2) {
      addError(errors, `${path}.pairs`, "Se necesitan al menos dos parejas.", "missing_pairs");
    } else if (question.pairs.some((pair) => !pair || typeof pair.id !== "string" || typeof pair.left !== "string" || typeof pair.right !== "string")) {
      addError(errors, `${path}.pairs`, "La estructura de las parejas no es válida.", "invalid_pairs");
    } else if (requirePlayable && question.pairs.some((pair) => !pair.left.trim() || !pair.right.trim())) {
      addError(errors, `${path}.pairs`, "Ambos lados de cada pareja son obligatorios.", "empty_pair");
    }
  }

  if (question.type === QUESTION_TYPES.FILL_BLANK) {
    if (!Array.isArray(question.acceptedAnswers) || question.acceptedAnswers.some((answer) => typeof answer !== "string")) {
      addError(errors, `${path}.acceptedAnswers`, "La estructura de las respuestas aceptadas no es válida.", "invalid_accepted_answers");
    } else if (requirePlayable && !question.acceptedAnswers.some((answer) => answer.trim())) {
      addError(errors, `${path}.acceptedAnswers`, "Define al menos una respuesta aceptada.", "missing_accepted_answer");
    }
  }

  if (question.type === QUESTION_TYPES.SHORT_ANSWER) {
    if (typeof question.referenceAnswer !== "string" || !Array.isArray(question.keywords)) {
      addError(errors, `${path}.referenceAnswer`, "La estructura de la respuesta breve no es válida.", "invalid_reference_answer");
    } else if (requirePlayable && !question.referenceAnswer.trim()) {
      addError(errors, `${path}.referenceAnswer`, "Define una respuesta de referencia.", "missing_reference_answer");
    }
  }
};

export const validateQuiz = (quiz, { requirePlayable = false } = {}) => {
  const errors = [];

  if (!quiz || typeof quiz !== "object") {
    return {
      valid: false,
      errors: [{ path: "quiz", message: "El quiz no es válido.", code: "invalid_quiz" }],
    };
  }

  if (quiz.schemaVersion !== QUIZ_SCHEMA_VERSION) {
    addError(errors, "schemaVersion", "La versión del quiz no es compatible.", "unsupported_schema");
  }

  if (!quiz.id || typeof quiz.id !== "string") {
    addError(errors, "id", "El quiz necesita un identificador.", "missing_id");
  }

  if (!quiz.title?.trim()) {
    addError(errors, "title", "El quiz necesita un título.", "missing_title");
  }

  if (!supportedQuizIcons.has(quiz.iconId)) {
    addError(errors, "iconId", "El icono del quiz no es compatible.", "unsupported_quiz_icon");
  }

  if (!Array.isArray(quiz.questions)) {
    addError(errors, "questions", "La lista de preguntas no es válida.", "invalid_questions");
  } else {
    if (requirePlayable && quiz.questions.length === 0) {
      addError(errors, "questions", "Agrega al menos una pregunta para jugar.", "empty_quiz");
    }

    quiz.questions.forEach((question, index) => validateQuestion(question, index, errors, requirePlayable));
  }

  return { valid: errors.length === 0, errors };
};
