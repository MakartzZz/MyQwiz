import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ListChecks,
  MessageSquareText,
  TextCursorInput,
  ToggleLeft,
  X,
} from "lucide-react";
import { QUESTION_TYPES } from "../domain/quizConstants.js";
import { cloneQuestion, createId, createQuestion, prepareQuizForReady } from "../domain/quizFactory.js";
import { isSupportedQuestionImageUrl } from "../domain/questionImage.js";
import { validateQuiz } from "../domain/quizValidation.js";
import QuestionImage from "./QuestionImage.jsx";
import SubjectSelect from "./SubjectSelect.jsx";

const questionTypeOptions = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección múltiple", hint: "Una opción correcta", icon: ListChecks },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "Verdadero o falso", hint: "Elige el valor de la afirmación", icon: ToggleLeft },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar", hint: "Una o más respuestas aceptadas", icon: TextCursorInput },
  { id: QUESTION_TYPES.MATCHING, label: "Asociar", hint: "Relaciona parejas", icon: ArrowLeftRight },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Respuesta breve", hint: "Compara una respuesta redactada", icon: MessageSquareText },
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
    const imageUrl = question.imageUrl ?? "";
    const hasImageUrl = Boolean(imageUrl.trim());
    const hasValidImageUrl = isSupportedQuestionImageUrl(imageUrl);

    return (
      <div className={`question-editor__answers question-fill-editor ${hasValidImageUrl ? "has-image" : ""}`}>
        <div className="question-fill-editor__fields">
          <div className="question-image-editor">
            <label className="editor-field">
              <span>Imagen de apoyo <small>opcional · URL pública</small></span>
              <div className="question-image-editor__url-row">
                <input
                  type="url"
                  inputMode="url"
                  spellCheck="false"
                  value={imageUrl}
                  onChange={(event) => onChange({ imageUrl: event.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {hasImageUrl && (
                  <button
                    className="question-image-editor__clear"
                    type="button"
                    onClick={() => onChange({ imageUrl: "" })}
                    aria-label="Quitar imagen"
                    title="Quitar imagen"
                  >
                    <X aria-hidden="true" size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </label>
            {hasImageUrl && !hasValidImageUrl && (
              <p className="question-image-editor__error" role="alert">
                Usa un enlace completo que comience con http:// o https://.
              </p>
            )}
          </div>
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
        {hasValidImageUrl && (
          <QuestionImage
            className="question-image-editor__preview"
            src={imageUrl}
          />
        )}
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
    </div>
  );
};

function QuizEditor({ quiz, onBack, onSave, onValidationError }) {
  const [draft, setDraft] = useState(quiz);
  const [isSaved, setIsSaved] = useState(true);
  const [activeQuestionType, setActiveQuestionType] = useState(
    () => quiz.questions[0]?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE,
  );
  const pendingScrollPositionRef = useRef(null);

  useEffect(() => {
    setDraft(quiz);
    setIsSaved(true);
  }, [quiz]);

  useEffect(() => {
    setActiveQuestionType(
      quiz.questions[0]?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE,
    );
  }, [quiz.id]);

  useLayoutEffect(() => {
    const scrollPosition = pendingScrollPositionRef.current;
    if (!scrollPosition) return undefined;

    const restoreScroll = () => {
      window.scrollTo(scrollPosition.left, scrollPosition.top);
    };

    restoreScroll();
    const frameId = window.requestAnimationFrame(() => {
      restoreScroll();
      pendingScrollPositionRef.current = null;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeQuestionType]);

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
  const questionTypeCounts = useMemo(() => Object.fromEntries(
    questionTypeOptions.map((type) => [
      type.id,
      draft.questions.filter((question) => question.type === type.id).length,
    ]),
  ), [draft.questions]);
  const activeTypeQuestions = useMemo(
    () => draft.questions.filter((question) => question.type === activeQuestionType),
    [activeQuestionType, draft.questions],
  );
  const activeQuestionTypeOption = questionTypeOptions.find(
    (type) => type.id === activeQuestionType,
  ) ?? questionTypeOptions[0];
  const ActiveQuestionTypeIcon = activeQuestionTypeOption.icon;

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

  const selectQuestionType = (type) => {
    if (type === activeQuestionType) return;
    pendingScrollPositionRef.current = {
      left: window.scrollX,
      top: window.scrollY,
    };
    setActiveQuestionType(type);
  };

  const addQuestion = (type) => {
    selectQuestionType(type);
    updateDraft({ questions: [createQuestion(type), ...draft.questions] });
  };

  const moveQuestion = (questionId, direction) => {
    const currentIndex = draft.questions.findIndex(
      (question) => question.id === questionId,
    );
    if (currentIndex < 0) return;
    const questionType = draft.questions[currentIndex].type;
    const matchingIndices = draft.questions.reduce((indices, question, index) => (
      question.type === questionType ? [...indices, index] : indices
    ), []);
    const currentTypeIndex = matchingIndices.indexOf(currentIndex);
    const targetIndex = matchingIndices[currentTypeIndex + direction];
    if (targetIndex === undefined) return;
    const questions = [...draft.questions];
    [questions[currentIndex], questions[targetIndex]] = [questions[targetIndex], questions[currentIndex]];
    updateDraft({ questions });
  };

  const duplicateQuestion = (questionId) => {
    const questionIndex = draft.questions.findIndex(
      (question) => question.id === questionId,
    );
    if (questionIndex < 0) return;
    const question = draft.questions[questionIndex];
    updateDraft({
      questions: [
        ...draft.questions.slice(0, questionIndex + 1),
        cloneQuestion(question),
        ...draft.questions.slice(questionIndex + 1),
      ],
    });
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

    const savedQuiz = onSave(prepareQuizForReady(draft));
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
        {questionTypeOptions.map((type) => {
          const TypeIcon = type.icon;
          return (
            <button type="button" key={type.id} onClick={() => addQuestion(type.id)}>
              <span className="question-type-picker__icon" aria-hidden="true">
                <TypeIcon size={20} strokeWidth={1.9} />
              </span>
              <span className="question-type-picker__copy">
                <strong>{type.label}</strong>
                <small>{type.hint}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="question-type-tabs" role="tablist" aria-label="Preguntas por tipo">
        {questionTypeOptions.map((type) => {
          const TypeIcon = type.icon;
          const isActive = activeQuestionType === type.id;
          return (
            <button
              id={`question-type-tab-${type.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="question-type-panel"
              className={isActive ? "is-active" : ""}
              key={type.id}
              onClick={() => selectQuestionType(type.id)}
            >
              <TypeIcon size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>{type.label}</span>
              <strong>{questionTypeCounts[type.id]}</strong>
            </button>
          );
        })}
      </div>

      <div
        id="question-type-panel"
        className="question-type-panel"
        role="tabpanel"
        aria-labelledby={`question-type-tab-${activeQuestionType}`}
      >
      {!activeTypeQuestions.length ? (
        <div className="quiz-editor__empty">
          <span><ActiveQuestionTypeIcon size={23} aria-hidden="true" /></span>
          <strong>
            {draft.questions.length
              ? `Todavía no hay preguntas de ${activeQuestionTypeOption.label.toLowerCase()}`
              : "Tu quiz todavía no tiene preguntas"}
          </strong>
          <p>Agrega una de este formato usando el selector de arriba.</p>
        </div>
      ) : (
        <div className="question-editor-list">
          {activeTypeQuestions.map((question, index) => {
            const type = questionTypeOptions.find((item) => item.id === question.type);
            return (
              <article className="question-editor" key={question.id}>
                <div className="question-editor__top">
                  <div><span>Pregunta {index + 1}</span><strong>{type?.label}</strong></div>
                  <div className="question-editor__controls">
                    <button type="button" disabled={index === 0} onClick={() => moveQuestion(question.id, -1)} aria-label="Subir pregunta dentro de este tipo">↑</button>
                    <button type="button" disabled={index === activeTypeQuestions.length - 1} onClick={() => moveQuestion(question.id, 1)} aria-label="Bajar pregunta dentro de este tipo">↓</button>
                    <button type="button" onClick={() => duplicateQuestion(question.id)}>Duplicar</button>
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
      </div>
    </section>
  );
}

export default QuizEditor;
