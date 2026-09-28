import { useCallback, useState } from "react";
import { createQuiz, duplicateQuiz } from "../domain/quizFactory.js";
import { validateQuiz } from "../domain/quizValidation.js";
import { quizStorage } from "../services/quizStorage.js";

export function useQuizLibrary() {
  const [quizzes, setQuizzes] = useState(() => quizStorage.getAll());

  const createDraft = useCallback((quizDetails) => {
    const quiz = createQuiz(quizDetails);
    const savedQuiz = quizStorage.save(quiz);
    setQuizzes(quizStorage.getAll());
    return savedQuiz;
  }, []);

  const saveDraft = useCallback((quiz) => {
    const savedQuiz = quizStorage.save(quiz);
    setQuizzes(quizStorage.getAll());
    return savedQuiz;
  }, []);

  const duplicateDraft = useCallback((quiz) => {
    const duplicate = quizStorage.save(duplicateQuiz(quiz));
    setQuizzes(quizStorage.getAll());
    return duplicate;
  }, []);

  const deleteDraft = useCallback((quizId) => {
    const removed = quizStorage.remove(quizId);
    if (removed) setQuizzes(quizStorage.getAll());
    return removed;
  }, []);

  const importDraft = useCallback((sourceQuiz) => {
    const importedQuiz = duplicateQuiz(sourceQuiz);
    importedQuiz.title = sourceQuiz.title;
    importedQuiz.status = sourceQuiz.status === "ready" && validateQuiz(sourceQuiz, { requirePlayable: true }).valid
      ? "ready"
      : "draft";
    const savedQuiz = quizStorage.save(importedQuiz);
    setQuizzes(quizStorage.getAll());
    return savedQuiz;
  }, []);

  const recordAttempt = useCallback((quizId, score) => {
    const savedQuiz = quizStorage.recordAttempt(quizId, score);
    if (savedQuiz) setQuizzes(quizStorage.getAll());
    return savedQuiz;
  }, []);

  return { quizzes, createDraft, saveDraft, duplicateDraft, deleteDraft, importDraft, recordAttempt };
}
