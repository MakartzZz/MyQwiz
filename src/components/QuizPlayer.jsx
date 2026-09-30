import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_GAME_RULES, GAME_MODES, QUESTION_TYPES } from "../domain/quizConstants.js";
import { getRaceTimeForQuestion } from "../domain/gameModes.js";
import { calculateScore, calculateShortAnswerSimilarity, evaluateQuestionAnswer, prepareQuizForPlay } from "../domain/quizGameplay.js";
import { playBufferedSound, stopBufferedSound } from "../services/soundBuffer.js";
import { canPlayGameplaySounds, getSoundScale, readUserPreferences } from "../services/userPreferences.js";
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

const questionTypeOrder = [
  QUESTION_TYPES.MULTIPLE_CHOICE,
  QUESTION_TYPES.TRUE_FALSE,
  QUESTION_TYPES.FILL_BLANK,
  QUESTION_TYPES.MATCHING,
  QUESTION_TYPES.SHORT_ANSWER,
];

const RESULT_REVEAL_IMPACT_DELAY = 1525;

const createEmptyAnswer = (question) => {
  if (question.type === QUESTION_TYPES.MATCHING) return {};
  return "";
};

const gameSoundPaths = {
  clock: "/sounds/gameplay/clock.mp3",
  loseLife: "/sounds/gameplay/lose-life.mp3",
  correct: "/sounds/gameplay/correct-answer.mp3",
  wrong: "/sounds/gameplay/bad-answer.mp3",
  next: "/sounds/gameplay/next-question.mp3",
  resultCombo: "/sounds/results/combo.mp3",
  resultComboLose: "/sounds/results/combo-lose.mp3",
  resultDrumroll: "/sounds/results/drumroll.mp3",
  resultReveal: "/sounds/results/reveal.mp3",
};

const playGameSound = (path, volume) => {
  if (!path || !canPlayGameplaySounds()) return null;
  return playBufferedSound(path, { volume: Math.min(1, volume * getSoundScale()) });
};

const directionForKey = (key) => ({
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
}[key.toLowerCase()]);

const focusSpatialOption = (refs, currentIndex, direction) => {
  const options = refs.current
    .map((element, index) => ({ element, index }))
    .filter(({ element }) => element && !element.disabled);
  const current = refs.current[currentIndex];
  if (!current || options.length < 2) return;

  const currentRect = current.getBoundingClientRect();
  const currentCenter = {
    x: currentRect.left + (currentRect.width / 2),
    y: currentRect.top + (currentRect.height / 2),
  };
  const isHorizontal = direction === "left" || direction === "right";
  const sign = direction === "right" || direction === "down" ? 1 : -1;
  const axis = isHorizontal ? "x" : "y";
  const crossAxis = isHorizontal ? "y" : "x";
  const measured = options
    .filter(({ index }) => index !== currentIndex)
    .map(({ element, index }) => {
      const rect = element.getBoundingClientRect();
      const center = { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
      return {
        element,
        index,
        center,
        forward: (center[axis] - currentCenter[axis]) * sign,
        crossDistance: Math.abs(center[crossAxis] - currentCenter[crossAxis]),
      };
    });

  let candidates = measured.filter(({ forward }) => forward > 4);
  if (!candidates.length) {
    const edge = sign > 0
      ? Math.min(...measured.map(({ center }) => center[axis]))
      : Math.max(...measured.map(({ center }) => center[axis]));
    candidates = measured.filter(({ center }) => Math.abs(center[axis] - edge) < 4);
  }

  candidates.sort((first, second) => (
    (Math.max(0, first.forward) + (first.crossDistance * 1.8))
    - (Math.max(0, second.forward) + (second.crossDistance * 1.8))
  ));
  candidates[0]?.element.focus();
};

function QuizPlayer({ quiz, theme, gameMode, gameRules = {}, initialSession, onExit, onComplete, onProgress, onRetry, exitLabel = "Volver a la biblioteca", recordsScore = true }) {
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
  const [correctAnswersByType, setCorrectAnswersByType] = useState(restoredSession?.correctAnswersByType ?? {});
  const [lives, setLives] = useState(restoredSession?.lives ?? DEFAULT_GAME_RULES.lives.initialLives);
  const [lostLifeIndex, setLostLifeIndex] = useState(null);
  const [timeLeft, setTimeLeft] = useState(() => (
    restoredSession?.timeLeft ?? (gameMode === GAME_MODES.CHECKPOINT
      ? gameRules.initialSeconds ?? DEFAULT_GAME_RULES.checkpoint.initialSeconds
      : getRaceTimeForQuestion(questions[0], gameRules.secondsByQuestionType))
  ));
  const [isFinished, setIsFinished] = useState(false);
  const [resultStage, setResultStage] = useState("counting");
  const [revealedCorrectByType, setRevealedCorrectByType] = useState({});
  const [activeResultType, setActiveResultType] = useState(null);
  const [penalizedResultType, setPenalizedResultType] = useState(null);
  const [resultImpact, setResultImpact] = useState(false);
  const completionSent = useRef(false);
  const previousBestScore = useRef(Number.isFinite(quiz.stats?.bestScore) ? quiz.stats.bestScore : null);
  const clockSoundRef = useRef(null);
  const clockAlertQuestionRef = useRef(null);
  const lifePopTimerRef = useRef(null);
  const sequenceTimersRef = useRef(new Set());
  const resultSoundHandlesRef = useRef(new Set());
  const comboSoundRef = useRef(null);
  const multipleChoiceRefs = useRef([]);
  const trueFalseRefs = useRef([]);
  const matchingLeftRefs = useRef([]);
  const matchingRightRefs = useRef([]);
  const submitButtonRef = useRef(null);
  const currentQuestion = questions[questionIndex];
  const score = calculateScore(correctAnswers, questions.length);
  const isNewBestScore = previousBestScore.current === null || score > previousBestScore.current;
  const isTiedBestScore = previousBestScore.current !== null && score === previousBestScore.current;
  const recordedBestScore = previousBestScore.current === null
    ? score
    : Math.max(previousBestScore.current, score);
  const resultBreakdown = useMemo(() => questionTypeOrder
    .map((type) => {
      const total = questions.filter((question) => question.type === type).length;
      return {
        type,
        label: questionTypeLabels[type],
        total,
        correct: Math.min(correctAnswersByType[type] ?? 0, total),
      };
    })
    .filter((item) => item.total > 0), [correctAnswersByType, questions]);
  const isPerfectResult = resultBreakdown.length > 0
    && resultBreakdown.every((item) => item.correct === item.total);
  const isTerminalGameOver = isChecked && (
    (gameMode === GAME_MODES.LIVES && lives === 0)
    || (gameMode === GAME_MODES.CHECKPOINT && timeLeft === 0)
  );

  const finish = useCallback(() => setIsFinished(true), []);

  useEffect(() => {
    return () => {
      window.clearTimeout(lifePopTimerRef.current);
      sequenceTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      sequenceTimersRef.current.clear();
      stopBufferedSound(clockSoundRef.current);
      clockSoundRef.current = null;
      resultSoundHandlesRef.current.forEach(stopBufferedSound);
      resultSoundHandlesRef.current.clear();
      comboSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stopMutedResultSounds = (event) => {
      if (event.detail?.gameplaySounds !== false) return;
      resultSoundHandlesRef.current.forEach(stopBufferedSound);
      resultSoundHandlesRef.current.clear();
      comboSoundRef.current = null;
    };
    window.addEventListener("myqwiz:preferences-change", stopMutedResultSounds);
    return () => window.removeEventListener("myqwiz:preferences-change", stopMutedResultSounds);
  }, []);

  const queueSequenceStep = useCallback((callback, delay) => {
    const timer = window.setTimeout(() => {
      sequenceTimersRef.current.delete(timer);
      callback();
    }, delay);
    sequenceTimersRef.current.add(timer);
  }, []);

  useEffect(() => {
    if (isFinished || isChecked) return undefined;
    const frame = window.requestAnimationFrame(() => {
      if (currentQuestion.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
        const selectedIndex = currentQuestion.options.findIndex((option) => option.id === answer);
        multipleChoiceRefs.current[Math.max(0, selectedIndex)]?.focus();
      } else if (currentQuestion.type === QUESTION_TYPES.TRUE_FALSE) {
        const selectedIndex = answer === false ? 1 : 0;
        trueFalseRefs.current[selectedIndex]?.focus();
      } else if (currentQuestion.type === QUESTION_TYPES.MATCHING) {
        const firstUnpairedIndex = currentQuestion.leftItems.findIndex((item) => !answer[item.id]);
        matchingLeftRefs.current[Math.max(0, firstUnpairedIndex)]?.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentQuestion.type, isChecked, isFinished, questionIndex]);

  const applyAnswerResult = useCallback((result, withSound = true, reason = "answer") => {
    setIsCorrect(result);
    setIsChecked(true);
    setFeedbackReaction(result ? "correct" : reason === "timeout" ? "timeout" : gameMode === GAME_MODES.LIVES ? "life" : "wrong");
    if (withSound) playGameSound(result ? gameSoundPaths.correct : gameSoundPaths.wrong, 0.58);
    if (result) {
      setCorrectAnswers((value) => value + 1);
      setCorrectAnswersByType((value) => ({
        ...value,
        [currentQuestion.type]: (value[currentQuestion.type] ?? 0) + 1,
      }));
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
        playGameSound(gameSoundPaths.loseLife, 0.68);
      }
      if (gameMode === GAME_MODES.CHECKPOINT) {
        setTimeLeft((value) => Math.max(0, value - (gameRules.incorrectPenaltySeconds ?? DEFAULT_GAME_RULES.checkpoint.incorrectPenaltySeconds)));
      }
    }
  }, [currentQuestion.type, gameMode, gameRules.correctBonusSeconds, gameRules.incorrectPenaltySeconds, lives]);

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
        playGameSound(pairIsCorrect ? gameSoundPaths.correct : gameSoundPaths.wrong, 0.58);
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
    stopBufferedSound(clockSoundRef.current);
    clockSoundRef.current = playGameSound(gameSoundPaths.clock, 0.6);
  }, [gameMode, isChecked, isFinished, isReviewingMatching, questionIndex, timeLeft]);

  useEffect(() => {
    if (!isChecked && !isFinished && !isReviewingMatching) return;
    stopBufferedSound(clockSoundRef.current);
    clockSoundRef.current = null;
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
      correctAnswersByType,
    });
  }, [correctAnswers, correctAnswersByType, gameMode, isFinished, onComplete, questions.length]);

  useEffect(() => {
    if (!isFinished) return undefined;

    let cancelled = false;
    const timers = new Set();
    const wait = (delay) => new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        resolve();
      }, delay);
      timers.add(timer);
    });
    const playResultSound = (path, options) => {
      if (!canPlayGameplaySounds()) return null;
      const handle = playBufferedSound(path, {
        ...options,
        volume: Math.min(1, (options.volume ?? 1) * getSoundScale()),
      });
      resultSoundHandlesRef.current.add(handle);
      return handle;
    };

    const runResultSequence = async () => {
      setResultStage("counting");
      setRevealedCorrectByType({});
      setActiveResultType(null);
      setPenalizedResultType(null);
      setResultImpact(false);
      await wait(450);

      if (readUserPreferences().reduceMotion) {
        setRevealedCorrectByType(Object.fromEntries(resultBreakdown.map((item) => [item.type, item.correct])));
        for (const item of resultBreakdown) {
          if (cancelled) return;
          if (item.correct >= item.total) continue;
          setActiveResultType(item.type);
          setPenalizedResultType(item.type);
          stopBufferedSound(comboSoundRef.current);
          resultSoundHandlesRef.current.delete(comboSoundRef.current);
          comboSoundRef.current = playResultSound(gameSoundPaths.resultComboLose, { volume: 0.5 });
          await wait(480);
          setPenalizedResultType(null);
        }
        await wait(200);
      } else {
        const totalCorrect = Math.max(1, resultBreakdown.reduce((sum, item) => sum + item.correct, 0));
        const incrementDelay = Math.max(115, Math.min(280, 3000 / totalCorrect));
        let revealedCount = 0;

        for (const item of resultBreakdown) {
          if (cancelled) return;
          stopBufferedSound(comboSoundRef.current);
          resultSoundHandlesRef.current.delete(comboSoundRef.current);
          comboSoundRef.current = null;
          setActiveResultType(item.type);
          await wait(220);

          for (let value = 1; value <= item.correct; value += 1) {
            if (cancelled) return;
            revealedCount += 1;
            const progress = revealedCount / totalCorrect;
            setRevealedCorrectByType((current) => ({ ...current, [item.type]: value }));
            stopBufferedSound(comboSoundRef.current);
            resultSoundHandlesRef.current.delete(comboSoundRef.current);
            comboSoundRef.current = playResultSound(gameSoundPaths.resultCombo, {
              volume: 0.24 + (progress * 0.3),
              playbackRate: 0.9 + (progress * 0.34),
            });
            await wait(incrementDelay);
          }

          if (item.correct < item.total) {
            setPenalizedResultType(item.type);
            stopBufferedSound(comboSoundRef.current);
            resultSoundHandlesRef.current.delete(comboSoundRef.current);
            comboSoundRef.current = playResultSound(gameSoundPaths.resultComboLose, { volume: 0.5 });
            await wait(480);
            setPenalizedResultType(null);
          } else {
            await wait(260);
          }
        }
      }

      if (cancelled) return;
      setActiveResultType(null);
      stopBufferedSound(comboSoundRef.current);
      resultSoundHandlesRef.current.delete(comboSoundRef.current);
      comboSoundRef.current = null;
      setResultStage("drumroll");
      await wait(220);
      playResultSound(gameSoundPaths.resultDrumroll, { volume: 0.68 });
      await wait(2070);

      if (cancelled) return;
      setResultStage("revealed");
      playResultSound(gameSoundPaths.resultReveal, { volume: 0.72 });
      await wait(RESULT_REVEAL_IMPACT_DELAY);
      if (!cancelled) setResultImpact(true);
    };

    runResultSequence();
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      resultSoundHandlesRef.current.forEach(stopBufferedSound);
      resultSoundHandlesRef.current.clear();
      comboSoundRef.current = null;
    };
  }, [isFinished, resultBreakdown]);

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
      correctAnswersByType,
      lives,
      timeLeft,
    });
  }, [answer, correctAnswers, correctAnswersByType, gameMode, gameRules, isChecked, isCorrect, isFinished, lives, onProgress, questionIndex, questions, quiz.iconId, quiz.id, quiz.title, showReference, timeLeft]);

  const canSubmit = currentQuestion.type === QUESTION_TYPES.MATCHING
    ? !isReviewingMatching && currentQuestion.leftItems.every((item) => answer[item.id])
    : currentQuestion.type === QUESTION_TYPES.TRUE_FALSE
      ? typeof answer === "boolean"
      : Boolean(String(answer).trim());
  const shortAnswerSimilarity = currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER
    ? calculateShortAnswerSimilarity(answer, currentQuestion.referenceAnswer, currentQuestion.keywords)
    : 0;

  const goNext = useCallback(() => {
    if (questionTransition !== "idle" || isReviewingMatching) return;
    playGameSound(gameSoundPaths.next, 1);
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

  const assignMatchingPair = (rightItemId, { moveFocus = false } = {}) => {
    if (!activeMatchingItem || isChecked || isReviewingMatching) return;
    const completedItemId = activeMatchingItem;
    const nextUnpairedIndex = currentQuestion.leftItems.findIndex((item) => (
      item.id !== completedItemId && !answer[item.id]
    ));
    setAnswer((current) => {
      const nextAnswer = { ...current };
      Object.entries(nextAnswer).forEach(([leftItemId, assignedRightItemId]) => {
        if (assignedRightItemId === rightItemId) delete nextAnswer[leftItemId];
      });
      nextAnswer[activeMatchingItem] = rightItemId;
      return nextAnswer;
    });
    setActiveMatchingItem(null);
    if (moveFocus) {
      window.requestAnimationFrame(() => {
        if (nextUnpairedIndex >= 0) matchingLeftRefs.current[nextUnpairedIndex]?.focus();
        else submitButtonRef.current?.focus();
      });
    }
  };

  if (isFinished) {
    return (
      <section className={`quiz-result is-${resultStage} ${resultImpact && isPerfectResult ? "is-perfect-impact" : ""}`} aria-labelledby="quiz-result-title">
        <div className="quiz-result__mark"><QuizIcon iconId={quiz.iconId} size={38} /></div>
        <span className="eyebrow">{resultStage === "revealed" ? "Partida terminada" : "Preparando tu resultado"}</span>

        {resultStage === "revealed" ? (
          <div className="quiz-result__reveal" aria-live="polite">
            <h2 className={`${resultImpact ? "is-impact" : ""} ${resultImpact && !isPerfectResult ? "is-deduction" : ""}`} id="quiz-result-title">{resultImpact ? score : 100}%</h2>
            {resultImpact && !isPerfectResult && <span className="quiz-result__deduction" aria-label={`Se restan ${100 - score} puntos`}>−{100 - score}</span>}
            <strong>{!resultImpact ? "Resultado inicial" : score >= 80 ? "¡Excelente trabajo!" : score >= 60 ? "Vas por buen camino" : "Sigamos practicando"}</strong>
          </div>
        ) : resultStage === "drumroll" ? (
          <div className="quiz-result__suspense">
            <span aria-hidden="true"><i /><i /><i /></span>
            <h2 id="quiz-result-title">Tu nota está lista</h2>
          </div>
        ) : (
          <h2 className="quiz-result__sequence-title" id="quiz-result-title">Contemos tus aciertos</h2>
        )}

        <div className="quiz-result__breakdown" aria-label="Aciertos por tipo de pregunta">
          {resultBreakdown.map((item) => {
            const revealedValue = revealedCorrectByType[item.type] ?? 0;
            const isPerfectType = revealedValue === item.total;
            return (
              <div className={`quiz-result__type ${activeResultType === item.type ? "is-active" : ""} ${isPerfectType ? "is-perfect" : ""} ${penalizedResultType === item.type ? "is-penalized" : ""}`} key={item.type}>
                <span>{item.label}</span>
                <strong aria-label={`${revealedValue} de ${item.total} respuestas correctas`}>
                  <b key={`${item.type}-${revealedValue}`}>{revealedValue}</b><i>/ {item.total}</i>
                </strong>
              </div>
            );
          })}
        </div>

        {resultStage === "revealed" && resultImpact && (
          <div className="quiz-result__summary">
            <p>Acertaste {correctAnswers} de {questions.length} preguntas en modo {modeLabels[gameMode]}.</p>
            {recordsScore ? (
              <div className={`quiz-result__record ${isNewBestScore ? "is-new" : ""}`}>
                {isNewBestScore
                  ? `Nueva mejor nota guardada: ${recordedBestScore}%`
                  : isTiedBestScore
                    ? `Igualaste tu mejor nota: ${recordedBestScore}%`
                    : `Tu mejor nota registrada sigue siendo ${recordedBestScore}%`}
              </div>
            ) : (
              <div className="quiz-result__record">Partida rápida completada. Puedes repetirla cuando quieras.</div>
            )}
            <div className="quiz-result__actions">
              <button type="button" className="quiz-play-secondary" onClick={onExit}>{exitLabel}</button>
              <button type="button" className="quiz-play-primary" onClick={onRetry}>Volver a intentar</button>
            </div>
          </div>
        )}
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
                ref={(element) => { multipleChoiceRefs.current[index] = element; }}
                disabled={isChecked}
                aria-pressed={answer === option.id}
                onClick={() => setAnswer(option.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (answer === option.id) checkAnswer(option.id);
                    else setAnswer(option.id);
                    return;
                  }
                  const direction = directionForKey(event.key);
                  if (!direction) return;
                  event.preventDefault();
                  focusSpatialOption(multipleChoiceRefs, index, direction);
                }}
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
            ].map((option, index) => (
              <button
                className={`${answer === option.value ? "is-selected" : ""} ${isChecked && currentQuestion.correctAnswer === option.value ? "is-correct" : ""} ${isChecked && answer === option.value && currentQuestion.correctAnswer !== option.value ? "is-wrong" : ""}`}
                type="button"
                key={String(option.value)}
                ref={(element) => { trueFalseRefs.current[index] = element; }}
                disabled={isChecked}
                aria-pressed={answer === option.value}
                onClick={() => setAnswer(option.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (answer === option.value) checkAnswer(option.value);
                    else setAnswer(option.value);
                    return;
                  }
                  const direction = directionForKey(event.key);
                  if (!direction) return;
                  event.preventDefault();
                  focusSpatialOption(trueFalseRefs, index, direction);
                }}
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
          <div
            className="quiz-matching-answer"
            onKeyDown={(event) => {
              if (event.key !== " " || !canSubmit || isReviewingMatching) return;
              event.preventDefault();
              event.stopPropagation();
              checkAnswer(answer);
            }}
          >
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
                      ref={(element) => { matchingLeftRefs.current[index] = element; }}
                      disabled={isChecked || isReviewingMatching}
                      aria-pressed={activeMatchingItem === item.id}
                      onClick={() => setActiveMatchingItem((current) => current === item.id ? null : item.id)}
                      onKeyDown={(event) => {
                        if (event.key === " ") {
                          event.preventDefault();
                          return;
                        }
                        const direction = directionForKey(event.key);
                        if (direction === "up" || direction === "down") {
                          event.preventDefault();
                          focusSpatialOption(matchingLeftRefs, index, direction);
                          return;
                        }
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        setActiveMatchingItem(item.id);
                        window.requestAnimationFrame(() => {
                          const pairedRightId = answer[item.id];
                          const pairedRightIndex = currentQuestion.rightItems.findIndex((rightItem) => rightItem.id === pairedRightId);
                          matchingRightRefs.current[Math.max(0, pairedRightIndex)]?.focus();
                        });
                      }}
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
                {currentQuestion.rightItems.map((rightItem, rightIndex) => {
                  const pairedIndex = currentQuestion.leftItems.findIndex((leftItem) => answer[leftItem.id] === rightItem.id);
                  const pairedLeftItem = pairedIndex >= 0 ? currentQuestion.leftItems[pairedIndex] : null;
                  const reviewState = pairedLeftItem ? matchingReview[pairedLeftItem.id] : null;
                  return (
                    <button
                      className={`${pairedLeftItem ? "is-paired" : ""} ${activeMatchingItem ? "is-available" : ""} ${reviewState ? `is-${reviewState}` : ""}`}
                      type="button"
                      key={rightItem.id}
                      ref={(element) => { matchingRightRefs.current[rightIndex] = element; }}
                      disabled={isChecked || isReviewingMatching || !activeMatchingItem}
                      onClick={() => assignMatchingPair(rightItem.id)}
                      onKeyDown={(event) => {
                        if (event.key === " ") {
                          event.preventDefault();
                          return;
                        }
                        const direction = directionForKey(event.key);
                        if (direction === "up" || direction === "down") {
                          event.preventDefault();
                          focusSpatialOption(matchingRightRefs, rightIndex, direction);
                          return;
                        }
                        if (direction === "left" && activeMatchingItem) {
                          event.preventDefault();
                          const leftIndex = currentQuestion.leftItems.findIndex((item) => item.id === activeMatchingItem);
                          matchingLeftRefs.current[leftIndex]?.focus();
                          return;
                        }
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        assignMatchingPair(rightItem.id, { moveFocus: true });
                      }}
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
                <div className="quiz-answer-similarity">
                  <div aria-label={`Similitud estimada: ${shortAnswerSimilarity}%`}><span>Similitud</span><strong>{shortAnswerSimilarity}%</strong><small>Solo como orientación</small></div>
                </div>
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
            <button ref={submitButtonRef} className="quiz-play-primary" type="button" disabled={!canSubmit || showReference} onClick={() => setShowReference(true)}>Comparar respuesta</button>
          ) : !isChecked ? (
            <button ref={submitButtonRef} className="quiz-play-primary" type="button" data-button-sound="gameplay" disabled={!canSubmit || isReviewingMatching} onClick={() => checkAnswer()}>{isReviewingMatching ? "Revisando…" : "Comprobar"}</button>
          ) : (
            <button ref={submitButtonRef} className="quiz-play-primary" type="button" data-button-sound="gameplay" disabled={questionTransition !== "idle" || isTerminalGameOver} onClick={goNext}>
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
