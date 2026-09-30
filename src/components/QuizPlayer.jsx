import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES } from "../domain/quizConstants.js";
import { getRaceTimeForQuestion } from "../domain/gameModes.js";
import { calculateScore, evaluateQuestionAnswer, prepareQuizForPlay } from "../domain/quizGameplay.js";
import { canPlayGameplaySounds, getSoundScale } from "../services/userPreferences.js";
import GameFeedbackReaction from "./GameFeedbackReaction.jsx";
import { QuizIcon } from "./QuizIcon.jsx";

const modeLabels = {
  [GAME_MODES.CLASSIC]: "Clásico",
  [GAME_MODES.LIVES]: "Vidas",
  [GAME_MODES.CHECKPOINT]: "Punto de control",
  [GAME_MODES.RACE]: "Carrera",
};

const questionTypeLabels = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Selección múltiple",
  [QUESTION_TYPES.TRUE_FALSE]: "Verdadero o falso",
  [QUESTION_TYPES.FILL_BLANK]: "Completar",
  [QUESTION_TYPES.MATCHING]: "Asociar",
  [QUESTION_TYPES.SHORT_ANSWER]: "Respuesta breve",
};

const createEmptyAnswer = (question) => {
  if (question.type === QUESTION_TYPES.MATCHING) return {};
  return "";
};

const playGameSound = (sound) => {
  if (!sound || !canPlayGameplaySounds()) return;
  const playback = sound.cloneNode();
  playback.volume = Math.min(1, sound.volume * getSoundScale());
  playback.play().catch(() => {});
};

function QuizPlayer({ quiz, theme, gameMode, gameRules = {}, initialSession, onExit, onComplete, onProgress, onRetry }) {
  const restoredSession = initialSession?.quizId === quiz.id && initialSession?.gameMode === gameMode
    ? initialSession
    : null;
  const [questions] = useState(() => restoredSession?.questions ?? prepareQuizForPlay(quiz));
  const [questionIndex, setQuestionIndex] = useState(restoredSession?.questionIndex ?? 0);
  const [answer, setAnswer] = useState(() => restoredSession?.answer ?? createEmptyAnswer(questions[restoredSession?.questionIndex ?? 0]));
  const [isChecked, setIsChecked] = useState(restoredSession?.isChecked ?? false);
  const [isCorrect, setIsCorrect] = useState(restoredSession?.isCorrect ?? false);
  const [feedbackReaction, setFeedbackReaction] = useState(() => (
    restoredSession?.isChecked ? (restoredSession.isCorrect ? "correct" : "wrong") : null
  ));
  const [isReviewingMatching, setIsReviewingMatching] = useState(false);
  const [activeMatchingItem, setActiveMatchingItem] = useState(null);
  const [matchingReview, setMatchingReview] = useState(() => {
    const restoredQuestion = questions[restoredSession?.questionIndex ?? 0];
    if (!restoredSession?.isChecked || restoredQuestion?.type !== QUESTION_TYPES.MATCHING) return {};
    return Object.fromEntries(restoredQuestion.leftItems.map((item) => [
      item.id,
      restoredSession.answer?.[item.id] === item.id ? "correct" : "wrong",
    ]));
  });
  const [questionTransition, setQuestionTransition] = useState("idle");
  const [automaticNextSeconds, setAutomaticNextSeconds] = useState(null);
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
  const previousBestScore = useRef(Number.isFinite(quiz.stats?.bestScore) ? quiz.stats.bestScore : null);
  const clockSoundRef = useRef(null);
  const loseLifeSoundRef = useRef(null);
  const correctAnswerSoundRef = useRef(null);
  const badAnswerSoundRef = useRef(null);
  const nextQuestionSoundRef = useRef(null);
  const clockAlertQuestionRef = useRef(null);
  const lifePopTimerRef = useRef(null);
  const sequenceTimersRef = useRef(new Set());
  const currentQuestion = questions[questionIndex];
  const score = calculateScore(correctAnswers, questions.length);
  const isNewBestScore = previousBestScore.current === null || score > previousBestScore.current;
  const isTiedBestScore = previousBestScore.current !== null && score === previousBestScore.current;
  const recordedBestScore = previousBestScore.current === null
    ? score
    : Math.max(previousBestScore.current, score);
  const isTerminalGameOver = isChecked && (
    (gameMode === GAME_MODES.LIVES && lives === 0)
    || (gameMode === GAME_MODES.CHECKPOINT && timeLeft === 0)
  );

  const finish = useCallback(() => setIsFinished(true), []);

  useEffect(() => {
    const clockSound = new Audio("/sounds/gameplay/clock.mp3");
    const loseLifeSound = new Audio("/sounds/gameplay/lose-life.mp3");
    const correctAnswerSound = new Audio("/sounds/gameplay/correct-answer.mp3");
    const badAnswerSound = new Audio("/sounds/gameplay/bad-answer.mp3");
    const nextQuestionSound = new Audio("/sounds/gameplay/next-question.mp3");
    [clockSound, loseLifeSound, correctAnswerSound, badAnswerSound, nextQuestionSound].forEach((sound) => {
      sound.preload = "auto";
    });
    clockSound.volume = 0.6;
    loseLifeSound.volume = 0.68;
    correctAnswerSound.volume = 0.58;
    badAnswerSound.volume = 0.58;
    nextQuestionSound.volume = 1;
    clockSoundRef.current = clockSound;
    loseLifeSoundRef.current = loseLifeSound;
    correctAnswerSoundRef.current = correctAnswerSound;
    badAnswerSoundRef.current = badAnswerSound;
    nextQuestionSoundRef.current = nextQuestionSound;

    return () => {
      window.clearTimeout(lifePopTimerRef.current);
      sequenceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      sequenceTimersRef.current.clear();
      [clockSound, loseLifeSound, correctAnswerSound, badAnswerSound, nextQuestionSound].forEach((sound) => sound.pause());
      clockSoundRef.current = null;
      loseLifeSoundRef.current = null;
      correctAnswerSoundRef.current = null;
      badAnswerSoundRef.current = null;
      nextQuestionSoundRef.current = null;
    };
  }, []);

  const queueSequenceStep = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      sequenceTimersRef.current.delete(timer);
      callback();
    }, delay);
    sequenceTimersRef.current.add(timer);
  }, []);

  const applyAnswerResult = useCallback((result, withSound = true, reason = "answer") => {
    setIsCorrect(result);
    setIsChecked(true);
    setFeedbackReaction(result ? "correct" : reason === "timeout" ? "timeout" : gameMode === GAME_MODES.LIVES ? "life" : "wrong");
    if (withSound) playGameSound(result ? correctAnswerSoundRef.current : badAnswerSoundRef.current);
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
  }, [gameMode, gameRules.correctBonusSeconds, gameRules.incorrectPenaltySeconds, lives]);

  const checkAnswer = useCallback((forcedAnswer = answer, { reason = "answer" } = {}) => {
    if (isChecked || isFinished || isReviewingMatching) return;
    const result = evaluateQuestionAnswer(currentQuestion, forcedAnswer);
    setAnswer(forcedAnswer);

    if (currentQuestion.type !== QUESTION_TYPES.MATCHING) {
      applyAnswerResult(result, true, reason);
      return;
    }

    setIsReviewingMatching(true);
    setMatchingReview({});
    currentQuestion.leftItems.forEach((item, index) => {
      const startDelay = index * 720;
      const pairIsCorrect = forcedAnswer?.[item.id] === item.id;
      queueSequenceStep(() => {
        setMatchingReview((review) => ({ ...review, [item.id]: "checking" }));
      }, startDelay);
      queueSequenceStep(() => {
        setMatchingReview((review) => ({ ...review, [item.id]: pairIsCorrect ? "correct" : "wrong" }));
        playGameSound(pairIsCorrect ? correctAnswerSoundRef.current : badAnswerSoundRef.current);
        if (index === currentQuestion.leftItems.length - 1) {
          queueSequenceStep(() => {
            setIsReviewingMatching(false);
            applyAnswerResult(result, false, reason);
          }, 420);
        }
      }, startDelay + 260);
    });
  }, [answer, applyAnswerResult, currentQuestion, isChecked, isFinished, isReviewingMatching, queueSequenceStep]);

  useEffect(() => {
    if (isFinished || isChecked || isReviewingMatching || ![GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode)) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => checkAnswer(createEmptyAnswer(currentQuestion), { reason: "timeout" }), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [checkAnswer, currentQuestion, gameMode, isChecked, isFinished, isReviewingMatching]);

  useEffect(() => {
    const isTimedMode = [GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode);
    if (!isTimedMode || isChecked || isFinished || isReviewingMatching || timeLeft <= 0 || timeLeft > 3) return;
    if (clockAlertQuestionRef.current === questionIndex) return;
    clockAlertQuestionRef.current = questionIndex;
    const clockSound = clockSoundRef.current;
    if (!clockSound) return;
    clockSound.currentTime = 0;
    clockSound.play().catch(() => {});
  }, [gameMode, isChecked, isFinished, isReviewingMatching, questionIndex, timeLeft]);

  useEffect(() => {
    if (!isChecked && !isFinished && !isReviewingMatching) return;
    const clockSound = clockSoundRef.current;
    if (!clockSound) return;
    clockSound.pause();
    clockSound.currentTime = 0;
  }, [isChecked, isFinished, isReviewingMatching]);

  useEffect(() => {
    if (!isTerminalGameOver) return undefined;
    const finishTimer = window.setTimeout(finish, 1200);
    return () => window.clearTimeout(finishTimer);
  }, [finish, isTerminalGameOver]);

  useEffect(() => {
    if (isChecked && timeLeft === 0 && [GAME_MODES.CHECKPOINT, GAME_MODES.RACE].includes(gameMode)) {
      setFeedbackReaction("timeout");
    }
  }, [gameMode, isChecked, timeLeft]);

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
    ? !isReviewingMatching && currentQuestion.leftItems.every((item) => answer[item.id])
    : currentQuestion.type === QUESTION_TYPES.TRUE_FALSE
      ? typeof answer === "boolean"
      : Boolean(String(answer).trim());

  const goNext = useCallback(() => {
    if (questionTransition !== "idle" || isReviewingMatching) return;
    playGameSound(nextQuestionSoundRef.current);
    setQuestionTransition("out");
    queueSequenceStep(() => {
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
      setMatchingReview({});
      setActiveMatchingItem(null);
      setFeedbackReaction(null);
      setQuestionTransition("in");
      if (gameMode === GAME_MODES.RACE) setTimeLeft(getRaceTimeForQuestion(questions[nextIndex], gameRules.secondsByQuestionType));
      queueSequenceStep(() => setQuestionTransition("idle"), 360);
    }, 230);
  }, [finish, gameMode, gameRules.secondsByQuestionType, isReviewingMatching, questionIndex, questionTransition, questions, queueSequenceStep]);

  useEffect(() => {
    if (!isChecked || !isCorrect || isFinished || isReviewingMatching || isTerminalGameOver || questionTransition !== "idle") {
      setAutomaticNextSeconds(null);
      return undefined;
    }
    setAutomaticNextSeconds(3);
    const countdownInterval = window.setInterval(() => {
      setAutomaticNextSeconds((seconds) => Math.max(1, seconds - 1));
    }, 1000);
    const automaticNextTimer = window.setTimeout(goNext, 3000);
    return () => {
      window.clearInterval(countdownInterval);
      window.clearTimeout(automaticNextTimer);
    };
  }, [goNext, isChecked, isCorrect, isFinished, isReviewingMatching, isTerminalGameOver, questionTransition]);

  const assignMatchingPair = (rightItemId) => {
    if (!activeMatchingItem || isChecked || isReviewingMatching) return;
    setAnswer((current) => {
      const nextAnswer = { ...current };
      Object.entries(nextAnswer).forEach(([leftItemId, assignedRightItemId]) => {
        if (assignedRightItemId === rightItemId) delete nextAnswer[leftItemId];
      });
      nextAnswer[activeMatchingItem] = rightItemId;
      return nextAnswer;
    });
    setActiveMatchingItem(null);
  };

  if (isFinished) {
    return (
      <section className="quiz-result" aria-labelledby="quiz-result-title">
        <div className="quiz-result__mark"><QuizIcon iconId={quiz.iconId} size={38} /></div>
        <span className="eyebrow">Partida terminada</span>
        <h2 id="quiz-result-title">{score}%</h2>
        <strong>{score >= 80 ? "¡Excelente trabajo!" : score >= 60 ? "Vas por buen camino" : "Sigamos practicando"}</strong>
        <p>Acertaste {correctAnswers} de {questions.length} preguntas en modo {modeLabels[gameMode]}.</p>
        <div className={`quiz-result__record ${isNewBestScore ? "is-new" : ""}`}>
          {isNewBestScore
            ? `Nueva mejor nota guardada: ${recordedBestScore}%`
            : isTiedBestScore
              ? `Igualaste tu mejor nota: ${recordedBestScore}%`
              : `Tu mejor nota registrada sigue siendo ${recordedBestScore}%`}
        </div>
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
              <svg className={timeLeft > 0 && timeLeft <= 3 && !isChecked && !isReviewingMatching ? "is-ending" : undefined} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

      <article className={`quiz-question ${questionTransition === "out" ? "is-swiping-out" : ""} ${questionTransition === "in" ? "is-swiping-in" : ""} ${isChecked && questionTransition === "idle" ? isCorrect ? "is-answer-correct" : "is-answer-wrong" : ""}`}>
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

        {currentQuestion.type === QUESTION_TYPES.TRUE_FALSE && (
          <div className="quiz-true-false-answer">
            {[
              { value: true, label: "Verdadero", mark: "V" },
              { value: false, label: "Falso", mark: "F" },
            ].map((option) => (
              <button
                className={`${answer === option.value ? "is-selected" : ""} ${isChecked && currentQuestion.correctAnswer === option.value ? "is-correct" : ""} ${isChecked && answer === option.value && currentQuestion.correctAnswer !== option.value ? "is-wrong" : ""}`}
                type="button"
                key={String(option.value)}
                disabled={isChecked}
                onClick={() => setAnswer(option.value)}
              >
                <span>{option.mark}</span>{option.label}
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
            <p className="quiz-matching-answer__hint">
              {activeMatchingItem ? "Ahora elige su pareja en la columna derecha" : "Elige un elemento de la izquierda y luego su pareja"}
            </p>
            <div className="quiz-matching-answer__board">
              <div className="quiz-matching-answer__column">
                <span className="quiz-matching-answer__heading">Elementos</span>
                {currentQuestion.leftItems.map((item, index) => {
                  const reviewState = matchingReview[item.id];
                  return (
                    <button
                      className={`${activeMatchingItem === item.id ? "is-active" : ""} ${answer[item.id] ? "is-paired" : ""} ${reviewState ? `is-${reviewState}` : ""}`}
                      type="button"
                      key={item.id}
                      disabled={isChecked || isReviewingMatching}
                      onClick={() => setActiveMatchingItem((current) => current === item.id ? null : item.id)}
                    >
                      <b>{answer[item.id] ? index + 1 : activeMatchingItem === item.id ? "?" : "·"}</b>
                      <span>{item.text}</span>
                      {reviewState && <i aria-hidden="true">{reviewState === "checking" ? "…" : reviewState === "correct" ? "✓" : "×"}</i>}
                    </button>
                  );
                })}
              </div>

              <div className="quiz-matching-answer__connector" aria-hidden="true"><span>↔</span></div>

              <div className="quiz-matching-answer__column">
                <span className="quiz-matching-answer__heading">Parejas</span>
                {currentQuestion.rightItems.map((rightItem) => {
                  const pairedIndex = currentQuestion.leftItems.findIndex((leftItem) => answer[leftItem.id] === rightItem.id);
                  const pairedLeftItem = pairedIndex >= 0 ? currentQuestion.leftItems[pairedIndex] : null;
                  const reviewState = pairedLeftItem ? matchingReview[pairedLeftItem.id] : null;
                  return (
                    <button
                      className={`${pairedLeftItem ? "is-paired" : ""} ${activeMatchingItem ? "is-available" : ""} ${reviewState ? `is-${reviewState}` : ""}`}
                      type="button"
                      key={rightItem.id}
                      disabled={isChecked || isReviewingMatching || !activeMatchingItem}
                      onClick={() => assignMatchingPair(rightItem.id)}
                    >
                      <b>{pairedIndex >= 0 ? pairedIndex + 1 : "·"}</b>
                      <span>{rightItem.text}</span>
                      {reviewState && <i aria-hidden="true">{reviewState === "checking" ? "…" : reviewState === "correct" ? "✓" : "×"}</i>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER && (
          <div className="quiz-short-answer">
            {isChecked ? (
              <div className="quiz-submitted-answer">
                <span>Respuesta registrada</span>
                <p>{typeof answer === "string" && answer.trim() ? answer : "Respuesta revisada manualmente"}</p>
              </div>
            ) : (
              <label className="quiz-text-answer">
                <span>Tu respuesta</span>
                <textarea rows="5" value={typeof answer === "string" ? answer : ""} disabled={showReference} onChange={(event) => setAnswer(event.target.value)} />
              </label>
            )}
            {showReference && !isChecked && (
              <div className="quiz-reference-answer">
                <span>Respuesta de referencia</span>
                <p>{currentQuestion.referenceAnswer}</p>
                <div>
                  <button type="button" data-button-sound="gameplay" onClick={() => applyAnswerResult(false)}>Necesito repasarla</button>
                  <button type="button" data-button-sound="gameplay" onClick={() => applyAnswerResult(true)}>La tuve bien</button>
                </div>
              </div>
            )}
          </div>
        )}

        {isChecked && currentQuestion.type !== QUESTION_TYPES.MATCHING && (
          <div className={`quiz-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
            <strong>{isCorrect ? "¡Correcto!" : "No fue la respuesta correcta"}</strong>
            {currentQuestion.explanation && <p>{currentQuestion.explanation}</p>}
          </div>
        )}

        <div className="quiz-question__actions">
          {!isChecked && currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER ? (
            <button className="quiz-play-primary" type="button" disabled={!canSubmit || showReference} onClick={() => setShowReference(true)}>Comparar respuesta</button>
          ) : !isChecked ? (
            <button className="quiz-play-primary" type="button" data-button-sound="gameplay" disabled={!canSubmit || isReviewingMatching} onClick={() => checkAnswer()}>{isReviewingMatching ? "Revisando…" : "Comprobar"}</button>
          ) : (
            <button className="quiz-play-primary" type="button" data-button-sound="gameplay" disabled={questionTransition !== "idle" || isTerminalGameOver} onClick={goNext}>
              {questionIndex === questions.length - 1 ? "Ver resultado" : "Siguiente"}
              {automaticNextSeconds && <span className="quiz-play-primary__countdown">{automaticNextSeconds}s</span>}
              →
            </button>
          )}
        </div>
      </article>
      <GameFeedbackReaction type={isChecked && questionTransition === "idle" ? feedbackReaction : null} theme={theme} />
    </section>
  );
}

export default QuizPlayer;
