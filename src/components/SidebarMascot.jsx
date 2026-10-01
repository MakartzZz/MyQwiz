import { useEffect, useRef, useState } from "react";

const MAX_EYE_OFFSET_X = 4;
const MAX_EYE_OFFSET_Y = 3.5;
const FULL_GAZE_DISTANCE = 42;

export default function SidebarMascot({ onActivate, rewardSignal = 0 }) {
  const eyeGroupRef = useRef(null);
  const eyeAnchorRef = useRef(null);
  const movingEyesRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);
  const lastTouchRef = useRef(0);
  const rewardTimerRef = useRef(null);
  const [isRewarding, setIsRewarding] = useState(false);

  useEffect(() => {
    if (!rewardSignal) return undefined;
    setIsRewarding(false);
    const frame = window.requestAnimationFrame(() => setIsRewarding(true));
    window.clearTimeout(rewardTimerRef.current);
    rewardTimerRef.current = window.setTimeout(() => setIsRewarding(false), 900);
    return () => window.cancelAnimationFrame(frame);
  }, [rewardSignal]);

  useEffect(() => () => window.clearTimeout(rewardTimerRef.current), []);

  useEffect(() => {
    const updatePupil = () => {
      animationFrameRef.current = null;

      const eyeAnchor = eyeAnchorRef.current;
      const movingEyes = movingEyesRef.current;
      if (!eyeAnchor || !movingEyes) return;

      const eyeBounds = eyeAnchor.getBoundingClientRect();
      const eyeX = eyeBounds.left + eyeBounds.width / 2;
      const eyeY = eyeBounds.top + eyeBounds.height / 2;
      const deltaX = pointerRef.current.x - eyeX;
      const deltaY = pointerRef.current.y - eyeY;
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      const gazeStrength = Math.min(1, distance / FULL_GAZE_DISTANCE);

      movingEyes.style.setProperty("--eye-x", `${Math.cos(angle) * MAX_EYE_OFFSET_X * gazeStrength}px`);
      movingEyes.style.setProperty("--eye-y", `${Math.sin(angle) * MAX_EYE_OFFSET_Y * gazeStrength}px`);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === "touch") return;

      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!animationFrameRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(updatePupil);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return undefined;

    let blinkTimeout;
    let reopenTimeout;

    const scheduleBlink = () => {
      blinkTimeout = window.setTimeout(() => {
        const eyeGroup = eyeGroupRef.current;
        if (!eyeGroup) return;

        eyeGroup.classList.add("is-blinking");
        reopenTimeout = window.setTimeout(() => {
          eyeGroup.classList.remove("is-blinking");
          scheduleBlink();
        }, 170);
      }, 2600 + Math.random() * 3600);
    };

    scheduleBlink();

    return () => {
      window.clearTimeout(blinkTimeout);
      window.clearTimeout(reopenTimeout);
    };
  }, []);

  const handleTouch = (event) => {
    if (event.pointerType !== "touch") return;
    const now = Date.now();
    if (now - lastTouchRef.current < 360) {
      lastTouchRef.current = 0;
      onActivate?.();
    } else {
      lastTouchRef.current = now;
    }
  };

  return (
    <button
      className={`sidebar-mascot ${isRewarding ? "is-rewarding" : ""}`}
      type="button"
      aria-label="Mascota de MyQwiz"
      onDoubleClick={onActivate}
      onPointerUp={handleTouch}
    >
      <svg viewBox="0 0 96 84" role="presentation">
        <path
          className="sidebar-mascot__body"
          d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z"
        />

        <g ref={eyeGroupRef} className="sidebar-mascot__eye">
          <rect ref={eyeAnchorRef} x="29" y="45" width="38" height="26" fill="transparent" />
          <g ref={movingEyesRef} className="sidebar-mascot__moving-eyes">
            <rect x="30" y="46" width="11" height="24" rx="5.5" />
            <rect x="55" y="46" width="11" height="24" rx="5.5" />
          </g>
        </g>
      </svg>
    </button>
  );
}
