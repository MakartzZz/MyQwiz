import { Bone, Clapperboard, Dna, Gamepad2, Landmark, Magnet, Music2, Palette } from "lucide-react";
import { QUIZ_ICONS } from "../domain/quizConstants.js";

export const quizIconOptions = [
  { id: QUIZ_ICONS.GENERAL, label: "General" },
  { id: QUIZ_ICONS.MATHEMATICS, label: "Matemáticas" },
  { id: QUIZ_ICONS.SCIENCE, label: "Ciencias" },
  { id: QUIZ_ICONS.CHEMISTRY, label: "Química" },
  { id: QUIZ_ICONS.HISTORY, label: "Historia" },
  { id: QUIZ_ICONS.LANGUAGES, label: "Idiomas" },
  { id: QUIZ_ICONS.TECHNOLOGY, label: "Tecnología" },
  { id: QUIZ_ICONS.MEDICINE, label: "Medicina" },
  { id: QUIZ_ICONS.ANATOMY, label: "Anatomía" },
  { id: QUIZ_ICONS.BIOLOGY, label: "Biología" },
  { id: QUIZ_ICONS.PHYSICS, label: "Física elemental" },
  { id: QUIZ_ICONS.GEOGRAPHY, label: "Geografía" },
  { id: QUIZ_ICONS.VIDEOGAMES, label: "Videojuegos" },
  { id: QUIZ_ICONS.MUSIC, label: "Música" },
  { id: QUIZ_ICONS.ART, label: "Arte" },
  { id: QUIZ_ICONS.CINEMA, label: "Cine" },
];

const libraryIcons = {
  [QUIZ_ICONS.HISTORY]: Landmark,
  [QUIZ_ICONS.ANATOMY]: Bone,
  [QUIZ_ICONS.VIDEOGAMES]: Gamepad2,
  [QUIZ_ICONS.MUSIC]: Music2,
  [QUIZ_ICONS.ART]: Palette,
  [QUIZ_ICONS.BIOLOGY]: Dna,
  [QUIZ_ICONS.PHYSICS]: Magnet,
  [QUIZ_ICONS.CINEMA]: Clapperboard,
};

const iconPaths = {
  [QUIZ_ICONS.GENERAL]: <><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 1 1 3.5 2.1c-.9.5-1.2 1-1.2 2" /><path d="M12 17h.01" /></>,
  [QUIZ_ICONS.MATHEMATICS]: <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h2m4 0h2M8 16h2m4 0h2" /></>,
  [QUIZ_ICONS.SCIENCE]: <><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="9" ry="3.5" /><ellipse cx="12" cy="12" rx="3.5" ry="9" transform="rotate(45 12 12)" /></>,
  [QUIZ_ICONS.CHEMISTRY]: <><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 15h9" /></>,
  [QUIZ_ICONS.LANGUAGES]: <><path d="M4 4h16v12H9l-5 4Z" /><path d="M8 9h8M8 12h5" /></>,
  [QUIZ_ICONS.TECHNOLOGY]: <><rect x="7" y="7" width="10" height="10" rx="1" /><path d="M9 1v3m6-3v3M9 20v3m6-3v3M1 9h3m-3 6h3m16-6h3m-3 6h3M10 10h4v4h-4Z" /></>,
  [QUIZ_ICONS.MEDICINE]: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M9 6V4h6v2M12 9v8M8 13h8" /></>,
  [QUIZ_ICONS.GEOGRAPHY]: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
};

export function QuizIcon({ iconId = QUIZ_ICONS.GENERAL, size = 24 }) {
  const LibraryIcon = libraryIcons[iconId];

  if (LibraryIcon) {
    return <LibraryIcon size={size} strokeWidth={1.8} aria-hidden="true" />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[iconId] ?? iconPaths[QUIZ_ICONS.GENERAL]}
    </svg>
  );
}

export function QuizIconPicker({ value, onChange, compact = false }) {
  return (
    <fieldset className={`quiz-icon-picker ${compact ? "is-compact" : ""}`}>
      <legend>Icono del quiz</legend>
      <div>
        {quizIconOptions.map((option) => (
          <button
            className={value === option.id ? "is-selected" : ""}
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            title={option.label}
          >
            <QuizIcon iconId={option.id} size={compact ? 20 : 23} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
