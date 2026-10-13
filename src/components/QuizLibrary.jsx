import { useMemo, useState } from "react";
import QuestionTypeSummary from "./QuestionTypeSummary.jsx";
import { QuizIcon } from "./QuizIcon.jsx";
import SubjectSelect from "./SubjectSelect.jsx";

const normalizeSearchText = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es");

function CardActionIcon({ name }) {
  const paths = {
    play: <path d="m8 5 11 7-11 7V5Z" />,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4" /><path d="m8.6 13.5 6.8 4" /></>,
    rename: <><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12.5 7.5 4 4" /></>,
    duplicate: <><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></>,
    merge: <><path d="M4 6h4c5 0 4 12 9 12h3" /><path d="m17 15 3 3-3 3" /><path d="M4 18h4c2.2 0 3.2-2.3 4.1-5" /><path d="M16 6h4" /><path d="m17 3 3 3-3 3" /></>,
    delete: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="m6 7 1 13h10l1-13" /><path d="M10 11v5M14 11v5" /></>,
  };

  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function QuizCard({ quiz, canMerge, onOpen, onPlay, onDuplicate, onMerge, onDelete, onExport }) {
  const bestScore = Number.isFinite(quiz.stats?.bestScore) ? quiz.stats.bestScore : null;
  const questionCount = quiz.questionCount ?? quiz.questions?.length ?? 0;
  const ownerName = quiz.isShared ? (quiz.ownerProfile?.username ?? "Usuario") : "TÚ";

  const actionButton = (label, icon, onClick, className = "") => (
    <button className={className} type="button" onClick={onClick} aria-label={label} title={label}>
      <CardActionIcon name={icon} />
    </button>
  );

  return (
    <article className="quiz-library-card">
      <div className="quiz-library-card__info">
        <div className="quiz-library-card__top">
          <div className="quiz-library-card__metrics">
            <span className="quiz-meta-badge quiz-owner-badge" title={ownerName}>
              <small>Propietario</small>
              <strong>{ownerName}</strong>
            </span>
            <span className={`quiz-meta-badge quiz-best-score ${bestScore === null ? "is-empty" : ""}`}>
              <small>Mejor nota</small>
              <strong>{bestScore === null ? "—" : `${bestScore}%`}</strong>
            </span>
          </div>
        </div>

        <div className="quiz-library-card__identity">
          <span className="quiz-library-card__icon"><QuizIcon iconId={quiz.iconId} size={27} /></span>
          <div>
            <h3>{quiz.title}</h3>
            <p>{quiz.description || "Sin descripción todavía."}</p>
          </div>
        </div>

        <QuestionTypeSummary quiz={quiz} className="quiz-library-card__types" emptyLabel="Sin preguntas todavía" />

        <div className="quiz-library-card__controls">
          <span>{questionCount} {questionCount === 1 ? "pregunta" : "preguntas"}</span>
          <div className="quiz-library-card__actions">
            {actionButton("Compartir quiz", "share", () => onExport(quiz))}
            {actionButton(quiz.isShared ? "Crear copia para editar" : "Editar quiz", "rename", () => onOpen(quiz))}
            {actionButton("Duplicar quiz", "duplicate", () => onDuplicate(quiz))}
            <button type="button" onClick={() => onMerge(quiz)} aria-label="Fusionar quiz" title="Fusionar quiz" disabled={!canMerge}>
              <CardActionIcon name="merge" />
            </button>
            {actionButton(quiz.isShared ? "Quitar de mi biblioteca" : "Eliminar quiz", "delete", () => onDelete(quiz), "is-danger")}
            {actionButton("Jugar quiz", "play", () => onPlay(quiz), "is-primary is-play")}
          </div>
        </div>
      </div>
    </article>
  );
}

function QuizLibrary({ quizzes, onOpen, onPlay, onDuplicate, onMerge, onDelete, onExport }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("all");
  const [ownershipFilter, setOwnershipFilter] = useState("all");

  const filteredQuizzes = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery.trim());
    return quizzes.filter((quiz) => {
      const matchesName = !normalizedQuery || normalizeSearchText(quiz.title).includes(normalizedQuery);
      const matchesIcon = selectedIcon === "all" || quiz.iconId === selectedIcon;
      const matchesOwnership = ownershipFilter === "all"
        || (ownershipFilter === "owned" && !quiz.isShared)
        || (ownershipFilter === "shared" && quiz.isShared);
      return matchesName && matchesIcon && matchesOwnership;
    });
  }, [quizzes, ownershipFilter, searchQuery, selectedIcon]);

  if (!quizzes.length) {
    return (
      <div className="empty-library">
        <div className="empty-library__illustration"><span>?</span><i>✓</i></div>
        <h3>Aquí vivirán tus quizzes</h3>
        <p>Crea tu primer banco de preguntas y vuelve a practicarlo siempre que quieras.</p>
      </div>
    );
  }

  const actions = { canMerge: quizzes.length > 1, onOpen, onPlay, onDuplicate, onMerge, onDelete, onExport };
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedIcon("all");
    setOwnershipFilter("all");
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
        <fieldset className="quiz-library-ownership">
          <legend>Propiedad</legend>
          <div>
            <button className={ownershipFilter === "all" ? "is-active" : ""} type="button" onClick={() => setOwnershipFilter("all")} aria-pressed={ownershipFilter === "all"}>Todos</button>
            <button className={ownershipFilter === "owned" ? "is-active" : ""} type="button" onClick={() => setOwnershipFilter("owned")} aria-pressed={ownershipFilter === "owned"}>Propios</button>
            <button className={ownershipFilter === "shared" ? "is-active" : ""} type="button" onClick={() => setOwnershipFilter("shared")} aria-pressed={ownershipFilter === "shared"} aria-label="Compartidos conmigo" title="Compartidos conmigo">Compartidos</button>
          </div>
        </fieldset>
        <span className="quiz-library-result-count">{filteredQuizzes.length} {filteredQuizzes.length === 1 ? "resultado" : "resultados"}</span>
      </div>

      {filteredQuizzes.length ? (
        <div className="quiz-library-grid">
          {filteredQuizzes.map((quiz) => <QuizCard quiz={quiz} key={quiz.id} {...actions} />)}
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
