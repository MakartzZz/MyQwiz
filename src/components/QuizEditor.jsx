import { useEffect, useMemo, useState } from "react";
import { QUESTION_TYPES } from "../domain/quizConstants.js";
import { cloneQuestion, createId, createQuestion } from "../domain/quizFactory.js";
import { validateQuiz } from "../domain/quizValidation.js";
import SubjectSelect from "./SubjectSelect.jsx";

const questionTypeOptions = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección múltiple", hint: "Una opción correcta" },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "Verdadero o falso", hint: "Elige el valor de la afirmación" },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar", hint: "Una o más respuestas aceptadas" },
  { id: QUESTION_TYPES.MATCHING, label: "Asociar", hint: "Relaciona parejas" },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Respuesta breve", hint: "Compara una respuesta redactada" },
];

const QuestionFields = ({ question, onChange }) => {
  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    const updateOption = (optionId, changes) => {
      onChange({
        options: question.options.map((option) => (
          option.id === optionId ? { ...option, ...changes } : option
        )),
      });
    };

    const setCorrectOption = (optionId) => {
      onChange({
        options: question.options.map((option) => ({
          ...option,
          isCorrect: option.id === optionId,
        })),
      });
    };

    return (
      <div className="question-editor__answers">
        <span className="question-editor__label">Opciones</span>
        {question.options.map((option, index) => (
          <div className="answer-row" key={option.id}>
            <input
              type="radio"
              name={`correct-${question.id}`}
              checked={option.isCorrect}
              onChange={() => setCorrectOption(option.id)}
              aria-label={`Marcar opción ${index + 1} como correcta`}
            />
            <input
              value={option.text}
              onChange={(event) => updateOption(option.id, { text: event.target.value })}
              placeholder={`Opción ${index + 1}`}
            />
            <button
              type="button"
              className="editor-icon-button"
              disabled={question.options.length <= 2}
              onClick={() => onChange({ options: question.options.filter((item) => item.id !== option.id) })}
              aria-label={`Eliminar opción ${index + 1}`}
            >×</button>
          </div>
        ))}
        <button
          className="editor-add-row"
          type="button"
          onClick={() => onChange({
            options: [...question.options, { id: createId("option"), text: "", isCorrect: false }],
          })}
        >+ Agregar opción</button>
      </div>
    );
  }

  if (question.type === QUESTION_TYPES.TRUE_FALSE) {
    return (
      <div className="question-editor__answers">
        <span className="question-editor__label">Respuesta correcta</span>
        <div className="true-false-editor">
          <button className={question.correctAnswer === true ? "is-selected" : ""} type="button" onClick={() => onChange({ correctAnswer: true })} aria-pressed={question.correctAnswer === true}>
            <span>V</span> Verdadero
          </button>
          <button className={question.correctAnswer === false ? "is-selected" : ""} type="button" onClick={() => onChange({ correctAnswer: false })} aria-pressed={question.correctAnswer === false}>
            <span>F</span> Falso
          </button>
        </div>
      </div>
    );
  }

  if (question.type === QUESTION_TYPES.FILL_BLANK) {
    return (
      <div className="question-editor__answers">
        <span className="question-editor__label">Respuestas aceptadas</span>
        {question.acceptedAnswers.map((answer, index) => (
          <div className="answer-row" key={`${question.id}-answer-${index}`}>
            <input
              value={answer}
              onChange={(event) => onChange({
                acceptedAnswers: question.acceptedAnswers.map((item, answerIndex) => (
                  answerIndex === index ? event.target.value : item
                )),
              })}
              placeholder={`Respuesta ${index + 1}`}
            />
            <button
              type="button"
              className="editor-icon-button"
              disabled={question.acceptedAnswers.length <= 1}
              onClick={() => onChange({
                acceptedAnswers: question.acceptedAnswers.filter((_, answerIndex) => answerIndex !== index),
              })}
              aria-label={`Eliminar respuesta ${index + 1}`}
            >×</button>
          </div>
        ))}
        <div className="question-editor__inline-actions">
          <button className="editor-add-row" type="button" onClick={() => onChange({ acceptedAnswers: [...question.acceptedAnswers, ""] })}>+ Agregar respuesta</button>
          <label className="editor-check"><input type="checkbox" checked={question.caseSensitive} onChange={(event) => onChange({ caseSensitive: event.target.checked })} /> Distinguir mayúsculas</label>
        </div>
      </div>
    );
  }

  if (question.type === QUESTION_TYPES.MATCHING) {
    return (
      <div className="question-editor__answers">
        <span className="question-editor__label">Parejas</span>
        {question.pairs.map((pair, index) => (
          <div className="matching-row" key={pair.id}>
            <input
              value={pair.left}
              onChange={(event) => onChange({ pairs: question.pairs.map((item) => item.id === pair.id ? { ...item, left: event.target.value } : item) })}
              placeholder={`Concepto ${index + 1}`}
            />
            <span>↔</span>
            <input
              value={pair.right}
              onChange={(event) => onChange({ pairs: question.pairs.map((item) => item.id === pair.id ? { ...item, right: event.target.value } : item) })}
              placeholder={`Pareja ${index + 1}`}
            />
            <button
              type="button"
              className="editor-icon-button"
              disabled={question.pairs.length <= 2}
              onClick={() => onChange({ pairs: question.pairs.filter((item) => item.id !== pair.id) })}
              aria-label={`Eliminar pareja ${index + 1}`}
            >×</button>
          </div>
        ))}
        <button className="editor-add-row" type="button" onClick={() => onChange({ pairs: [...question.pairs, { id: createId("pair"), left: "", right: "" }] })}>+ Agregar pareja</button>
      </div>
    );
  }

  return (
    <div className="question-editor__answers">
      <label className="editor-field">
        <span>Respuesta de referencia</span>
        <textarea value={question.referenceAnswer} onChange={(event) => onChange({ referenceAnswer: event.target.value })} rows="4" placeholder="Escribe la respuesta con la que se comparará lo redactado por la persona." />
      </label>
      <label className="editor-field">
        <span>Palabras clave <small>separadas por comas</small></span>
        <input value={question.keywords.join(", ")} onChange={(event) => onChange({ keywords: event.target.value.split(",").map((keyword) => keyword.trim()).filter(Boolean) })} placeholder="Ejemplo: fotosíntesis, luz, energía" />
      </label>
      <label className="editor-check"><input type="checkbox" checked={question.allowSelfAssessment} onChange={(event) => onChange({ allowSelfAssessment: event.target.checked })} /> Permitir valoración final de la persona</label>
    </div>
  );
};

function QuizEditor({ quiz, onBack, onSave, onValidationError }) {
  const [draft, setDraft] = useState(quiz);
  const [isSaved, setIsSaved] = useState(true);

  useEffect(() => {
    setDraft(quiz);
    setIsSaved(true);
  }, [quiz]);

  useEffect(() => {
    if (isSaved || !draft.title.trim()) return undefined;

    const autosaveTimer = window.setTimeout(() => {
      const savedQuiz = onSave(draft, { silent: true });
      if (savedQuiz) {
        setDraft(savedQuiz);
        setIsSaved(true);
      }
    }, 900);

    return () => window.clearTimeout(autosaveTimer);
  }, [draft, isSaved, onSave]);

  const questionCountLabel = useMemo(() => (
    `${draft.questions.length} ${draft.questions.length === 1 ? "pregunta" : "preguntas"}`
  ), [draft.questions.length]);

  const updateDraft = (changes) => {
    setDraft((current) => ({
      ...current,
      ...changes,
      status: current.status === "ready" ? "draft" : current.status,
    }));
    setIsSaved(false);
  };

  const updateQuestion = (questionId, changes) => {
    updateDraft({
      questions: draft.questions.map((question) => (
        question.id === questionId ? { ...question, ...changes } : question
      )),
    });
  };

  const addQuestion = (type) => {
    updateDraft({ questions: [createQuestion(type), ...draft.questions] });
  };

  const moveQuestion = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.questions.length) return;
    const questions = [...draft.questions];
    [questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];
    updateDraft({ questions });
  };

  const saveDraft = () => {
    const savedQuiz = onSave(draft);
    if (!savedQuiz) return;
    setDraft(savedQuiz);
    setIsSaved(true);
  };

  const markAsReady = () => {
    const validation = validateQuiz(draft, { requirePlayable: true });
    if (!validation.valid) {
      onValidationError(validation.errors);
      return;
    }

    const savedQuiz = onSave({ ...draft, status: "ready" });
    if (!savedQuiz) return;
    setDraft(savedQuiz);
    setIsSaved(true);
  };

  const leaveEditor = () => {
    if (!isSaved && draft.title.trim()) {
      const savedQuiz = onSave(draft, { silent: true });
      if (!savedQuiz) return;
    }
    onBack();
  };

  return (
    <section className="quiz-editor" aria-labelledby="quiz-editor-title">
      <div className="quiz-editor__toolbar">
        <button className="settings-back" type="button" onClick={leaveEditor}>← Volver a la biblioteca</button>
        {draft.status !== "ready" && <button className="editor-ready-button" type="button" onClick={markAsReady}>Marcar como listo</button>}
        <button className="secondary-button quiz-editor__save-button" type="button" onClick={saveDraft} disabled={isSaved || !draft.title.trim()} aria-live="polite">
          {isSaved ? (draft.status === "ready" ? "Quiz guardado" : "Borrador guardado") : "Guardar borrador"}
        </button>
      </div>

      <div className="quiz-editor__header">
        <label className="editor-field editor-field--title">
          <span>Título del quiz</span>
          <input id="quiz-editor-title" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} />
        </label>
        <label className="editor-field">
          <span>Descripción <small>opcional</small></span>
          <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} rows="2" placeholder="¿Qué se va a practicar?" />
        </label>
        <SubjectSelect className="quiz-editor__subject" value={draft.iconId} onChange={(iconId) => updateDraft({ iconId })} label="Materia" />
        <span className="quiz-editor__count">{questionCountLabel}</span>
      </div>

      <div className="question-type-picker">
        <div>
          <span className="eyebrow">Nueva pregunta</span>
          <strong>Elige el formato</strong>
        </div>
        {questionTypeOptions.map((type) => (
          <button type="button" key={type.id} onClick={() => addQuestion(type.id)}>
            <strong>{type.label}</strong>
            <small>{type.hint}</small>
          </button>
        ))}
      </div>

      {!draft.questions.length ? (
        <div className="quiz-editor__empty">
          <span>?</span>
          <strong>Tu quiz todavía no tiene preguntas</strong>
          <p>Elige uno de los formatos de arriba para comenzar.</p>
        </div>
      ) : (
        <div className="question-editor-list">
          {draft.questions.map((question, index) => {
            const type = questionTypeOptions.find((item) => item.id === question.type);
            return (
              <article className="question-editor" key={question.id}>
                <div className="question-editor__top">
                  <div><span>Pregunta {index + 1}</span><strong>{type?.label}</strong></div>
                  <div className="question-editor__controls">
                    <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} aria-label="Subir pregunta">↑</button>
                    <button type="button" disabled={index === draft.questions.length - 1} onClick={() => moveQuestion(index, 1)} aria-label="Bajar pregunta">↓</button>
                    <button type="button" onClick={() => updateDraft({ questions: [...draft.questions.slice(0, index + 1), cloneQuestion(question), ...draft.questions.slice(index + 1)] })}>Duplicar</button>
                    <button type="button" className="is-danger" onClick={() => updateDraft({ questions: draft.questions.filter((item) => item.id !== question.id) })}>Eliminar</button>
                  </div>
                </div>

                <label className="editor-field">
                  <span>Enunciado</span>
                  <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })} rows="2" placeholder="Escribe aquí la pregunta o instrucción." />
                </label>

                <QuestionFields question={question} onChange={(changes) => updateQuestion(question.id, changes)} />

                <label className="editor-field editor-field--explanation">
                  <span>Retroalimentación <small>opcional</small></span>
                  <textarea value={question.explanation} onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })} rows="2" placeholder="Explica por qué esta es la respuesta correcta." />
                </label>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default QuizEditor;
