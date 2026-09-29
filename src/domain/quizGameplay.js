import { QUESTION_TYPES } from "./quizConstants.js";

export const shuffleItems = (items, random = Math.random) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

export const prepareQuizForPlay = (quiz, random = Math.random) => {
  const questions = quiz.settings?.shuffleQuestions === false
    ? [...quiz.questions]
    : shuffleItems(quiz.questions, random);

  return questions.map((question) => {
    if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      return {
        ...question,
        options: quiz.settings?.shuffleAnswers === false
          ? [...question.options]
          : shuffleItems(question.options, random),
      };
    }

    if (question.type === QUESTION_TYPES.MATCHING) {
      return {
        ...question,
        leftItems: shuffleItems(question.pairs.map((pair) => ({ id: pair.id, text: pair.left })), random),
        rightItems: shuffleItems(question.pairs.map((pair) => ({ id: pair.id, text: pair.right })), random),
      };
    }

    return { ...question };
  });
};

const normalizeAnswer = (value, caseSensitive = false) => {
  const normalized = String(value ?? "").trim().replace(/\s+/g, " ").normalize("NFC");
  return caseSensitive ? normalized : normalized.toLocaleLowerCase("es");
};

export const evaluateQuestionAnswer = (question, answer) => {
  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    return question.options.some((option) => option.id === answer && option.isCorrect);
  }

  if (question.type === QUESTION_TYPES.TRUE_FALSE) {
    return answer === question.correctAnswer;
  }

  if (question.type === QUESTION_TYPES.FILL_BLANK) {
    const response = normalizeAnswer(answer, question.caseSensitive);
    return question.acceptedAnswers.some((accepted) => (
      normalizeAnswer(accepted, question.caseSensitive) === response
    ));
  }

  if (question.type === QUESTION_TYPES.MATCHING) {
    return question.pairs.every((pair) => answer?.[pair.id] === pair.id);
  }

  if (question.type === QUESTION_TYPES.SHORT_ANSWER) {
    return answer === true;
  }

  return false;
};

export const calculateScore = (correctAnswers, totalQuestions) => (
  totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
);
