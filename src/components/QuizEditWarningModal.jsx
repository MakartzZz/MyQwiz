import { useEffect } from "react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";

function QuizEditWarningModal({ quiz, onClose, onConfirm }) {
  useModalOpenSound(Boolean(quiz));

  useEffect(() => {
    if (!quiz) return undefined;

    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [quiz, onClose]);

  if (!quiz) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="quiz-modal quiz-manage-modal quiz-edit-warning-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-edit-warning-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Editar quiz calificado</span>
            <h2 id="quiz-edit-warning-title">¿Quieres modificar este quiz?</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="quiz-edit-warning-modal__content">
          <p>
            Tu mejor nota actual en <strong>“{quiz.title}”</strong> es de <strong>{quiz.stats.bestScore}%</strong>.
          </p>
          <p>
            La nota seguirá visible mientras los cambios permanezcan como borrador. Cuando vuelvas a marcar el quiz como listo, se eliminarán la nota y los intentos anteriores porque será una evaluación diferente.
          </p>
        </div>

        <div className="quiz-modal__actions">
          <button className="modal-cancel" type="button" onClick={onClose} autoFocus>Cancelar</button>
          <button className="secondary-button" type="button" onClick={() => onConfirm(quiz)}>Editar de todos modos</button>
        </div>
      </section>
    </div>
  );
}

export default QuizEditWarningModal;
