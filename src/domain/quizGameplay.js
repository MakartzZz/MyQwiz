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

const SPANISH_STOP_WORDS = new Set([
  "a", "al", "algo", "como", "con", "de", "del", "el", "ella", "en", "es", "esta", "este",
  "la", "las", "lo", "los", "o", "para", "por", "que", "se", "sin", "su", "sus", "un", "una", "y",
]);

const normalizeComparableText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es")
  .replace(/[^a-z0-9ñ\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const comparableTokens = (value) => [...new Set(
  normalizeComparableText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !SPANISH_STOP_WORDS.has(token)),
)];

const bigrams = (value) => {
  const compact = normalizeComparableText(value).replace(/\s/g, "");
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, index) => compact.slice(index, index + 2));
};

const diceCoefficient = (firstValue, secondValue) => {
  const first = bigrams(firstValue);
  const second = bigrams(secondValue);
  if (!first.length || !second.length) return 0;
  const remaining = [...second];
  let matches = 0;
  first.forEach((item) => {
    const index = remaining.indexOf(item);
    if (index < 0) return;
    matches += 1;
    remaining.splice(index, 1);
  });
  return (2 * matches) / (first.length + second.length);
};

export const calculateShortAnswerSimilarity = (answer, referenceAnswer, keywords = []) => {
  const normalizedAnswer = normalizeComparableText(answer);
  const normalizedReference = normalizeComparableText(referenceAnswer);
  if (!normalizedAnswer || !normalizedReference) return 0;
  if (normalizedAnswer === normalizedReference) return 100;

  const answerTokens = comparableTokens(answer);
  const referenceTokens = comparableTokens(referenceAnswer);
  const sharedTokens = answerTokens.filter((token) => referenceTokens.includes(token)).length;
  const precision = answerTokens.length ? sharedTokens / answerTokens.length : 0;
  const recall = referenceTokens.length ? sharedTokens / referenceTokens.length : 0;
  const tokenScore = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  const characterScore = diceCoefficient(answer, referenceAnswer);
  const normalizedKeywords = keywords.map(normalizeComparableText).filter(Boolean);
  const keywordScore = normalizedKeywords.length
    ? normalizedKeywords.filter((keyword) => normalizedAnswer.includes(keyword)).length / normalizedKeywords.length
    : null;
  const similarity = keywordScore === null
    ? (tokenScore * 0.65) + (characterScore * 0.35)
    : (keywordScore * 0.45) + (tokenScore * 0.35) + (characterScore * 0.2);

  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
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

export const shouldAutomaticallyAdvanceQuestion = ({
  enabled = true,
  isChecked,
  isCorrect,
  isFinished,
  isReviewingMatching,
  isTerminalGameOver,
  questionTransition,
}) => Boolean(
  enabled
  && isChecked
  && isCorrect
  && !isFinished
  && !isReviewingMatching
  && !isTerminalGameOver
  && questionTransition === "idle"
);
