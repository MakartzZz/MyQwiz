import { useMemo, useState } from "react";
import { QUESTION_TYPES, QUIZ_ICONS } from "../domain/quizConstants.js";
import { buildQuizPrompt, promptEducationLevels, promptQuestionTypes } from "../services/quizPrompt.js";
import { systemNotifications } from "../services/systemNotifications.js";
import SubjectSelect from "./SubjectSelect.jsx";

const initialCounts = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: 5,
  [QUESTION_TYPES.TRUE_FALSE]: 0,
  [QUESTION_TYPES.FILL_BLANK]: 3,
  [QUESTION_TYPES.MATCHING]: 0,
  [QUESTION_TYPES.SHORT_ANSWER]: 0,
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
};

function PromptRoom() {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [iconId, setIconId] = useState(QUIZ_ICONS.GENERAL);
  const [educationLevel, setEducationLevel] = useState("secondary");
  const [sourceMode, setSourceMode] = useState("documents");
  const [delivery, setDelivery] = useState("text");
  const [questionCounts, setQuestionCounts] = useState(initialCounts);
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const totalQuestions = useMemo(() => (
    Object.values(questionCounts).reduce((total, count) => total + count, 0)
  ), [questionCounts]);
  const canGenerate = Boolean(
    title.trim()
    && totalQuestions > 0
    && (sourceMode === "documents" || topic.trim()),
  );

  const updateCount = (typeId, value) => {
    const nextValue = Math.min(50, Math.max(0, Number(value) || 0));
    setQuestionCounts((current) => ({ ...current, [typeId]: nextValue }));
  };

  const generatePrompt = (event) => {
    event.preventDefault();
    if (!canGenerate) return;
    setGeneratedPrompt(buildQuizPrompt({ title, topic, iconId, delivery, questionCounts, educationLevel, sourceMode }));
  };

  const copyPrompt = async () => {
    try {
      await copyText(generatedPrompt);
      systemNotifications.success("Prompt copiado", "Ya puedes pegarlo en la IA que prefieras.");
    } catch {
      systemNotifications.error("No se pudo copiar", "Selecciona el contenido y cópialo manualmente.");
    }
  };

  return (
    <section className="prompt-room" aria-labelledby="prompt-room-title">
      <div className="prompt-room__workspace">
        <form className="prompt-builder" onSubmit={generatePrompt} aria-labelledby="prompt-room-title">
          <div className="prompt-builder__heading">
            <div><span className="eyebrow">01 · Configuración</span><h2 id="prompt-room-title">Cuéntanos qué quieres estudiar</h2></div>
            <span className="prompt-builder__total">{totalQuestions} preguntas</span>
          </div>

          <div className="prompt-builder__base-fields">
            <label className="form-field">
              <span>Título del quiz</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ejemplo: Sistema circulatorio" />
            </label>
            <SubjectSelect value={iconId} onChange={setIconId} label="Materia" />
          </div>

          <fieldset className="prompt-builder__levels">
            <legend>Nivel educativo</legend>
            <div>
              {promptEducationLevels.map((level) => (
                <button className={educationLevel === level.id ? "is-selected" : ""} type="button" key={level.id} onClick={() => setEducationLevel(level.id)} aria-pressed={educationLevel === level.id}>
                  {level.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="prompt-builder__delivery prompt-builder__source">
            <legend>¿De dónde debe obtener la IA la información?</legend>
            <label className={sourceMode === "documents" ? "is-selected" : ""}>
              <input type="radio" name="source" value="documents" checked={sourceMode === "documents"} onChange={() => setSourceMode("documents")} />
              <span><strong>Usaré mis documentos</strong><small>La IA basará todas las preguntas en los archivos que le adjuntes.</small></span>
            </label>
            <label className={sourceMode === "ai" ? "is-selected" : ""}>
              <input type="radio" name="source" value="ai" checked={sourceMode === "ai"} onChange={() => setSourceMode("ai")} />
              <span><strong>Que la IA genere el contenido</strong><small>Indica el tema y el enfoque para que la IA prepare la información.</small></span>
            </label>
          </fieldset>

          {sourceMode === "ai" ? (
            <label className="form-field">
              <span>Tema y enfoque</span>
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows="4" placeholder="Ejemplo: El sistema circulatorio, enfocándose en las partes del corazón, la circulación y las funciones de la sangre." />
            </label>
          ) : (
            <div className="prompt-builder__document-note">
              <strong>Prepara tus documentos</strong>
              <p>Cuando pegues el prompt en la IA, adjunta también tus presentaciones, apuntes o documentos. El prompt le indicará que debe utilizarlos como fuente principal.</p>
            </div>
          )}

          <fieldset className="prompt-builder__types">
            <legend>¿Cuántas preguntas quieres de cada tipo?</legend>
            {promptQuestionTypes.map((type) => (
              <div className={`prompt-type ${questionCounts[type.id] > 0 ? "is-active" : ""}`} key={type.id}>
                <div><strong>{type.label}</strong><small>{type.description}</small></div>
                <div className="prompt-type__counter">
                  <button type="button" onClick={() => updateCount(type.id, questionCounts[type.id] - 1)} aria-label={`Restar una pregunta de ${type.label}`}>−</button>
                  <input type="number" min="0" max="50" value={questionCounts[type.id]} onChange={(event) => updateCount(type.id, event.target.value)} aria-label={`Cantidad de preguntas de ${type.label}`} />
                  <button type="button" onClick={() => updateCount(type.id, questionCounts[type.id] + 1)} aria-label={`Agregar una pregunta de ${type.label}`}>+</button>
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="prompt-builder__delivery">
            <legend>¿Cómo quieres recibir el quiz de la IA?</legend>
            <label className={delivery === "text" ? "is-selected" : ""}>
              <input type="radio" name="delivery" value="text" checked={delivery === "text"} onChange={() => setDelivery("text")} />
              <span><strong>Texto para copiar</strong><small>Pégalo directamente en el importador de MyQwiz.</small></span>
            </label>
            <label className={delivery === "file" ? "is-selected" : ""}>
              <input type="radio" name="delivery" value="file" checked={delivery === "file"} onChange={() => setDelivery("file")} />
              <span><strong>Archivo .json</strong><small>Pídele a la IA que entregue el archivo listo para descargar.</small></span>
            </label>
          </fieldset>

          <button className="prompt-builder__generate" type="submit" disabled={!canGenerate}>Generar prompt</button>
        </form>

        <aside className="prompt-output" aria-live="polite">
          <div className="prompt-output__heading">
            <div><span className="eyebrow">02 · Resultado</span><h3>Tu prompt para la IA</h3></div>
            <button type="button" onClick={copyPrompt} disabled={!generatedPrompt}>Copiar prompt</button>
          </div>
          {generatedPrompt ? (
            <textarea value={generatedPrompt} readOnly aria-label="Prompt generado" />
          ) : (
            <div className="prompt-output__empty">
              <span>✦</span>
              <strong>Aquí aparecerá tu prompt</strong>
              <p>Completa la configuración y presiona “Generar prompt”.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default PromptRoom;
