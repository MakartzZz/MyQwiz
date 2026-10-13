export const MAX_QUESTIONS_PER_QUIZ = 100;
export const MAX_OWNED_QUIZZES = 30;
export const PROFILE_AVATAR_COUNT = 15;
export const USER_TAG_LENGTH = 6;

const USER_TAG_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const normalizeUsername = (username) => username
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLocaleLowerCase("es")
  .replace(/\s+/g, " ");

export const isValidAvatarId = (avatarId) => (
  Number.isInteger(avatarId)
  && avatarId >= 1
  && avatarId <= PROFILE_AVATAR_COUNT
);

export const isQuizWithinCloudLimits = (quiz) => (
  Array.isArray(quiz?.questions)
  && quiz.questions.length <= MAX_QUESTIONS_PER_QUIZ
);

export const createUserTag = (randomValues = globalThis.crypto) => {
  const bytes = new Uint8Array(USER_TAG_LENGTH);
  randomValues.getRandomValues(bytes);
  return Array.from(bytes, (value) => USER_TAG_ALPHABET[value % USER_TAG_ALPHABET.length]).join("");
};
