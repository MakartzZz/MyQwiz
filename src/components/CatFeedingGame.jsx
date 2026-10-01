import { Heart, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FOOD_SHAPES } from "../services/catRewards.js";
import { playBufferedSound, stopBufferedSound } from "../services/soundBuffer.js";
import { canPlayInterfaceSounds, getSoundScale } from "../services/userPreferences.js";

const CAT_SOUND_DURATION = 2064;

export default function CatFeedingGame({ rewards, onClose, onFeed }) {
  const [dragging, setDragging] = useState(null);
  const [isEating, setIsEating] = useState(false);
  const [isPetting, setIsPetting] = useState(false);
  const [isHappy, setIsHappy] = useState(false);
  const catRef = useRef(null);
  const movingEyesRef = useRef(null);
  const movingMouthRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const eyeAnimationFrameRef = useRef(null);
  const eatTimerRef = useRef(null);
  const happyTimerRef = useRef(null);
  const eatSoundRef = useRef(null);
  const happySoundRef = useRef(null);
  const purrSoundRef = useRef(null);
  const petPointerRef = useRef(null);
  const petDistanceRef = useRef(0);
  const wasPettedRef = useRef(false);

  useEffect(() => () => {
    window.clearTimeout(eatTimerRef.current);
    window.clearTimeout(happyTimerRef.current);
    stopBufferedSound(eatSoundRef.current);
    stopBufferedSound(happySoundRef.current);
    stopBufferedSound(purrSoundRef.current);
  }, []);

  useEffect(() => {
    const updateEyes = () => {
      eyeAnimationFrameRef.current = null;
      const cat = catRef.current;
      const eyes = movingEyesRef.current;
      const mouth = movingMouthRef.current;
      if (!cat || !eyes || !mouth) return;

      const bounds = cat.getBoundingClientRect();
      const deltaX = pointerRef.current.x - (bounds.left + bounds.width / 2);
      const deltaY = pointerRef.current.y - (bounds.top + bounds.height * .58);
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      const strength = Math.min(1, distance / 80);
      const eyeX = Math.cos(angle) * 7 * strength;
      const eyeY = Math.sin(angle) * 6 * strength;
      eyes.setAttribute("transform", `translate(${eyeX} ${eyeY})`);
      mouth.setAttribute("transform", `translate(${eyeX * .32} 0)`);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === "touch") return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!eyeAnimationFrameRef.current) {
        eyeAnimationFrameRef.current = window.requestAnimationFrame(updateEyes);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (eyeAnimationFrameRef.current) window.cancelAnimationFrame(eyeAnimationFrameRef.current);
    };
  }, []);

  const playHappySound = () => {
    if (!canPlayInterfaceSounds()) return;
    stopBufferedSound(happySoundRef.current);
    happySoundRef.current = playBufferedSound("/sounds/cat-happy.mp3", {
      volume: 0.58 * getSoundScale(),
    });
  };

  const celebrateFeed = (shape) => {
    if (!rewards.food) return;
    onFeed(shape);
    setIsEating(true);
    window.clearTimeout(eatTimerRef.current);
    stopBufferedSound(eatSoundRef.current);

    let completed = false;
    const finishEating = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(eatTimerRef.current);
      setIsEating(false);
      setIsHappy(true);
      playHappySound();
      window.clearTimeout(happyTimerRef.current);
      happyTimerRef.current = window.setTimeout(() => setIsHappy(false), CAT_SOUND_DURATION);
    };

    eatTimerRef.current = window.setTimeout(finishEating, CAT_SOUND_DURATION);
    if (canPlayInterfaceSounds()) {
      eatSoundRef.current = playBufferedSound("/sounds/cat-eat.mp3", {
        volume: 0.62 * getSoundScale(),
        onEnded: finishEating,
      });
    }
  };

  const startDrag = (event, shape) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging({
      shape,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
    });
  };

  const moveDrag = (event) => {
    setDragging((current) => {
      if (!current || current.pointerId !== event.pointerId) return current;
      const x = event.clientX - current.startX;
      const y = event.clientY - current.startY;
      return { ...current, x, y };
    });
  };

  const finishDrag = (event) => {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    const catBounds = catRef.current?.getBoundingClientRect();
    const droppedOnCat = catBounds
      && event.clientX >= catBounds.left
      && event.clientX <= catBounds.right
      && event.clientY >= catBounds.top
      && event.clientY <= catBounds.bottom;

    if (droppedOnCat) celebrateFeed(dragging.shape);
    setDragging(null);
  };

  const startPet = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    petPointerRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    petDistanceRef.current = 0;
    wasPettedRef.current = false;
  };

  const movePet = (event) => {
    const current = petPointerRef.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const movement = Math.hypot(event.clientX - current.x, event.clientY - current.y);
    petDistanceRef.current += movement;
    current.x = event.clientX;
    current.y = event.clientY;
    if (petDistanceRef.current > 12) {
      wasPettedRef.current = true;
      setIsPetting(true);
      if (!purrSoundRef.current && canPlayInterfaceSounds()) {
        purrSoundRef.current = playBufferedSound("/sounds/cat-purr.mp3", {
          volume: 0.5 * getSoundScale(),
          loop: true,
        });
      }
    }
  };

  const finishPet = (event) => {
    if (petPointerRef.current?.pointerId !== event.pointerId) return;
    petPointerRef.current = null;
    setIsPetting(false);
    stopBufferedSound(purrSoundRef.current);
    purrSoundRef.current = null;
    if (!wasPettedRef.current) return;
    setIsHappy(true);
    playHappySound();
    window.clearTimeout(happyTimerRef.current);
    happyTimerRef.current = window.setTimeout(() => setIsHappy(false), CAT_SOUND_DURATION);
  };

  const foodStacks = rewards.foodStacks ?? FOOD_SHAPES.reduce((stacks, shape, index) => ({
    ...stacks,
    [shape]: Math.floor(rewards.food / FOOD_SHAPES.length)
      + (index < rewards.food % FOOD_SHAPES.length ? 1 : 0),
  }), {});

  return (
    <div className="modal-backdrop cat-game-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="cat-game" role="dialog" aria-modal="true" aria-labelledby="cat-game-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="cat-game__close" type="button" onClick={onClose} aria-label="Cerrar minijuego"><X size={20} /></button>

        <header className="cat-game__heading">
          <span className="eyebrow">Secreto desbloqueado</span>
          <h2 id="cat-game-title">Alimenta a Qwiz</h2>
          <p>Arrastra una forma hasta el gato o mantén pulsado sobre él y mueve el puntero para acariciarlo.</p>
        </header>

        <div className="cat-game__playfield">
        <div className="cat-game__stage">
          <div
            ref={catRef}
            className={`cat-game__cat ${dragging ? "is-waiting" : ""} ${isEating ? "is-eating" : ""} ${isPetting ? "is-being-petted" : ""} ${isHappy ? "is-happy" : ""}`}
            aria-label="Qwiz esperando su comida. Mantén pulsado y mueve para acariciarlo."
            onPointerDown={startPet}
            onPointerMove={movePet}
            onPointerUp={finishPet}
            onPointerCancel={finishPet}
          >
            <Sparkles className="cat-game__spark cat-game__spark--one" size={24} />
            <Heart className="cat-game__spark cat-game__spark--two" size={22} />
            <svg viewBox="0 0 220 200" role="img" aria-hidden="true">
              <path className="cat-game__body" d="M110 190C43 190 19 145 22 86 24 36 43 8 66 8c24 0 33 34 38 69h12c5-35 14-69 38-69 23 0 42 28 44 78 3 59-21 104-88 104Z" />
              <g ref={movingEyesRef} className="cat-game__eyes">
                <rect x="68" y="102" width="22" height="48" rx="11" />
                <rect x="130" y="102" width="22" height="48" rx="11" />
              </g>
              <g ref={movingMouthRef} className="cat-game__moving-mouth">
                <circle className="cat-game__mouth" cx="110" cy="166" r="14" />
              </g>
            </svg>
          </div>

          <div className="cat-game__status">
            <strong>{rewards.food}</strong>
            <span>{rewards.food === 1 ? "comida disponible" : "comidas disponibles"}</span>
            <div aria-label={`${rewards.correctProgress} de 5 respuestas para la siguiente comida`}>
              {Array.from({ length: 5 }, (_, index) => <i className={index < rewards.correctProgress ? "is-filled" : ""} key={index} />)}
            </div>
            <small>{rewards.correctProgress}/5 para conseguir otra</small>
          </div>
        </div>

        <div className={`cat-game__pantry ${rewards.food ? "" : "is-empty"}`}>
          {rewards.food ? (
            <>
              {FOOD_SHAPES.filter((shape) => foodStacks[shape] > 0).map((shape) => (
                <button
                  className={`cat-food ${dragging?.shape === shape ? "is-dragging" : ""}`}
                  data-shape={shape}
                  type="button"
                  style={dragging?.shape === shape ? { transform: `translate3d(${dragging.x}px, ${dragging.y}px, 0) scale(1.12)` } : undefined}
                  aria-label={`Dar esta comida a Qwiz. ${foodStacks[shape]} disponibles.`}
                  onPointerDown={(event) => startDrag(event, shape)}
                  onPointerMove={moveDrag}
                  onPointerUp={finishDrag}
                  onPointerCancel={() => setDragging(null)}
                  key={shape}
                >
                  <span />
                  <b>{foodStacks[shape]}</b>
                </button>
              ))}
            </>
          ) : (
            <div className="cat-game__empty">
              <span>La despensa está vacía.</span>
              <strong>Juega quizzes para conseguir comida.</strong>
            </div>
          )}
        </div>
        </div>

        <footer className="cat-game__footer">
          <span>Qwiz ha comido {rewards.totalFed} {rewards.totalFed === 1 ? "vez" : "veces"}.</span>
          <small>Arrastra una forma hasta Qwiz para alimentarlo.</small>
        </footer>
      </section>
    </div>
  );
}
