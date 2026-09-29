import { useEffect, useState } from "react";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";

function QuizImportModal({ isOpen, onClose, onChooseFile, onImportText }) {
  const [jsonContent, setJsonContent] = useState("");
  useModalOpenSound(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    setJsonContent("");

    const closeWithEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submitJson = (event) => {
    event.preventDefault();
    if (!jsonContent.trim()) return;
    onImportText(jsonContent);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="quiz-modal quiz-import-modal" role="dialog" aria-modal="true" aria-labelledby="quiz-import-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quiz-modal__header">
          <div>
            <span className="eyebrow">Añadir a la biblioteca</span>
            <h2 id="quiz-import-title">Importa un quiz</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="quiz-import-modal__file">
          <span aria-hidden="true">JSON</span>
          <div>
            <strong>Subir un archivo</strong>
            <p>Selecciona un archivo .json o .myqwiz.json guardado en tu equipo.</p>
          </div>
          <button type="button" onClick={onChooseFile}>Elegir archivo</button>
        </div>

        <div className="quiz-import-modal__divider"><span>o pega el contenido</span></div>

        <form onSubmit={submitJson}>
          <label className="form-field quiz-import-modal__paste">
            <span>Contenido JSON <small>también acepta bloques copiados desde una IA</small></span>
            <textarea
              value={jsonContent}
              onChange={(event) => setJsonContent(event.target.value)}
              placeholder={'Pega aquí el contenido que comienza con { "fileType": "myqwiz-quiz" ... }'}
              rows="10"
              autoFocus
              spellCheck="false"
            />
          </label>

          <div className="quiz-modal__actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="secondary-button" type="submit" disabled={!jsonContent.trim()}>Reconocer e importar</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default QuizImportModal;
