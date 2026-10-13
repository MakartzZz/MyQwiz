import { useCallback, useEffect, useRef, useState } from "react";
import { createQuiz, duplicateQuiz, mergeQuizzes } from "../domain/quizFactory.js";
import {
  createCloudQuiz,
  deleteCloudQuiz,
  listOwnedQuizSummaries,
  listQuizProgress,
  listSharedQuizSummaries,
  loadCloudQuiz,
  recordCloudQuizAttempt,
  removeReceivedQuiz,
  saveQuizProgress,
  updateCloudQuiz,
} from "../services/cloudQuizRepository.js";
import { quizStorage } from "../services/quizStorage.js";

const migrationByUser = new Map();
const emptyStats = Object.freeze({ attempts: 0, bestScore: null, lastPlayedAt: null });

const questionTypeCounts = (questions = []) => questions.reduce((counts, question) => ({
  ...counts,
  [question.type]: counts[question.type] + 1,
}), {
  "multiple-choice": 0,
  "true-false": 0,
  matching: 0,
  "fill-blank": 0,
  "short-answer": 0,
});

const asOwnedQuiz = (quiz, userId) => ({
  ...quiz,
  ownerId: userId,
  isOwner: true,
  isShared: false,
  questionCount: quiz.questions.length,
  questionTypeCounts: questionTypeCounts(quiz.questions),
  stats: quiz.stats ?? { ...emptyStats },
});

const mergeProgress = (summaries, progress) => summaries.map((quiz) => ({
  ...quiz,
  stats: progress[quiz.id] ?? { ...emptyStats },
}));

const loadSummaries = async (userId) => {
  const [owned, shared, progress] = await Promise.all([
    listOwnedQuizSummaries(userId),
    listSharedQuizSummaries(userId),
    listQuizProgress(userId),
  ]);
  return mergeProgress([...owned, ...shared], progress)
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));
};

const migrateLocalQuizzes = (userId, knownSummaries) => {
  if (migrationByUser.has(userId)) return migrationByUser.get(userId);

  const migration = (async () => {
    const knownIds = new Set(knownSummaries.map(({ id }) => id));
    const localQuizzes = quizStorage.getAll();
    for (const quiz of localQuizzes) {
      if (knownIds.has(quiz.id)) {
        quizStorage.remove(quiz.id);
        continue;
      }
      try {
        await createCloudQuiz(userId, quiz);
        if ((quiz.stats?.attempts ?? 0) > 0) {
          await saveQuizProgress(userId, quiz.id, quiz.stats);
        }
        quizStorage.remove(quiz.id);
        knownIds.add(quiz.id);
      } catch {
        // Se conserva localmente si la cuota o la conexión impiden migrarlo.
      }
    }
  })();
  migrationByUser.set(userId, migration);
  return migration;
};

export function useQuizLibrary(userId) {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const quizzesRef = useRef(quizzes);

  useEffect(() => {
    quizzesRef.current = quizzes;
  }, [quizzes]);

  const refresh = useCallback(async () => {
    if (!userId) return [];
    const summaries = await loadSummaries(userId);
    setQuizzes(summaries);
    return summaries;
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    setIsLoading(true);
    loadSummaries(userId)
      .then(async (summaries) => {
        if (active) setQuizzes(summaries);
        await migrateLocalQuizzes(userId, summaries);
        if (!active) return;
        setQuizzes(await loadSummaries(userId));
      })
      .catch(() => {
        if (active) setQuizzes([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  const loadQuiz = useCallback(async (quizOrId) => {
    const quizId = typeof quizOrId === "string" ? quizOrId : quizOrId.id;
    const cached = quizzesRef.current.find(({ id }) => id === quizId);
    if (Array.isArray(cached?.questions)) return cached;

    const loaded = await loadCloudQuiz(quizId);
    if (!loaded) throw new Error("El quiz ya no está disponible.");
    const fullQuiz = {
      ...loaded,
      isOwner: cached?.isOwner ?? loaded.ownerId === userId,
      isShared: cached?.isShared ?? loaded.ownerId !== userId,
      shareId: cached?.shareId,
      friendshipId: cached?.friendshipId,
      ownerProfile: cached?.ownerProfile,
      stats: cached?.stats ?? { ...emptyStats },
    };
    setQuizzes((current) => current.map((quiz) => quiz.id === quizId ? fullQuiz : quiz));
    return fullQuiz;
  }, [userId]);

  const createQuizEntry = useCallback(async (quizDetails) => {
    const quiz = createQuiz(quizDetails);
    await createCloudQuiz(userId, quiz);
    const savedQuiz = asOwnedQuiz(quiz, userId);
    setQuizzes((current) => [savedQuiz, ...current]);
    return savedQuiz;
  }, [userId]);

  const saveQuiz = useCallback(async (quiz) => {
    if (quiz.ownerId && quiz.ownerId !== userId) {
      throw new Error("Para editar un quiz compartido primero debes crear tu propia copia.");
    }
    await updateCloudQuiz(userId, quiz);
    const savedQuiz = asOwnedQuiz({ ...quiz, updatedAt: new Date().toISOString() }, userId);
    setQuizzes((current) => current.map((item) => item.id === quiz.id ? savedQuiz : item));
    return savedQuiz;
  }, [userId]);

  const duplicateQuizEntry = useCallback(async (sourceQuiz) => {
    const fullSource = await loadQuiz(sourceQuiz);
    const duplicate = duplicateQuiz(fullSource);
    await createCloudQuiz(userId, duplicate);
    const savedQuiz = asOwnedQuiz(duplicate, userId);
    setQuizzes((current) => [savedQuiz, ...current]);
    return savedQuiz;
  }, [loadQuiz, userId]);

  const mergeQuizEntries = useCallback(async (primaryQuiz, secondaryQuiz) => {
    const [primary, secondary] = await Promise.all([loadQuiz(primaryQuiz), loadQuiz(secondaryQuiz)]);
    const merged = mergeQuizzes(primary, secondary);
    await createCloudQuiz(userId, merged);
    const savedQuiz = asOwnedQuiz(merged, userId);
    setQuizzes((current) => [savedQuiz, ...current]);
    return savedQuiz;
  }, [loadQuiz, userId]);

  const deleteQuiz = useCallback(async (quizOrId) => {
    const quiz = typeof quizOrId === "string"
      ? quizzesRef.current.find(({ id }) => id === quizOrId)
      : quizOrId;
    if (!quiz) return false;
    if (quiz.isShared || quiz.ownerId !== userId) await removeReceivedQuiz(quiz.id, userId);
    else await deleteCloudQuiz(userId, quiz.id);
    setQuizzes((current) => current.filter(({ id }) => id !== quiz.id));
    return true;
  }, [userId]);

  const importQuiz = useCallback(async (sourceQuiz) => {
    const importedQuiz = duplicateQuiz(sourceQuiz);
    importedQuiz.title = sourceQuiz.title;
    await createCloudQuiz(userId, importedQuiz);
    const savedQuiz = asOwnedQuiz(importedQuiz, userId);
    setQuizzes((current) => [savedQuiz, ...current]);
    return savedQuiz;
  }, [userId]);

  const recordAttempt = useCallback(async (quizId, score) => {
    const stats = await recordCloudQuizAttempt(userId, quizId, score);
    setQuizzes((current) => current.map((quiz) => quiz.id === quizId ? { ...quiz, stats } : quiz));
    return stats;
  }, [userId]);

  return {
    quizzes,
    isLoading,
    refresh,
    loadQuiz,
    createQuizEntry,
    saveQuiz,
    duplicateQuizEntry,
    mergeQuizEntries,
    deleteQuiz,
    importQuiz,
    recordAttempt,
  };
}
