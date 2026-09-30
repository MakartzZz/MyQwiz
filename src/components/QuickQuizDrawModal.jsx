import { Dices, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { playBufferedSound, stopBufferedSound } from "../services/soundBuffer.js";
import { canPlayInterfaceSounds, getSoundScale, readUserPreferences } from "../services/userPreferences.js";
import { useModalOpenSound } from "../hooks/useModalOpenSound.js";
import { QuizIcon, quizIconOptions } from "./QuizIcon.jsx";

const difficultyOrder = ["Inicial", "Fácil", "Intermedio", "Avanzado", "Experto"];

function QuickQuizDrawModal({ quiz, onCancel, onComplete }) {
  const [stage, setStage] = useState("category-spin");
  const [activeCategory, setActiveCategory] = useState(quiz?.iconId ?? "general");
  const [activeDifficulty, setActiveDifficulty] = useState(quiz?.difficulty ?? "Inicial");
  const tickSoundRef = useRef(null);
  useModalOpenSound(Boolean(quiz));

  const categoryOptions = useMemo(() => quizIconOptions.map((option) => option.id), []);
  const categoryLabel = quizIconOptions.find((option) => option.id === activeCategory)?.label ?? "General";
  const isDifficultyStage = stage.startsWith("difficulty") || stage === "complete";

  useEffect(() => {
    if (!quiz) return undefined;

    const timers = [];
    const intervals = [];
    const later = (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };
    const playDrawTick = ({ volume = 0.16, playbackRate = 1 } = {}) => {
      if (!canPlayInterfaceSounds()) return;
      stopBufferedSound(tickSoundRef.current);
      tickSoundRef.current = playBufferedSound("/sounds/results/combo.mp3", {
        volume: Math.min(1, volume * getSoundScale()),
        playbackRate,
      });
    };

    setStage("category-spin");
    setActiveCategory(categoryOptions[Math.floor(Math.random() * categoryOptions.length)]);
    setActiveDifficulty(difficultyOrder[0]);

    if (readUserPreferences().reduceMotion) {
      setActiveCategory(quiz.iconId);
      playDrawTick({ volume: 0.23, playbackRate: 1.04 });
      later(() => {
        setStage("difficulty-spin");
        setActiveDifficulty(quiz.difficulty);
        playDrawTick({ volume: 0.28, playbackRate: 1.18 });
      }, 260);
      later(() => {
        setStage("complete");
        playDrawTick({ volume: 0.34, playbackRate: 1.3 });
      }, 520);
      later(() => onComplete(quiz), 1050);
      return () => {
        timers.forEach(window.clearTimeout);
        stopBufferedSound(tickSoundRef.current);
      };
    }

    let categoryIndex = Math.floor(Math.random() * categoryOptions.length);
    const categoryInterval = window.setInterval(() => {
      categoryIndex = (categoryIndex + 1) % categoryOptions.length;
      setActiveCategory(categoryOptions[categoryIndex]);
      playDrawTick({ volume: 0.13, playbackRate: 0.92 + ((categoryIndex % 5) * 0.035) });
    }, 95);
    intervals.push(categoryInterval);

    later(() => {
      window.clearInterval(categoryInterval);
      setActiveCategory(quiz.iconId);
      setStage("category-lock");
      playDrawTick({ volume: 0.28, playbackRate: 1.12 });
    }, 1550);

    later(() => {
      setStage("difficulty-spin");
      let difficultyIndex = Math.floor(Math.random() * difficultyOrder.length);
      setActiveDifficulty(difficultyOrder[difficultyIndex]);
      const difficultyInterval = window.setInterval(() => {
        difficultyIndex = (difficultyIndex + 1) % difficultyOrder.length;
        setActiveDifficulty(difficultyOrder[difficultyIndex]);
        playDrawTick({ volume: 0.16, playbackRate: 1 + (difficultyIndex * 0.055) });
      }, 125);
      intervals.push(difficultyInterval);

      later(() => {
        window.clearInterval(difficultyInterval);
        setActiveDifficulty(quiz.difficulty);
        setStage("difficulty-lock");
        playDrawTick({ volume: 0.31, playbackRate: 1.24 });
      }, 1350);
    }, 2150);

    later(() => {
      setStage("complete");
      playDrawTick({ volume: 0.38, playbackRate: 1.34 });
    }, 4100);
    later(() => onComplete(quiz), 5000);

    return () => {
      timers.forEach(window.clearTimeout);
      intervals.forEach(window.clearInterval);
      stopBufferedSound(tickSoundRef.current);
    };
  }, [categoryOptions, onComplete, quiz]);

  useEffect(() => {
    if (!quiz) return undefined;
    const closeWithEscape = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onCancel, quiz]);

  if (!quiz) return null;

  return (
    <div className="modal-backdrop quick-draw-backdrop" role="presentation">
      <section className={`quick-draw-modal is-${stage}`} role="dialog" aria-modal="true" aria-labelledby="quick-draw-title">
        <button className="modal-close quick-draw-modal__close" type="button" onClick={onCancel} aria-label="Cancelar sorteo">×</button>

        <div className="quick-draw-modal__heading">
          <span><Dices size={18} /> Sorteo sorpresa</span>
          <h2 id="quick-draw-title">
            {stage === "complete" ? "¡Tenemos un quiz!" : isDifficultyStage ? "Eligiendo dificultad" : "Eligiendo materia"}
          </h2>
        </div>

        <div className="quick-draw-modal__steps" aria-hidden="true">
          <i className={!isDifficultyStage ? "is-active" : "is-done"} />
          <i className={isDifficultyStage ? "is-active" : ""} />
        </div>

        <div className="quick-draw-modal__roulette" aria-live="polite">
          {!isDifficultyStage ? (
            <div className="quick-draw-category" key={activeCategory}>
              <span><QuizIcon iconId={activeCategory} size={50} /></span>
              <strong>{categoryLabel}</strong>
            </div>
          ) : (
            <div className="quick-draw-difficulty" key={activeDifficulty}>
              <small>{categoryLabel}</small>
              <strong>{activeDifficulty}</strong>
            </div>
          )}
        </div>

        <div className="quick-draw-modal__rail" aria-hidden="true">
          {!isDifficultyStage ? categoryOptions.map((categoryId) => (
            <span className={categoryId === activeCategory ? "is-active" : ""} key={categoryId}><QuizIcon iconId={categoryId} size={17} /></span>
          )) : difficultyOrder.map((difficulty) => (
            <span className={difficulty === activeDifficulty ? "is-active" : ""} key={difficulty}>{difficulty}</span>
          ))}
        </div>

        <div className="quick-draw-modal__result">
          {stage === "complete" ? (
            <><Sparkles size={18} /><span><small>{categoryLabel} · {quiz.difficulty}</small><strong>{quiz.title}</strong></span></>
          ) : (
            <span>Buscando una combinación para ti...</span>
          )}
        </div>
      </section>
    </div>
  );
}

export default QuickQuizDrawModal;

