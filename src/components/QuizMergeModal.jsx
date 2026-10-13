import { useEffect, useMemo, useState } from "react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import { QuizIcon } from "./QuizIcon.jsx";

function QuizMergeModal({ quiz, quizzes, onClose, onConfirm }) {
  const candidates = useMemo(
    () => quizzes.filter((candidate) => candidate.id !== quiz?.id),
    [quiz?.id, quizzes],
  );
  const [selectedQuizId, setSelectedQuizId] = useState(candidates[0]?.id ?? "");
  useModalOpenSound(Boolean(quiz));

  useEffect(() => {
    setSelectedQuizId(candidates[0]?.id ?? "");
  }, [candidates]);

  useEffect(() => {
    if (!quiz) return undefined;
    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose, quiz]);

  if (!quiz) return null;

  const selectedQuiz = candidates.find((candidate) => candidate.id === selectedQuizId);
  const submit = (event) => {
    event.preventDefault();
    if (selectedQuiz) onConfirm(quiz, selectedQuiz);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="quiz-modal quiz-merge-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-merge-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Fusionar quizzes</span>
            <h2 id="quiz-merge-title">¿Con cuál quieres unir “{quiz.title}”?</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          <p className="quiz-merge-modal__note">
            Se creará un quiz nuevo con todas las preguntas. Los dos originales no cambiarán.
          </p>

          <div className="quiz-merge-modal__options" role="radiogroup" aria-label="Segundo quiz">
            {candidates.map((candidate) => (
              <label className={candidate.id === selectedQuizId ? "is-selected" : ""} key={candidate.id}>
                <input
                  type="radio"
                  name="merge-quiz"
                  value={candidate.id}
                  checked={candidate.id === selectedQuizId}
                  onChange={() => setSelectedQuizId(candidate.id)}
                />
                <span><QuizIcon iconId={candidate.iconId} size={22} /></span>
                <span>
                  <strong>{candidate.title}</strong>
                  <small>{candidate.questionCount ?? candidate.questions?.length ?? 0} preguntas</small>
                </span>
              </label>
            ))}
          </div>

          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="secondary-button" type="submit" disabled={!selectedQuiz}>Crear quiz fusionado</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizMergeModal;
