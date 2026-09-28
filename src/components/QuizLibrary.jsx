import { useMemo, useState } from "react";
import { QuizIcon } from "./QuizIcon.jsx";
import SubjectSelect from "./SubjectSelect.jsx";

const normalizeSearchText = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es");

function CardActionIcon({ name }) {
  const paths = {
    continue: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    export: <><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6h14v-6" /></>,
    rename: <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12.5 7.5 4 4" /></>,
    duplicate: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    delete: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="m6 7 1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
  };

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function QuizCard({ quiz, onOpen, onPlay, onRename, onDuplicate, onDelete, onExport }) {
  const isReady = quiz.status === "ready";

  return (
    <article className="quiz-library-card">
      <div className="quiz-library-card__top">
        <span className={`quiz-status ${quiz.status === "ready" ? "is-ready" : ""}`}>{quiz.status === "ready" ? "Listo" : "Borrador"}</span>
      </div>
      <div className="quiz-library-card__identity">
        <span className="quiz-library-card__icon"><QuizIcon iconId={quiz.iconId} size={27} /></span>
        <div>
          <h3>{quiz.title}</h3>
          <p>{quiz.description || "Sin descripción todavía."}</p>
        </div>
      </div>
      <div className="quiz-library-card__footer">
        <span>{quiz.questions.length} preguntas</span>
        <button type="button" onClick={() => isReady ? onPlay(quiz) : onOpen(quiz)}>
          <CardActionIcon name={isReady ? "play" : "continue"} />
          {isReady ? "Jugar" : "Continuar"}
        </button>
      </div>
      <div className="quiz-library-card__actions">
        <button type="button" onClick={() => onExport(quiz)}><CardActionIcon name="export" />Exportar</button>
        {isReady ? (
          <button type="button" onClick={() => onOpen(quiz)}><CardActionIcon name="rename" />Editar</button>
        ) : (
          <button type="button" onClick={() => onRename(quiz)}><CardActionIcon name="rename" />Renombrar</button>
        )}
        <button type="button" onClick={() => onDuplicate(quiz)}><CardActionIcon name="duplicate" />Duplicar</button>
        <button type="button" className="is-danger" onClick={() => onDelete(quiz)}><CardActionIcon name="delete" />Eliminar</button>
      </div>
    </article>
  );
}

function QuizGroup({ title, description, quizzes, ...actions }) {
  if (!quizzes.length) return null;

  return (
    <section className="quiz-library-group">
      <div className="quiz-library-group__heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{quizzes.length}</span>
      </div>
      <div className="quiz-library-grid">
        {quizzes.map((quiz) => <QuizCard quiz={quiz} key={quiz.id} {...actions} />)}
      </div>
    </section>
  );
}

function QuizLibrary({ quizzes, onCreate, onOpen, onPlay, onRename, onDuplicate, onDelete, onExport }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("all");

  const filteredQuizzes = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery.trim());
    return quizzes.filter((quiz) => {
      const matchesName = !normalizedQuery || normalizeSearchText(quiz.title).includes(normalizedQuery);
      const matchesIcon = selectedIcon === "all" || quiz.iconId === selectedIcon;
      return matchesName && matchesIcon;
    });
  }, [quizzes, searchQuery, selectedIcon]);

  if (!quizzes.length) {
    return (
      <div className="empty-library">
        <div className="empty-library__illustration"><span>?</span><i>✓</i></div>
        <div><h3>Aquí vivirán tus quizzes</h3><p>Crea tu primer banco de preguntas y vuelve a practicarlo siempre que quieras.</p></div>
        <button className="secondary-button" type="button" onClick={onCreate}>Nuevo quiz</button>
      </div>
    );
  }

  const readyQuizzes = filteredQuizzes.filter((quiz) => quiz.status === "ready");
  const draftQuizzes = filteredQuizzes.filter((quiz) => quiz.status !== "ready");
  const actions = { onOpen, onPlay, onRename, onDuplicate, onDelete, onExport };
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedIcon("all");
  };

  return (
    <>
      <div className="quiz-library-filters">
        <label className="quiz-library-search">
          <span>Buscar por nombre</span>
          <div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Escribe el nombre del quiz" />
          </div>
        </label>
        <SubjectSelect value={selectedIcon} onChange={setSelectedIcon} includeAll label="Materia" />
        <span className="quiz-library-result-count">{filteredQuizzes.length} {filteredQuizzes.length === 1 ? "resultado" : "resultados"}</span>
      </div>

      {filteredQuizzes.length ? (
        <div className="quiz-library-groups">
          <QuizGroup title="Listos para jugar" description="Quizzes completos y validados." quizzes={readyQuizzes} {...actions} />
          <QuizGroup title="Borradores" description="Continúa trabajando donde lo dejaste." quizzes={draftQuizzes} {...actions} />
        </div>
      ) : (
        <div className="quiz-library-no-results">
          <QuizIcon iconId={selectedIcon === "all" ? undefined : selectedIcon} size={30} />
          <strong>No encontramos quizzes con esos filtros</strong>
          <p>Prueba con otro nombre o selecciona una materia diferente.</p>
          <button type="button" onClick={clearFilters}>Limpiar filtros</button>
        </div>
      )}
    </>
  );
}

export default QuizLibrary;
