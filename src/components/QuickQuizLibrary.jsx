import { Dices, Play, Search } from "lucide-react";
import { useMemo } from "react";
import { QuizIcon, quizIconOptions } from "./QuizIcon.jsx";
import SubjectSelect from "./SubjectSelect.jsx";

const normalizeText = (value) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es");

function QuickQuizLibrary({ quizzes, onPlay, onDraw, selectedCategory, searchQuery, onCategoryChange, onSearchQueryChange }) {
  const filteredQuizzes = useMemo(() => {
    const query = normalizeText(searchQuery.trim());
    return quizzes.filter((quiz) => {
      const matchesCategory = selectedCategory === "all" || quiz.iconId === selectedCategory;
      const matchesSearch = !query || normalizeText(`${quiz.title} ${quiz.description}`).includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [quizzes, searchQuery, selectedCategory]);

  const groups = quizIconOptions
    .map((category) => ({
      ...category,
      quizzes: filteredQuizzes.filter((quiz) => quiz.iconId === category.id),
    }))
    .filter((category) => category.quizzes.length);

  return (
    <section className="quick-quiz-library" aria-labelledby="quick-quizzes-title">
      <div className="quick-quiz-hero">
        <div>
          <span className="eyebrow">Para probar o pasar el rato</span>
          <h2 id="quick-quizzes-title">Elige algo y juega</h2>
        </div>
        <button className="quick-quiz-draw" type="button" onClick={onDraw}>
          <Dices size={25} />
          <span><small>¿No sabes cuál elegir?</small><strong>Sorteo sorpresa</strong></span>
        </button>
      </div>

      <div className="quiz-library-filters quick-quiz-filters">
        <label className="quiz-library-search">
          <span>Buscar</span>
          <div><Search size={17} /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tema o título" /></div>
        </label>
        <SubjectSelect value={selectedCategory} onChange={onCategoryChange} includeAll label="Materia" />
        <span className="quiz-library-result-count">{filteredQuizzes.length} quizzes</span>
      </div>

      {groups.length ? (
        <div className="quick-quiz-groups">
          {groups.map((group) => (
            <section className="quick-quiz-group" key={group.id} aria-labelledby={`quick-group-${group.id}`}>
              <div className="quick-quiz-group__heading">
                <span><QuizIcon iconId={group.id} size={23} /></span>
                <div><h3 id={`quick-group-${group.id}`}>{group.label}</h3><p>Cinco retos rápidos de dificultad progresiva.</p></div>
              </div>
              <div className="quick-quiz-grid">
                {group.quizzes.map((quiz) => (
                  <article className="quick-quiz-card" key={quiz.id}>
                    <div className="quick-quiz-card__top">
                      <span className="quick-quiz-card__icon"><QuizIcon iconId={quiz.iconId} size={25} /></span>
                      <span className={`quick-quiz-difficulty is-${quiz.difficulty.toLowerCase()}`}>{quiz.difficulty}</span>
                    </div>
                    <div className="quick-quiz-card__copy">
                      <h4>{quiz.title}</h4>
                      <p>{quiz.description}</p>
                    </div>
                    <div className="quick-quiz-card__footer">
                      <div className="quick-quiz-card__meta">
                        <span>{quiz.questions.length} preguntas</span>
                        {Number.isFinite(quiz.stats?.bestScore) && (
                          <strong className={quiz.stats.bestScore === 100 ? "is-perfect" : ""} aria-label={`Mejor nota: ${quiz.stats.bestScore}%`}>{quiz.stats.bestScore}%</strong>
                        )}
                      </div>
                      <button type="button" onClick={() => onPlay(quiz)} aria-label={`Jugar ${quiz.title}`}><Play size={17} fill="currentColor" /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="quiz-library-no-results"><Search size={28} /><strong>No encontramos quizzes</strong><p>Prueba con otra materia o búsqueda.</p></div>
      )}
    </section>
  );
}

export default QuickQuizLibrary;

