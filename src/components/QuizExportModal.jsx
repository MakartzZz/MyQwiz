import { useEffect, useState } from "react";

function QuizExportModal({ quiz, onClose, onExport, onDrive }) {
  const [filename, setFilename] = useState(quiz?.title ?? "");

  useEffect(() => {
    setFilename(quiz?.title ?? "");
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

  const submit = (event) => {
    event.preventDefault();
    if (filename.trim()) onExport(filename.trim());
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="quiz-modal quiz-export-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-export-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Compartir quiz</span>
            <h2 id="quiz-export-title">Exporta tu archivo</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <form onSubmit={submit}>
          <label className="form-field">
            <span>Nombre del archivo</span>
            <div className="export-filename-field">
              <input value={filename} onChange={(event) => setFilename(event.target.value)} autoFocus />
              <span>.myqwiz.json</span>
            </div>
          </label>

          <div className="quiz-export-modal__drive">
            <div>
              <strong>Conserva una copia</strong>
              <p>Después de descargar el archivo, puedes guardarlo en Drive para recuperarlo o compartirlo fácilmente.</p>
            </div>
            <button type="button" onClick={onDrive}>Abrir Drive ↗</button>
          </div>

          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="secondary-button" type="submit" disabled={!filename.trim()}>Descargar archivo</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizExportModal;
