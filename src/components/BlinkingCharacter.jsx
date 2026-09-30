import { useEffect, useState } from "react";
import { readUserPreferences } from "../services/userPreferences.js";

const FIRST_BLINK_MIN_DELAY = 1800;
const FIRST_BLINK_VARIANCE = 1600;
const BLINK_MIN_GAP = 3200;
const BLINK_GAP_VARIANCE = 2800;
const BLINK_DURATION = 190;

const canAnimate = () => (
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  && !readUserPreferences().reduceMotion
);

function BlinkingCharacter({ src, blinkSrc, theme, className = "" }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(canAnimate);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const refreshAnimationPreference = () => setAnimationEnabled(canAnimate());

    mediaQuery.addEventListener("change", refreshAnimationPreference);
    window.addEventListener("myqwiz:preferences-change", refreshAnimationPreference);

    return () => {
      mediaQuery.removeEventListener("change", refreshAnimationPreference);
      window.removeEventListener("myqwiz:preferences-change", refreshAnimationPreference);
    };
  }, []);

  useEffect(() => {
    if (!animationEnabled || !blinkSrc) {
      setIsBlinking(false);
      return undefined;
    }

    let blinkTimer;
    let reopenTimer;

    const scheduleBlink = (delay) => {
      blinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink(BLINK_MIN_GAP + Math.random() * BLINK_GAP_VARIANCE);
        }, BLINK_DURATION);
      }, delay);
    };

    scheduleBlink(FIRST_BLINK_MIN_DELAY + Math.random() * FIRST_BLINK_VARIANCE);

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, [animationEnabled, blinkSrc]);

  return (
    <span
      className={`blinking-character ${isBlinking ? "is-blinking" : ""} ${className}`.trim()}
      data-character-theme={theme}
      aria-hidden="true"
    >
      <span className="blinking-character__motion">
        <img className="blinking-character__frame blinking-character__frame--base" src={src} alt="" draggable="false" />
        {blinkSrc && (
          <img className="blinking-character__frame blinking-character__frame--blink" src={blinkSrc} alt="" draggable="false" />
        )}
      </span>
    </span>
  );
}

export default BlinkingCharacter;
