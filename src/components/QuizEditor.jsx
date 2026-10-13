import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ListChecks,
  MessageSquareText,
  Plus,
  TextCursorInput,
  ToggleLeft,
  X,
} from "lucide-react";
import { QUESTION_TYPES } from "../domain/quizConstants.js";
import { MAX_QUESTIONS_PER_QUIZ } from "../domain/cloudLimits.js";
import { clearQuizResults, cloneQuestion, createId, createQuestion } from "../domain/quizFactory.js";
import { isSupportedQuestionImageUrl } from "../domain/questionImage.js";
import { readUserPreferences } from "../services/userPreferences.js";
import QuestionImage from "./QuestionImage.jsx";
import SubjectSelect from "./SubjectSelect.jsx";

const QUESTION_DELETE_ANIMATION_MS = 320;

const questionTypeOptions = [
  { id: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Selección múltiple", hint: "Una opción correcta", icon: ListChecks },
  { id: QUESTION_TYPES.TRUE_FALSE, label: "Verdadero o falso", hint: "Elige el valor de la afirmación", icon: ToggleLeft },
  { id: QUESTION_TYPES.FILL_BLANK, label: "Completar", hint: "Una o más respuestas aceptadas", icon: TextCursorInput },
  { id: QUESTION_TYPES.MATCHING, label: "Asociar", hint: "Relaciona parejas", icon: ArrowLeftRight },
  { id: QUESTION_TYPES.SHORT_ANSWER, label: "Respuesta breve", hint: "Compara una respuesta redactada", icon: MessageSquareText },
];

const KeywordInput = ({ keywords, onChange }) => {
  const formattedKeywords = keywords.join(", ");
  const [inputValue, setInputValue] = useState(formattedKeywords);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) setInputValue(formattedKeywords);
  }, [formattedKeywords]);

  const updateKeywords = (value) => {
    setInputValue(value);
    onChange(value.split(",").map((keyword) => keyword.trim()));
  };

  const finishEditing = () => {
    isFocusedRef.current = false;
    const normalizedKeywords = inputValue
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean);
    setInputValue(normalizedKeywords.join(", "));
    onChange(normalizedKeywords);
  };

  return (
    <input
      value={inputValue}
      onFocus={() => { isFocusedRef.current = true; }}
      onChange={(event) => updateKeywords(event.target.value)}
      onBlur={finishEditing}
      placeholder="Ejemplo: fotosíntesis, luz, energía"
    />
  );
};

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
        <KeywordInput
          keywords={question.keywords}
          onChange={(keywords) => onChange({ keywords })}
        />
      </label>
    </div>
  );
};

function QuizEditor({ quiz, onBack, onSave }) {
  const [draft, setDraft] = useState(quiz);
  const [isSaved, setIsSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeQuestionType, setActiveQuestionType] = useState(
    () => quiz.questions[0]?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE,
  );
  const [enteringQuestionId, setEnteringQuestionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);
  const pendingScrollPositionRef = useRef(null);
  const deleteQuestionTimeoutRef = useRef(null);

  useEffect(() => {
    setDraft(quiz);
    setIsSaved(true);
  }, [quiz]);

  useEffect(() => {
    setActiveQuestionType(
      quiz.questions[0]?.type ?? QUESTION_TYPES.MULTIPLE_CHOICE,
    );
  }, [quiz.id]);

  useEffect(
    () => () => window.clearTimeout(deleteQuestionTimeoutRef.current),
    [],
  );

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
  }, [activeQuestionType, draft.questions.length]);

  useEffect(() => {
    if (isSaved || !draft.title.trim()) return undefined;

    const autosaveTimer = window.setTimeout(async () => {
      setIsSaving(true);
      const savedQuiz = await onSave(draft, { silent: true });
      if (savedQuiz) {
        setDraft(savedQuiz);
        setIsSaved(true);
      }
      setIsSaving(false);
    }, 900);

    return () => window.clearTimeout(autosaveTimer);
  }, [draft, isSaved, onSave]);

  const questionCountLabel = useMemo(() => (
    `${draft.questions.length} / ${MAX_QUESTIONS_PER_QUIZ} ${draft.questions.length === 1 ? "pregunta" : "preguntas"}`
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
    setDraft((current) => clearQuizResults({ ...current, ...changes }));
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
    if (draft.questions.length >= MAX_QUESTIONS_PER_QUIZ) return;
    const newQuestion = createQuestion(type);
    pendingScrollPositionRef.current = {
      left: window.scrollX,
      top: window.scrollY,
    };
    selectQuestionType(type);
    setEnteringQuestionId(newQuestion.id);
    updateDraft({ questions: [newQuestion, ...draft.questions] });
  };

  const removeQuestion = (questionId) => {
    setDraft((current) => clearQuizResults({
      ...current,
      questions: current.questions.filter((question) => question.id !== questionId),
    }));
    setIsSaved(false);
    setDeletingQuestionId(null);
  };

  const deleteQuestion = (questionId) => {
    if (deletingQuestionId) return;

    const reduceMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      readUserPreferences().reduceMotion;

    if (reduceMotion) {
      removeQuestion(questionId);
      return;
    }

    setEnteringQuestionId(null);
    setDeletingQuestionId(questionId);
    window.clearTimeout(deleteQuestionTimeoutRef.current);
    deleteQuestionTimeoutRef.current = window.setTimeout(() => {
      removeQuestion(questionId);
      deleteQuestionTimeoutRef.current = null;
    }, QUESTION_DELETE_ANIMATION_MS);
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
    if (draft.questions.length >= MAX_QUESTIONS_PER_QUIZ) return;
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

  const saveQuiz = async () => {
    setIsSaving(true);
    const savedQuiz = await onSave(draft);
    setIsSaving(false);
    if (!savedQuiz) return;
    setDraft(savedQuiz);
    setIsSaved(true);
  };

  const leaveEditor = async () => {
    if (!isSaved && draft.title.trim()) {
      setIsSaving(true);
      const savedQuiz = await onSave(draft, { silent: true });
      setIsSaving(false);
      if (!savedQuiz) return;
    }
    onBack();
  };

  return (
    <section className="quiz-editor" aria-labelledby="quiz-editor-title">
      <div className="quiz-editor__toolbar">
        <button className="settings-back" type="button" onClick={leaveEditor} disabled={isSaving}>← Volver a la biblioteca</button>
        <button className="secondary-button quiz-editor__save-button" type="button" onClick={saveQuiz} disabled={isSaving || isSaved || !draft.title.trim()} aria-live="polite">
          {isSaving ? "Guardando…" : isSaved ? "Quiz guardado" : "Guardar cambios"}
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
      {draft.questions.length >= MAX_QUESTIONS_PER_QUIZ && (
        <p className="quiz-editor__limit-message" role="status">
          Llegaste al máximo de {MAX_QUESTIONS_PER_QUIZ} preguntas. Elimina una para poder agregar o duplicar otra.
        </p>
      )}
      <div className="question-type-panel__create">
        <span className="question-type-panel__type" aria-hidden="true">
          <ActiveQuestionTypeIcon size={21} strokeWidth={1.9} />
        </span>
        <div>
          <strong>{activeQuestionTypeOption.label}</strong>
          <small>{activeQuestionTypeOption.hint}</small>
        </div>
        <button type="button" onClick={() => addQuestion(activeQuestionType)} disabled={draft.questions.length >= MAX_QUESTIONS_PER_QUIZ}>
          <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
          {draft.questions.length >= MAX_QUESTIONS_PER_QUIZ ? "Límite alcanzado" : "Agregar pregunta"}
        </button>
      </div>
      {!activeTypeQuestions.length ? (
        <div className="quiz-editor__empty">
          <span><ActiveQuestionTypeIcon size={23} aria-hidden="true" /></span>
          <strong>
            {draft.questions.length
              ? `Todavía no hay preguntas de ${activeQuestionTypeOption.label.toLowerCase()}`
              : "Tu quiz todavía no tiene preguntas"}
          </strong>
          <p>Usa el botÃ³n de arriba para crear la primera de este tipo.</p>
        </div>
      ) : (
        <div className="question-editor-list">
          {activeTypeQuestions.map((question, index) => {
            const type = questionTypeOptions.find((item) => item.id === question.type);
            return (
              <article
                className={`question-editor ${index === 0 ? "is-first" : ""} ${enteringQuestionId === question.id ? "is-entering" : ""} ${deletingQuestionId === question.id ? "is-deleting" : ""}`}
                key={question.id}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && enteringQuestionId === question.id) {
                    setEnteringQuestionId(null);
                  }
                }}
              >
                <div className="question-editor__top">
                  <div><span>Pregunta {index + 1}</span><strong>{type?.label}</strong></div>
                  <div className="question-editor__controls">
                    <button type="button" disabled={index === 0} onClick={() => moveQuestion(question.id, -1)} aria-label="Subir pregunta dentro de este tipo">↑</button>
                    <button type="button" disabled={index === activeTypeQuestions.length - 1} onClick={() => moveQuestion(question.id, 1)} aria-label="Bajar pregunta dentro de este tipo">↓</button>
                    <button type="button" disabled={draft.questions.length >= MAX_QUESTIONS_PER_QUIZ} onClick={() => duplicateQuestion(question.id)}>Duplicar</button>
                    <button type="button" className="is-danger" disabled={Boolean(deletingQuestionId)} onClick={() => deleteQuestion(question.id)}>Eliminar</button>
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
