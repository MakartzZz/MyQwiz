import { useEffect, useState } from "react";

function QuizImportConflictModal({ conflict, onClose, onConfirm }) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!conflict) return;
    const suffix = conflict.reason === "identical" ? "copia importada" : "importado";
    setTitle(`${conflict.quiz.title} (${suffix})`);
  }, [conflict]);

  useEffect(() => {
    if (!conflict) return undefined;
    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [conflict, onClose]);

  if (!conflict) return null;

  const isIdentical = conflict.reason === "identical";
  const submit = (event) => {
    event.preventDefault();
    if (title.trim()) onConfirm(title.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="quiz-modal quiz-manage-modal" role="dialog" aria-modal="true" aria-labelledby="import-conflict-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Conflicto de importación</span>
            <h2 id="import-conflict-title">{isIdentical ? "Este quiz ya está registrado" : "Ese nombre ya está en uso"}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          <p className="quiz-import-conflict__message">
            {isIdentical
              ? "Encontramos un quiz con el mismo contenido. Si deseas conservar otra copia, asígnale un nombre diferente."
              : "El archivo contiene un quiz distinto, pero su nombre coincide con uno de tu biblioteca. Cámbialo para poder distinguirlos."}
          </p>
          <label className="form-field">
            <span>Nombre para el quiz importado</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </label>
          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar importación</button>
            <button className="secondary-button" type="submit" disabled={!title.trim()}>Importar con este nombre</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizImportConflictModal;
