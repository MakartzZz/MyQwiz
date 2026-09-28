import { useEffect, useState } from "react";

function QuizManageModal({ quiz, mode, onClose, onConfirm }) {
  const [title, setTitle] = useState(quiz?.title ?? "");

  useEffect(() => {
    setTitle(quiz?.title ?? "");
  }, [quiz]);

  useEffect(() => {
    if (!quiz) return undefined;
    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [quiz, onClose]);

  if (!quiz) return null;

  const isDelete = mode === "delete";
  const submit = (event) => {
    event.preventDefault();
    if (!isDelete && !title.trim()) return;
    onConfirm(isDelete ? quiz : { ...quiz, title: title.trim() });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="quiz-modal quiz-manage-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-manage-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">{isDelete ? "Eliminar quiz" : "Cambiar nombre"}</span>
            <h2 id="quiz-manage-title">{isDelete ? "¿Eliminar este quiz?" : "Renombra tu quiz"}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          {isDelete ? (
            <p className="quiz-manage-modal__warning">Se eliminará <strong>“{quiz.title}”</strong> de este navegador. Esta acción no se puede deshacer.</p>
          ) : (
            <label className="form-field">
              <span>Nuevo título</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
            </label>
          )}

          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className={`secondary-button ${isDelete ? "is-danger" : ""}`} type="submit" disabled={!isDelete && !title.trim()}>{isDelete ? "Eliminar definitivamente" : "Guardar nombre"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizManageModal;
