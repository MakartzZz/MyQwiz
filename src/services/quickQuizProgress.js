const STORAGE_KEY = "myqwiz:quick-quiz-progress:v1";

const emptyProgress = () => ({});

const readProgress = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : emptyProgress();
  } catch {
    return emptyProgress();
  }
};

const writeProgress = (progress) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export const quickQuizProgress = {
  getAll() {
    return readProgress();
  },

  recordAttempt(quizId, score) {
    const progress = readProgress();
    const previous = progress[quizId] ?? {};
    const previousBest = Number.isFinite(previous.bestScore) ? previous.bestScore : null;

    progress[quizId] = {
      attempts: (previous.attempts ?? 0) + 1,
      bestScore: previousBest === null ? score : Math.max(previousBest, score),
      lastPlayedAt: new Date().toISOString(),
    };

    writeProgress(progress);
    return progress;
  },
};
