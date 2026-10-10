import { useEffect, useState } from "react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";

function QuizProgressNoticeModal({ isOpen, onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  useModalOpenSound(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose(dontShowAgain);
    };

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [dontShowAgain, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={() => onClose(dontShowAgain)}
    >
      <section
        className="quiz-modal quiz-progress-notice"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-progress-notice-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-progress-notice__icon" aria-hidden="true">!</div>
        <div className="quiz-progress-notice__copy">
          <span className="eyebrow">Progreso guardado</span>
          <h2 id="quiz-progress-notice-title">Puedes continuar este quiz luego</h2>
          <p>
            Lo encontrarás en la barra lateral. Ten en cuenta que, si inicias otro
            quiz, este progreso se perderá y será reemplazado por la nueva partida.
          </p>
        </div>

        <label className="quiz-progress-notice__preference">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>No volver a mostrar</span>
        </label>

        <button
          className="secondary-button quiz-progress-notice__confirm"
          type="button"
          onClick={() => onClose(dontShowAgain)}
          autoFocus
        >
          Entendido
        </button>
      </section>
    </div>
  );
}

export default QuizProgressNoticeModal;
