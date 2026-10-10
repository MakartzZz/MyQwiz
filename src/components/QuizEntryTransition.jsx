import { useEffect, useRef } from "react";
import { playBufferedSound, stopBufferedSound } from "../services/soundBuffer.js";
import { canPlayCatRewardSounds, getSoundScale, readUserPreferences } from "../services/userPreferences.js";

export default function QuizEntryTransition({ onCovered, onComplete }) {
  const onCoveredRef = useRef(onCovered);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCoveredRef.current = onCovered;
    onCompleteRef.current = onComplete;
  }, [onComplete, onCovered]);

  useEffect(() => {
    const reduceMotion = readUserPreferences().reduceMotion;
    let meowHandle = null;
    const coveredTimer = window.setTimeout(() => onCoveredRef.current?.(), reduceMotion ? 90 : 760);
    const meowTimer = window.setTimeout(() => {
      if (!canPlayCatRewardSounds()) return;
      meowHandle = playBufferedSound("/sounds/cat-reward.mp3", {
        volume: Math.min(1, 0.58 * getSoundScale()),
      });
    }, reduceMotion ? 120 : 900);
    const completeTimer = window.setTimeout(() => onCompleteRef.current?.(), reduceMotion ? 320 : 2150);

    return () => {
      window.clearTimeout(coveredTimer);
      window.clearTimeout(meowTimer);
      window.clearTimeout(completeTimer);
      stopBufferedSound(meowHandle);
    };
  }, []);

  return (
    <div className="quiz-entry-transition" role="status" aria-label="Preparando el quiz">
      <div className="quiz-entry-transition__wave" aria-hidden="true" />
      <div className="quiz-entry-transition__content" aria-hidden="true">
        <div className="quiz-entry-transition__mascot">
          <svg viewBox="0 0 96 84" role="presentation">
            <path d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z" />
            <g className="quiz-entry-transition__eyes">
              <rect x="30" y="46" width="11" height="24" rx="5.5" />
              <rect x="55" y="46" width="11" height="24" rx="5.5" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
