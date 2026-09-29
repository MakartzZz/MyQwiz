import { useEffect, useState } from "react";
import { QUIZ_ICONS } from "../domain/quizConstants.js";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import { QuizIconPicker } from "./QuizIcon.jsx";

function QuizCreatorModal({ isOpen, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [iconId, setIconId] = useState(QUIZ_ICONS.GENERAL);
  useModalOpenSound(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const submitQuiz = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    onCreate({ title, description, iconId });
    setTitle("");
    setDescription("");
    setIconId(QUIZ_ICONS.GENERAL);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="quiz-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Nuevo borrador</span>
            <h2 id="quiz-modal-title">Crea la base de tu quiz</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submitQuiz}>
          <label className="form-field">
            <span>Título</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ejemplo: Fundamentos de redes" autoFocus />
          </label>

          <QuizIconPicker value={iconId} onChange={setIconId} compact />

          <label className="form-field">
            <span>Descripción <small>opcional</small></span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="¿Qué vas a practicar con este quiz?" rows="3" />
          </label>

          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="secondary-button" type="submit" disabled={!title.trim()}>Crear borrador</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizCreatorModal;
