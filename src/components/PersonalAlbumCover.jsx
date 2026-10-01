import { useEffect, useRef } from "react";

const MAX_EYE_OFFSET_X = 4;
const MAX_EYE_OFFSET_Y = 3.5;
const FULL_GAZE_DISTANCE = 70;

const normalizeHexColor = (color) => (
  /^#[0-9a-f]{6}$/i.test(color ?? "") ? color : "#49623b"
);

const readableForeground = (color) => {
  const normalized = normalizeHexColor(color).slice(1);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return ((red * 299 + green * 587 + blue * 114) / 1000) > 150
    ? "#17211b"
    : "#fff8ec";
};

export function PersonalAlbumCover({ color, className = "", label, decorative = false }) {
  const coverRef = useRef(null);
  const movingEyesRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);
  const background = normalizeHexColor(color);
  const foreground = readableForeground(background);

  useEffect(() => {
    const updateEyes = () => {
      animationFrameRef.current = null;
      if (!coverRef.current || !movingEyesRef.current) return;

      const bounds = coverRef.current.getBoundingClientRect();
      const deltaX = pointerRef.current.x - (bounds.left + bounds.width / 2);
      const deltaY = pointerRef.current.y - (bounds.top + bounds.height / 2);
      const distance = Math.hypot(deltaX, deltaY);
      const angle = Math.atan2(deltaY, deltaX);
      const strength = Math.min(1, distance / FULL_GAZE_DISTANCE);
      const eyeX = Math.cos(angle) * MAX_EYE_OFFSET_X * strength;
      const eyeY = Math.sin(angle) * MAX_EYE_OFFSET_Y * strength;

      movingEyesRef.current.setAttribute("transform", `translate(${eyeX} ${eyeY})`);
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === "touch") return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (!animationFrameRef.current) {
        animationFrameRef.current = window.requestAnimationFrame(updateEyes);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <span
      ref={coverRef}
      className={`personal-album-cover ${className}`.trim()}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? "true" : undefined}
      aria-label={decorative ? undefined : label}
    >
      <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <rect width="512" height="512" fill={background} />
        <circle cx="418" cy="82" r="126" fill={foreground} opacity=".09" />
        <circle cx="76" cy="448" r="158" fill={foreground} opacity=".07" />
        <path fill="none" stroke={foreground} strokeWidth="18" strokeLinecap="round" opacity=".16" d="M54 116h92m220 278h92M86 82l52 52m236 236 52 52" />
        <g transform="translate(64 80) scale(4)">
          <path fill={foreground} d="M48 82C19 82 8 62 9 37 10 16 18 3 28 3 38 3 42 18 44 33h8C54 18 58 3 68 3c10 0 18 13 19 34 1 25-10 45-39 45Z" />
          <g ref={movingEyesRef}>
            <rect x="30" y="46" width="11" height="24" rx="5.5" fill={background} />
            <rect x="55" y="46" width="11" height="24" rx="5.5" fill={background} />
          </g>
        </g>
      </svg>
    </span>
  );
}

export default function AlbumCover({ album, alt = "", className = "" }) {
  if (!album?.isPersonal) {
    return <img className={className || undefined} src={album?.cover} alt={alt} />;
  }

  return (
    <PersonalAlbumCover
      className={className}
      color={album.color}
      label={alt || `Portada de ${album.title}`}
      decorative={!alt}
    />
  );
}
