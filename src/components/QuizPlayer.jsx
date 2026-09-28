import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES } from "../domain/quizConstants.js";
import { getRaceTimeForQuestion } from "../domain/gameModes.js";
import { calculateScore, evaluateQuestionAnswer, prepareQuizForPlay } from "../domain/quizGameplay.js";
import { QuizIcon } from "./QuizIcon.jsx";

const modeLabels = {
  [GAME_MODES.CLASSIC]: "Clásico",
  [GAME_MODES.LIVES]: "Vidas",
  [GAME_MODES.CHECKPOINT]: "Punto de control",
  [GAME_MODES.RACE]: "Carrera",
};

const questionTypeLabels = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Selección múltiple",
  [QUESTION_TYPES.FILL_BLANK]: "Completar",
  [QUESTION_TYPES.MATCHING]: "Asociar",
  [QUESTION_TYPES.SHORT_ANSWER]: "Respuesta breve",
};

const createEmptyAnswer = (question) => {
  if (question.type === QUESTION_TYPES.MATCHING) return {};
  return "";
};

function QuizPlayer({ quiz, gameMode, gameRules = {}, initialSession, onExit, onComplete, onProgress, onRetry }) {
  const restoredSession = initialSession?.quizId === quiz.id && initialSession?.gameMode === gameMode
    ? initialSession
    : null;
  const [questions] = useState(() => restoredSession?.questions ?? prepareQuizForPlay(quiz));
  const [questionIndex, setQuestionIndex] = useState(restoredSession?.questionIndex ?? 0);
  const [answer, setAnswer] = useState(() => restoredSession?.answer ?? createEmptyAnswer(questions[restoredSession?.questionIndex ?? 0]));
  const [isChecked, setIsChecked] = useState(restoredSession?.isChecked ?? false);
  const [isCorrect, setIsCorrect] = useState(restoredSession?.isCorrect ?? false);
  const [showReference, setShowReference] = useState(restoredSession?.showReference ?? false);
  const [correctAnswers, setCorrectAnswers] = useState(restoredSession?.correctAnswers ?? 0);
  const [lives, setLives] = useState(restoredSession?.lives ?? DEFAULT_GAME_RULES.lives.initialLives);
  const [lostLifeIndex, setLostLifeIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(() => (
    restoredSession?.timeLeft ?? (gameMode === GAME_MODES.CHECKPOINT
      ? gameRules.initialSeconds ?? DEFAULT_GAME_RULES.checkpoint.initialSeconds
      : getRaceTimeForQuestion(questions[0], gameRules.secondsByQuestionType))
  ));
  const [isFinished, setIsFinished] = useState(false);
  const completionSent = useRef(false);
  const clockSoundRef = useRef(null);
  const loseLifeSoundRef = useRef(null);
  const clockAlertQuestionRef = useRef(null);
  const lifePopTimerRef = useRef(null);
  const currentQuestion = questions[questionIndex];
  const score = calculateScore(correctAnswers, questions.length);

  const finish = useCallback(() => setIsFinished(true), []);

  useEffect(() => {
    const clockSound = new Audio("/sounds/gameplay/clock.mp3");
    const loseLifeSound = new Audio("/sounds/gameplay/lose-life.mp3");
    clockSound.preload = "auto";
    loseLifeSound.preload = "auto";
    clockSound.volume = 0.6;
    loseLifeSound.volume = 0.68;
    clockSoundRef.current = clockSound;
    loseLifeSoundRef.current = loseLifeSound;

    return () => {
      window.clearTimeout(lifePopTimerRef.current);
      clockSound.pause();
      loseLifeSound.pause();
      clockSoundRef.current = null;
      loseLifeSoundRef.current = null;
    };
  }, []);

  const checkAnswer = useCallback((forcedAnswer = answer) => {
    if (isChecked || isFinished) return;
    const result = evaluateQuestionAnswer(currentQuestion, forcedAnswer);
    setAnswer(forcedAnswer);
    setIsCorrect(result);
    setIsChecked(true);
    if (result) {
      setCorrectAnswers((value) => value + 1);
      if (gameMode === GAME_MODES.CHECKPOINT) {
        setTimeLeft((value) => value + (gameRules.correctBonusSeconds ?? DEFAULT_GAME_RULES.checkpoint.correctBonusSeconds));
      }
    } else {
      if (gameMode === GAME_MODES.LIVES) {
        const nextLives = Math.max(0, lives - 1);
        setLives(nextLives);
        setLostLifeIndex(nextLives);
        window.clearTimeout(lifePopTimerRef.current);
        lifePopTimerRef.current = window.setTimeout(() => setLostLifeIndex(null), 520);
        const loseLifeSound = loseLifeSoundRef.current;
        if (loseLifeSound) {
          loseLifeSound.currentTime = 0;
          loseLifeSound.play().catch(() => {});
        }
      }
      if (gameMode === GAME_MODES.CHECKPOINT) {
        setTimeLeft((value) => Math.max(0, value - (gameRules.incorrectPenaltySeconds ?? DEFAULT_GAME_RULES.checkpoint.incorrectPenaltySeconds)));
      }
    }
  }, [answer, currentQuestion, gameMode, gameRules.correctBonusSeconds, gameRules.incorrectPenaltySeconds, isChecked, isFinished, lives]);

  useEffect(() => {
    if (isFinished || isChecked || ![GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode)) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => checkAnswer(createEmptyAnswer(currentQuestion)), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [checkAnswer, currentQuestion, gameMode, isChecked, isFinished]);

  useEffect(() => {
    const isTimedMode = [GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode);
    if (!isTimedMode || isChecked || isFinished || timeLeft <= 0 || timeLeft > 3) return;
    if (clockAlertQuestionRef.current === questionIndex) return;
    clockAlertQuestionRef.current = questionIndex;
    const clockSound = clockSoundRef.current;
    if (!clockSound) return;
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
  }, [gameMode, isChecked, isFinished, questionIndex, timeLeft]);

  useEffect(() => {
    if (!isChecked && !isFinished) return;
    const clockSound = clockSoundRef.current;
    if (!clockSound) return;
    clockSound.pause();
    clockSound.currentTime = 0;
  }, [isChecked, isFinished]);

  useEffect(() => {
    if (isChecked && gameMode === GAME_MODES.LIVES && lives === 0) finish();
    if (isChecked && gameMode === GAME_MODES.CHECKPOINT && timeLeft === 0) finish();
  }, [finish, gameMode, isChecked, lives, timeLeft]);

  useEffect(() => {
    if (!isFinished || completionSent.current) return;
    completionSent.current = true;
    onComplete({
      correctAnswers,
      totalQuestions: questions.length,
      score: calculateScore(correctAnswers, questions.length),
      gameMode,
    });
  }, [correctAnswers, gameMode, isFinished, onComplete, questions.length]);

  useEffect(() => {
    if (isFinished) return;
    onProgress({
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizIconId: quiz.iconId,
      gameMode,
      gameRules,
      questions,
      questionIndex,
      answer,
      isChecked,
      isCorrect,
      showReference,
      correctAnswers,
      lives,
      timeLeft,
    });
  }, [answer, correctAnswers, gameMode, gameRules, isChecked, isCorrect, isFinished, lives, onProgress, questionIndex, questions, quiz.iconId, quiz.id, quiz.title, showReference, timeLeft]);

  const canSubmit = currentQuestion.type === QUESTION_TYPES.MATCHING
    ? currentQuestion.leftItems.every((item) => answer[item.id])
    : Boolean(String(answer).trim());

  const goNext = () => {
    if (questionIndex >= questions.length - 1) {
      finish();
      return;
    }
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setAnswer(createEmptyAnswer(questions[nextIndex]));
    setIsChecked(false);
    setIsCorrect(false);
    setShowReference(false);
    if (gameMode === GAME_MODES.RACE) setTimeLeft(getRaceTimeForQuestion(questions[nextIndex], gameRules.secondsByQuestionType));
  };

  if (isFinished) {
    return (
      <section className="quiz-result" aria-labelledby="quiz-result-title">
        <div className="quiz-result__mark"><QuizIcon iconId={quiz.iconId} size={38} /></div>
        <span className="eyebrow">Partida terminada</span>
        <h2 id="quiz-result-title">{score}%</h2>
        <strong>{score >= 80 ? "¡Excelente trabajo!" : score >= 60 ? "Vas por buen camino" : "Sigamos practicando"}</strong>
        <p>Acertaste {correctAnswers} de {questions.length} preguntas en modo {modeLabels[gameMode]}.</p>
        <div className="quiz-result__actions">
          <button type="button" className="quiz-play-secondary" onClick={onExit}>Volver a la biblioteca</button>
          <button type="button" className="quiz-play-primary" onClick={onRetry}>Volver a intentar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="quiz-play" aria-labelledby="quiz-play-question">
      <header className="quiz-play__topbar">
        <button type="button" onClick={onExit}>← Salir</button>
        <div>
          <strong>{quiz.title}</strong>
          <span>{modeLabels[gameMode]}</span>
        </div>
        <div className="quiz-play__status">
          {gameMode === GAME_MODES.LIVES && (
            <span className="quiz-play__lives" aria-label={`${lives} vidas`}>
              {Array.from({ length: DEFAULT_GAME_RULES.lives.initialLives }, (_, index) => (
                <svg className={`${index < lives ? "is-active" : ""} ${index === lostLifeIndex ? "is-lost" : ""}`} width="20" height="20" viewBox="0 0 24 24" key={index} aria-hidden="true">
                  <path d="M20.8 4.7a5.4 5.4 0 0 0-7.7 0L12 5.8l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.4 5.4 0 0 0 0-7.7Z" />
                </svg>
              ))}
            </span>
          )}
          {[GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode) && (
            <span className="quiz-play__timer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9 2h6M12 5V2" />
              </svg>
              {timeLeft}s
            </span>
          )}
        </div>
      </header>

      <div className="quiz-play__progress-row" aria-label={`Pregunta ${questionIndex + 1} de ${questions.length}`}>
        <div className="quiz-play__progress">
          <span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <strong>{questionIndex + 1} / {questions.length}</strong>
      </div>

      <article className="quiz-question">
        <div className="quiz-question__meta">
          <span>Pregunta {questionIndex + 1} de {questions.length}</span>
          <span>{questionTypeLabels[currentQuestion.type]}</span>
        </div>
        <h2 id="quiz-play-question">{currentQuestion.prompt}</h2>

        {currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE && (
          <div className="quiz-answer-options">
            {currentQuestion.options.map((option, index) => (
              <button
                className={`${answer === option.id ? "is-selected" : ""} ${isChecked && option.isCorrect ? "is-correct" : ""} ${isChecked && answer === option.id && !option.isCorrect ? "is-wrong" : ""}`}
                type="button"
                key={option.id}
                disabled={isChecked}
                onClick={() => setAnswer(option.id)}
              >
                <span>{String.fromCharCode(65 + index)}</span>{option.text}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === QUESTION_TYPES.FILL_BLANK && (
          <label className="quiz-text-answer">
            <span>Tu respuesta</span>
            <input autoFocus value={answer} disabled={isChecked} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && canSubmit) checkAnswer(); }} />
          </label>
        )}

        {currentQuestion.type === QUESTION_TYPES.MATCHING && (
          <div className="quiz-matching-answer">
            {currentQuestion.leftItems.map((item) => (
              <label key={item.id}>
                <span>{item.text}</span>
                <select disabled={isChecked} value={answer[item.id] ?? ""} onChange={(event) => setAnswer((current) => ({ ...current, [item.id]: event.target.value }))}>
                  <option value="">Elige su pareja</option>
                  {currentQuestion.rightItems.map((rightItem) => <option key={rightItem.id} value={rightItem.id}>{rightItem.text}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER && (
          <div className="quiz-short-answer">
            <label className="quiz-text-answer">
              <span>Tu respuesta</span>
              <textarea rows="5" value={typeof answer === "string" ? answer : ""} disabled={showReference || isChecked} onChange={(event) => setAnswer(event.target.value)} />
            </label>
            {showReference && !isChecked && (
              <div className="quiz-reference-answer">
                <span>Respuesta de referencia</span>
                <p>{currentQuestion.referenceAnswer}</p>
                <div>
                  <button type="button" onClick={() => checkAnswer(false)}>Necesito repasarla</button>
                  <button type="button" onClick={() => checkAnswer(true)}>La tuve bien</button>
                </div>
              </div>
            )}
          </div>
        )}

        {isChecked && (
          <div className={`quiz-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
            <strong>{isCorrect ? "¡Correcto!" : "No fue la respuesta correcta"}</strong>
            {currentQuestion.explanation && <p>{currentQuestion.explanation}</p>}
          </div>
        )}

        <div className="quiz-question__actions">
          {!isChecked && currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER ? (
            <button className="quiz-play-primary" type="button" disabled={!canSubmit || showReference} onClick={() => setShowReference(true)}>Comparar respuesta</button>
          ) : !isChecked ? (
            <button className="quiz-play-primary" type="button" disabled={!canSubmit} onClick={() => checkAnswer()}>Comprobar</button>
          ) : (
            <button className="quiz-play-primary" type="button" onClick={goNext}>{questionIndex === questions.length - 1 ? "Ver resultado" : "Siguiente"} →</button>
          )}
        </div>
      </article>
    </section>
  );
}

export default QuizPlayer;
