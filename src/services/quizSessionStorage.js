const STORAGE_KEY = "myqwiz:active-game:v1";

export const quizSessionStorage = {
  get() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      if (!value) return null;
      const session = JSON.parse(value);
      if (!session?.quizId || !session?.gameMode || !Array.isArray(session.questions)) return null;
      return session;
    } catch {
      return null;
    }
  },

  save(session) {
    const nextSession = { ...session, savedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    return nextSession;
  },

  clear() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
};
